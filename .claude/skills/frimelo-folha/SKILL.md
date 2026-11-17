---
name: frimelo-folha
description: Conhecimento completo do sistema FOLHA FRIMELO (folha de pagamento SaaS — React/Vite/TypeScript + PHP 8 puro/PDO + MySQL na Hostgator) — arquitetura, regras de cálculo das rubricas (salário 33, HE 100% 49, DSR 59, insalubridade 62, faltas 71, gratificação 88, assiduidade 833, INSS 35, IRRF 1920, FGTS 1900), segurança (cookie HttpOnly, CSRF, jwt_blacklist, troca de senha), banco/migrations, fluxo de versão/zip/deploy/release e lições aprendidas. Use SEMPRE que trabalhar neste repositório: qualquer bug, feature, cálculo de folha, lançamento, rubrica, competência, contracheque, PDF, relatório, exportação, usuário/senha/login, migration SQL, deploy na Hostgator, zip, versão, push/release, ou quando o usuário (Valter) mencionar a folha, os funcionários, a Frimelo ou a Edvam Melo — mesmo que não peça a skill explicitamente.
---

# FOLHA FRIMELO — Skill do Sistema

Sistema de lançamentos e cálculo de folha de pagamento multi-empresa (Frigorífico Frimelo, Edvam Melo), operado por **Valter** (dono/operador, PT-BR, não-dev de rotina).
Produção única em `https://frimelo.meusistemanaweb.com.br` (Hostgator). **Não existe staging** — tudo que sobe afeta a folha real.

Documentação viva do repositório (consulte para detalhe fino): `SPEC.md` (técnica, pendências em §20), `PRD.md`, `CHANGELOG.md`, `CLAUDE.md`. Esta skill resume o essencial e diz onde olhar.

## Regras de ouro (e por quê)

1. **Pergunte a versão antes de bumpar.** O número tem significado para o Valter (ele já corrigiu sugestões). Exceção: hotfix urgente com ele ausente → use o patch óbvio e avise que decidiu sem ele.
2. **Ao fechar uma versão, entregue o zip no mesmo turno** (`python3 create_zip.py --version X.Y.Z`) e diga se precisa de SQL. Ele já cobrou isso: implementar sem zip é entrega incompleta. Valide o zip com `scripts/validar_zip.py`.
3. **Nunca proponha testes que alterem dados reais** (atestado "de teste", desligar funcionário, faltas fictícias). Valide com casos reais, conferência de valores por prints, ou verificação externa só-leitura (`scripts/verificar_producao.sh`).
4. **Competência FECHADA é imutável** (snapshot do que foi pago). Backend recusa escrita; frontend só calcula as rubricas virtuais (59, 1900) em fechada.
5. **Cálculo existe em dois lados.** Frontend (`hooks/usePayrollData.ts`, tempo real) e backend (`backend/v1/services/LancamentoService.php`, ao salvar) — mudar fórmula exige mudar ambos. O DSR/feriados também tem caminho duplo (backend + fallback local).
6. **Token nunca no navegador.** Sessão viaja em cookie HttpOnly. Todo `fetch` direto: `credentials: 'include'` + `authHeaders()`; prefira métodos de `api` (`services/mockApi.ts`).
7. **Nenhum endpoint como `.php` solto.** `backend/v1/.htaccess` só libera `index.php`; rota nova = `$router->add(...)` no `index.php` + arquivo em `routes/` + `requireRole()`.
8. **Migrations idempotentes, aditivas e rodadas ANTES do zip** (phpMyAdmin, sem `DELIMITER`). Assim o rollback é só subir o zip anterior.
9. **Push e release são executados pelo Valter** (a conta gh ativa não tem acesso; ele cola o token). Você prepara commits, tag e o comando pronto. Nunca grave token em arquivo/memória/chat.
10. **Não há PHP local.** Revise PHP linha a linha; para lógica crítica, reproduza a conta em Python. Diga claramente o que não foi executado.

## Roteador de tarefas

| Se a tarefa envolve… | Leia | Arquivos-chave |
|---|---|---|
| Fórmula, rubrica, cascata, DSR, INSS/IRRF, competência aberta/fechada, nova rubrica do cadastro | `references/calculo-folha.md` | `hooks/usePayrollData.ts`, `constants/payroll.ts`, `services/LancamentoService.php`, `lib/PayrollConstants.php`, `utils/taxCalculations.ts` |
| Onde fica cada coisa, rotas, API, componentes, multi-empresa | `references/arquitetura.md` | `routes/AppRoutes.tsx`, `services/mockApi.ts`, `backend/v1/index.php` |
| Login, senha, sessão, cookie, permissões, `.htaccess`, rate limit | `references/seguranca.md` | `middleware/auth.php`, `lib/AuthSession.php`, `lib/JWT.php`, `middleware/security.php` |
| Tabela nova, coluna, migration, persistência de lançamentos | `references/banco-migrations.md` + `assets/migration_template.sql` | `backend/migrations/`, `routes/lancamentos.php` |
| Versão, build, zip, deploy, push, release, docs | `references/release-deploy.md` | `create_zip.py`, `package.json`, `CHANGELOG.md` |
| Bug estranho / "já aconteceu antes?" | `references/licoes-aprendidas.md` | — |

## Fluxo padrão de qualquer mudança

1. **Entenda e localize.** Leia o código real antes de afirmar (grep nos dois lados quando for cálculo). Confira `git status` e a versão em produção.
2. **Implemente** seguindo o padrão do arquivo vizinho (comentário `// vX.Y.Z: motivo` como o projeto faz). Componentes React < 300 linhas — extraia (como `DsrModal`, `UnsavedChangesDialog`). Interfaces do backend em `types.ts`.
3. **Verifique**: `npx tsc --noEmit -p .` (há 1 erro pré-existente em `FormulasView.tsx` — ignore só ele) e `npx vite build`.
4. **Versão + zip** (após confirmar o número): `npm --no-git-tag-version version X.Y.Z` → `npx vite build` (de novo, para o bundle levar a versão nova) → `python3 create_zip.py --version X.Y.Z` → `scripts/validar_zip.py ... --versao X.Y.Z`.
5. **Entregue ao Valter**: caminho do zip, se há SQL (e o SQL para colar), o que mudou em linguagem simples e o que testar sem mexer em dado real. Rollback = zip anterior.
6. **Após o teste dele**: CHANGELOG + SPEC (+ PRD/CLAUDE se mudou regra) → commit de código e commit de docs separados → `git tag vX.Y.Z` → passe os comandos de push/release (ver `references/release-deploy.md`).
7. **Atualize a memória/estado** e, se surgiu lição nova, `references/licoes-aprendidas.md` e SPEC §16.

## Como falar com o Valter

- Linguagem simples, tabela-resumo + passos numerados. Ele lê prints; peça print do resultado.
- Sempre diga explicitamente se **ele precisa rodar algo** (e o quê) — é a pergunta que ele mais faz.
- Comandos de terminal em **uma linha, sem `cd`** (colar no `sh` quebra com bracketed paste). A senha do `git push` aparece numa caixa **no topo do VSCode**.
- Ele valoriza visual "Premium SaaS": nada de `window.confirm`/`alert` novo quando houver componente do sistema (`ConfirmModal`).
- Regra de negócio confirmada: **ADMIN vê todas as empresas** (intencional). Usuário de empresa cliente = perfil **RH**.

## Scripts e assets

- `scripts/validar_zip.py <zip> [--versao X.Y.Z]` — integridade, duplicados, ausência de `.env`, arquivos obrigatórios, `.htaccess` de bloqueio, versão no bundle.
- `scripts/verificar_producao.sh [url]` — checagem externa só-leitura: `/status` 200, script solto 403, rota protegida 401, versão do bundle publicado.
- `assets/migration_template.sql` — padrão idempotente (CREATE TABLE IF NOT EXISTS + ADD COLUMN condicional via INFORMATION_SCHEMA).
