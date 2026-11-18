# Segurança

Status da auditoria: Deploys 1–3 + hotfix concluídos (v4.51.0 → v4.58.1). Pendências em `SPEC.md` §20.

## Fluxo de sessão (v4.58.x)
1. `POST /login` (público; RateLimiter 5/min por IP, **fail-closed** → 503 sem cache gravável).
2. `AuthSession::emitirToken($user, $trocaSenha)` → JWT HS256 `{user_id, email, perfil, id_empresa, jti, exp:+4h[, pwd_change]}`.
3. `AuthSession::definirCookieSessao()` → cookie `bemvindo_session` (Frimelo: `frimelo_session`) HttpOnly, Secure (https), SameSite=Strict, path da API, cookie de sessão.
4. `requireAuth()` (`middleware/auth.php`), nesta ordem: JWT válido (header válido > cookie; `JWT::getTokenSource()`) → `jti` em `jwt_blacklist`? 401 `SESSAO_ENCERRADA` → via cookie + POST/PUT/PATCH/DELETE sem `X-Requested-With: XMLHttpRequest`? 403 `REQUISICAO_BLOQUEADA` → `pwd_change` fora de `change_password`/`logout`? 403 `TROCA_SENHA_OBRIGATORIA` → empresa (X-Company-Context p/ ADMIN/SUPERADMIN) → sem empresa 401.
5. `POST /logout` → `revogarToken` (jti na blacklist, limpa vencidos) + `apagarCookieSessao`.
6. **Transição v4.58.0 (pendente remover):** header `Authorization` legado aceito e login ainda devolve `token` no corpo.

## Senhas (v4.57.0)
- Troca obrigatória (`usuarios.must_change_password=1` ou login com `123456`): usuário novo, senha definida por **outra** pessoa (editar a própria não força), admin criado com empresa nova (`frimelo123`).
- Regra (`AuthSession::validarNovaSenha`): ≥ 8, letras e números, ≠ atual, ≠ `123456`.
- Usuário novo sem senha → `gerarSenhaTemporaria()` exibida 1x (`SenhaTemporariaModal`). Nunca reintroduzir senha padrão fixa.
- Tela `/trocar-senha` (`ChangePasswordView`), obrigatória ou voluntária (botão "Alterar Senha").

## Superfície HTTP
- `backend/v1/.htaccess`: só `index.php` é acessível; demais `.php` → 403 (v4.57.1 — antes `create_saas_admin.php` resetava a senha do SUPERADMIN sem login). Rota nova = rota do `index.php`. Nunca `window.open` em `.php`.
- `public/.htaccess` (raiz do site): bloqueia por nome ferramentas antigas; não use regra genérica `\.php$` na raiz (risco de herdar para a API).
- IP do cliente (`RateLimiter::getClientIP`): `CF-Connecting-IP` só se `REMOTE_ADDR` estiver nas faixas oficiais do Cloudflare; senão `REMOTE_ADDR`. Nunca confiar em `X-Forwarded-For`. (Cloudflare do Valter é só DNS/nuvem cinza.)
- Headers: X-Frame-Options DENY, HSTS, Permissions-Policy, CSP **Report-Only** (enforced pendente).
- `.env` nunca no git nem na imagem Docker (`.dockerignore`); na VPS só em `/opt/bemvindo/.env` (600).

## Ao mexer em auth
- Emita token só via `AuthSession::emitirToken` (garante `jti`).
- Rota que precise funcionar durante troca obrigatória → incluir na lista de `auth.php`.
- `fetch` direto no front → `credentials:'include'` + `authHeaders()`.
- Verificação externa segura: `scripts/verificar_producao.sh`. **Nunca** acesse scripts de manutenção em produção para "testar" (executam ações).

## Bem Vindo
- SUPERADMIN só por linha de comando dentro do container: `docker compose exec app php /opt/bemvindo-scripts/criar_superadmin.php "Nome" email` (cria ou redefine; senha temporária aparece só no terminal de quem roda).
- Empresa nova (`POST companies`) cria admin com senha temporária aleatória devolvida uma vez (modal `SenhaTemporariaModal`).
- Dados de pagamento (banco/Pix) só para ADMIN/RH/SUPERADMIN (GET e gravação). `cargos` exige ADMIN/RH e filtra empresa.
- CORS: `https://bemvindo.luzitec.cnt.br` + `APP_ORIGIN`. `.env` só na VPS (600). Apache com `mod_remoteip` atrás do Caddy.
