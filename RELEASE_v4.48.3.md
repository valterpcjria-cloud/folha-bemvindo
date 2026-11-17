# Release v4.48.3 — Security Hardening

**Data:** 29/03/2026
**Tipo:** Patch de Segurança
**Deploy:** `deploy-frimelo-4.48.3.zip`

---

## Resumo

Esta versão aplica um hardening completo de segurança no frontend e backend do sistema, sem impacto em funcionalidades existentes. Nenhuma tela ou fluxo foi alterado.

---

## Correções de Segurança

### Frontend

| Item | Detalhe |
|---|---|
| **Chave OpenAI removida do código** | Movida para variável de ambiente `VITE_OPENAI_API_KEY` — não aparece mais no build |
| **Code Injection eliminado** | `FormulasView`: substituído `new Function()` por `mathjs/evaluate` (execução sandboxada) |
| **Timeout de sessão** | Logout automático após **60 minutos de inatividade** (mousemove, keydown, click) |
| **Logs sensíveis removidos** | `console.log` com dados de lançamentos e contexto de empresa removidos de produção |
| **`.gitignore` atualizado** | `.env` e `backend/v1/.env` adicionados à lista de exclusão do repositório |

### Backend

| Item | Detalhe |
|---|---|
| **Contexto de empresa restrito** | Header `X-Company-Context` agora é exclusivo de **SUPERADMIN** (ADMIN não pode mais trocar empresa) |
| **Token sem empresa rejeitado** | Fallback inseguro `id_empresa = 1` removido — token sem empresa válida é recusado com 401 |
| **JWT reduzido** | Duração do token reduzida de **8h para 4h** |
| **CORS endurecido** | Origens `localhost` condicionadas a `APP_ENV=dev` no `.env` — não ativas em produção |
| **Arquivos de diagnóstico protegidos** | `diag_db.php`, `server_status.php` e `probe_paths.php` agora exigem autenticação **SUPERADMIN** |
| **SQL Injection corrigido** | `diag_db.php` e `server_status.php`: variável `$table` substituída por whitelist fixa |
| **Dados de usuários não expostos** | `server_status.php`: lista completa de usuários substituída por contagem |
| **Arquivos ocultos bloqueados** | `.htaccess` agora bloqueia acesso direto a `.env`, `.git` e similares |
| **Rotas públicas enxutas** | `create_saas_admin` e `probe_paths` removidos da lista de rotas sem autenticação |

---

## Dependências Adicionadas

| Pacote | Versão | Motivo |
|---|---|---|
| `mathjs` | ^15.1.1 | Substituição segura do `new Function()` em FormulasView |

---

## Ação Manual Recomendada

> Deletar do servidor os arquivos abaixo (podem existir de versões anteriores):
> - `backend/v1/create_saas_admin.php`
> - `backend/v1/check_user.php`

---

## Arquivos Modificados

**Frontend:**
- `config.ts`
- `contexts/AuthContext.tsx`
- `hooks/usePayrollData.ts`
- `services/mockApi.ts`
- `views/FormulasView.tsx`
- `.gitignore`
- `package.json`

**Backend:**
- `backend/v1/.htaccess`
- `backend/v1/.env.example`
- `backend/v1/config.php`
- `backend/v1/diag_db.php`
- `backend/v1/server_status.php`
- `backend/v1/probe_paths.php`
- `backend/v1/middleware/auth.php`
- `backend/v1/routes/login.php`

---

*Release gerada pelo Claude Code — Antigravity/FRIMELO*
