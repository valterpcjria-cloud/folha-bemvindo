---
name: frimelo-folha
description: Conhecimento completo do sistema FOLHA BEM VINDO (fork da Folha Frimelo para o Supermercado Bem Vindo — React/Vite/TypeScript + PHP 8.3 puro/PDO + MariaDB em Docker na VPS da Luzitec, ao lado do CRM) — arquitetura, setores/hierarquia, matriz por setor, regras de cálculo herdadas (salário 33, HE 100% 49, DSR 59, insalubridade 62, faltas 71, gratificação 88, assiduidade 833, INSS 35, IRRF 1920, FGTS 1900), rubricas do Bem Vindo pendentes da contabilidade (HE 60% 37, adicional noturno 100...), segurança (cookie HttpOnly, CSRF, troca de senha), banco/migrations em docker/banco, deploy Docker na VPS, backup, git seguro (nunca --tags) e lições aprendidas. Use SEMPRE que trabalhar neste repositório: qualquer bug, feature, cálculo de folha, lançamento, rubrica, setor, cargo, competência, contracheque, PDF, relatório, exportação, usuário/senha/login, migration SQL, Docker, VPS, deploy, backup, versão, push, ou quando o usuário (Valter) mencionar a folha, os funcionários, o Bem Vindo, a contabilidade ou a Frimelo — mesmo que não peça a skill explicitamente.
---

# FOLHA BEM VINDO — Skill do Sistema

Folha de pagamento do **Supermercado Bem Vindo** (Luziânia-GO, ~70 colaboradores, 8 setores), operada por **Valter** (dono/operador/implantador, PT-BR, não-dev de rotina). Fork da Folha Frimelo v4.58.1; versão própria desde 1.0.0 (atual 1.5.1).
Produção: Docker na VPS Hostinger da Luzitec (`ssh luzitec-vps`, `/opt/bemvindo`, app em `127.0.0.1:8090`), **a mesma VPS do CRM da Luzitec em produção**. Domínio `bemvindo.luzitec.cnt.br` (aguardando DNS; até lá túnel SSH).
A pasta `/home/valterpcjria/FOLHA FRIMELO` é OUTRO sistema em produção — **nunca alterar** (só leitura).

Documentação viva (consulte para detalhe fino): `CLAUDE.md` (§0, §2.1, §5B), `SPEC.md` (§0 = Bem Vindo; §20 pendências), `PRD.md` (§0 = fases), `CHANGELOG.md`, `docker/vps/LEIA-ME.md`.

## Regras de ouro (e por quê)

1. **Pergunte a versão antes de bumpar.** O número tem significado para o Valter.
2. **Não quebre o CRM.** Caddy, cron, timers e backup do CRM são compartilhados/vizinhos: não mexer; depois de qualquer ação na VPS conferir `https://crm.luzitec.cnt.br/` → 307.
3. **A contabilidade é a oficial.** Regras novas só com resposta do escritório (P1–P30 respondidas em 25/11/2026; pendências na 2ª rodada E1–E15/B1–B12). Não implementar por suposição — diga o que espera de qual pergunta. **Códigos = Questor:** código existente nunca muda; rubrica só do Bem Vindo usa o código da lista deles.
4. **Faça só o que foi pedido em cada etapa** e não fuja da base existente ("acrescentar o que eles pediram").
5. **Teste com dados fictícios no Docker local** antes de subir; na VPS (dados reais) nada de dado "de teste".
6. **Competência FECHADA é imutável** (snapshot). Backend recusa escrita; frontend só calcula 59/1900 em fechada.
7. **Cálculo existe em dois lados**: `hooks/usePayrollData.ts` (tela) e `backend/v1/services/LancamentoService.php` (ao salvar). DSR/feriados também (backend + fallback local).
8. **Token nunca no navegador**; `fetch` só via `api`/`authHeaders()` com `credentials: 'include'`.
9. **Nenhum endpoint como `.php` solto**; rota nova = `$router->add(...)` + `routes/x.php` + `requireRole()`.
10. **Migrations em `docker/banco/NN_bv_*.sql`**, idempotentes e aditivas, rodadas na VPS **antes** de trocar a imagem.
11. **Git:** push só pelo Valter (`git push origin main`, `git push origin vX.Y.Z`). **Nunca `--tags`/`--all`/`frimelo-historico`** (histórico antigo com senhas). Nunca gravar token/senha em arquivo, memória ou chat.
12. **PDO sem emulação**: parâmetro nomeado repetido na mesma query = HY093.

## Roteador de tarefas

| Se a tarefa envolve… | Leia | Arquivos-chave |
|---|---|---|
| Fórmula, rubrica, cascata, DSR, INSS/IRRF, competência, rubrica do cadastro, regras pendentes do Bem Vindo | `references/calculo-folha.md` | `hooks/usePayrollData.ts`, `constants/payroll.ts`, `services/LancamentoService.php`, `lib/PayrollConstants.php` |
| Onde fica cada coisa, rotas, setores/matriz, multi-empresa | `references/arquitetura.md` | `routes/AppRoutes.tsx`, `services/mockApi.ts`, `backend/v1/index.php`, `views/payroll/` |
| Login, senha, sessão, cookie, permissões, `.htaccess`, superadmin | `references/seguranca.md` | `middleware/auth.php`, `lib/AuthSession.php`, `lib/JWT.php`, `docker/scripts/` |
| Tabela nova, coluna, migration, persistência | `references/banco-migrations.md` | `docker/banco/`, `routes/lancamentos.php` |
| Versão, imagem Docker, deploy na VPS, backup, rollback, push | `references/release-deploy.md` | `docker/`, `docker-compose.yml`, `docker/vps/`, `package.json`, `CHANGELOG.md` |
| Bug estranho / "já aconteceu antes?" | `references/licoes-aprendidas.md` | — |

## Fluxo padrão de qualquer mudança

1. **Entenda e localize.** Leia o código real antes de afirmar. Confira `git status` e a versão na VPS.
2. **Implemente** seguindo o padrão vizinho (comentário `// Bem Vindo vX.Y.Z: motivo`). Componentes < 300 linhas — extraia para `views/payroll/`, `components/...`. Interfaces em `types.ts`.
3. **Verifique**: `npx tsc --noEmit -p .` (ignore só o erro de `FormulasView.tsx`), `npx vite build`, teste no Docker local (porta livre, ex. 8091) com API (curl + cookie jar) e tela (playwright-core + `/usr/bin/google-chrome`), migration rodada 2×. Derrube com `down -v`.
4. **Versão + deploy** (após confirmar o número): ver `references/release-deploy.md`.
5. **Entregue ao Valter**: o que mudou em linguagem simples, o que ele testa na tela, se ele precisa rodar algo.
6. **Após o teste dele**: CHANGELOG (+SPEC/PRD/CLAUDE/esta skill se mudou regra) → commit de docs → `git tag vX.Y.Z` → comandos de push para ele → conferir com `git ls-remote`.
7. **Atualize a memória** e, se surgiu lição nova, `references/licoes-aprendidas.md` e SPEC §16.

## Como falar com o Valter

- Linguagem simples, tabela-resumo + passos numerados; ele manda prints.
- Sempre diga explicitamente se **ele precisa rodar algo** (e o quê) — um comando por linha, sem `cd`.
- Ele está trabalhando de dia (voltou de férias em 2026-11-18): sessões curtas; deixe o ponto de parada na memória.
- Visual "Premium SaaS" (cor do sistema: sky); nada de `window.confirm`/`alert` novo (use `ConfirmModal`).
- Pedir confirmação antes de apagar qualquer coisa no PC dele. Senhas temporárias só no terminal dele.

## Scripts e assets

- `assets/migration_template.sql` — padrão idempotente (no MariaDB do Bem Vindo, `ADD COLUMN IF NOT EXISTS` também serve).
- `scripts/validar_zip.py`, `scripts/verificar_producao.sh` — herdados da Frimelo (zip/Hostgator); **não usados** no Bem Vindo.
- Backup/restauração na VPS: `docker/vps/` (script, service, timer, LEIA-ME).
