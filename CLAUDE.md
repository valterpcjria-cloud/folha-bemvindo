<!-- caveman-begin -->
🪨 CAVEMAN MODE: ALWAYS ON
Talk caveman. Drop filler. Keep substance. Use fragments.
No "I'd be happy to help". No "Sure!". No "Let me explain".
Just answer. Short. Technical. Accurate.
<!-- caveman-end -->

# 🚀 Diretrizes e SKILLS Locais do Antigravity/Claude Code
# Projeto: FOLHA BEM VINDO — Folha de Pagamento do Supermercado Bem Vindo

Este arquivo define as **regras globais de arquitetura, comandos e as melhores "skills" ativas** para o agente interagir com este repositório.
Sempre que você (AI) for analisar, criar features ou debugar código neste projeto, **siga estritamente as seções abaixo.**

## ⚠️ 0. O QUE É ESTE PROJETO (ler primeiro)
- **Fork da Folha Frimelo (base v4.58.1)**, criado em 2026-11-17 para o **Supermercado Bem Vindo** (Luziânia-GO, ~70 colaboradores, 8 setores). Versão própria recomeça em **1.0.0** (atual: **v1.2.0**, 2026-11-26).
- **NUNCA alterar `/home/valterpcjria/FOLHA FRIMELO`** (outro sistema, em produção na Hostgator). Lá é só leitura. Correção que valha para os dois: avisar o Valter, não aplicar na Frimelo.
- **Produção:** VPS Hostinger da Luzitec (`ssh luzitec-vps`), em Docker, em `/opt/bemvindo` (app em `127.0.0.1:8090` + MariaDB 11.4 próprio). Endereço `https://bemvindo.luzitec.cnt.br` (DNS e HTTPS Let's Encrypt OK desde 2026-11-26). Plano B: túnel `ssh -N -L 8090:127.0.0.1:8090 luzitec-vps` → http://localhost:8090.
- **A mesma VPS roda o CRM da Luzitec em produção.** Nada pode afetá-lo: Caddy compartilhado (`/opt/luzitec/proxy/Caddyfile`), cron/timers e backup do CRM não são tocados. Conferir `https://crm.luzitec.cnt.br/` → 307 depois de qualquer mexida.
- **Contabilidade é a oficial**: cálculos do sistema são prévia. P1–P30 respondidas em 25/11/2026 (regras em SPEC §0.6, v1.2.0); o que ficou em aberto está na 2ª rodada (E1–E15 escritório, B1–B12 Bem Vindo). **Não inventar regra** — esperar a resposta.
- **Códigos de rubrica = os do Questor** (importação do escritório): código que já existia na Frimelo nunca muda (INSS 35, IRRF 1920...); rubrica só do Bem Vindo usa o código da lista deles.
- Repositório: `valterpcjria-cloud/folha-bemvindo` (privado). Histórico antigo da Frimelo só na branch local `frimelo-historico` e em 42 tags v4.x locais (contêm senhas): **NUNCA `git push --tags`, `--all` nem push dessa branch**. Tag sempre explícita: `git push origin vX.Y.Z`.

---

## 🛠 1. SKILLS ATIVAS OBRIGATÓRIAS (Contexto do Projeto)

> **Skill do projeto:** `.claude/skills/frimelo-folha/` (nome herdado; conteúdo atualizado para o Bem Vindo) — cálculo da folha, arquitetura, segurança, banco/migrations, deploy Docker na VPS, lições aprendidas. Carregue-a em qualquer tarefa neste repositório e mantenha-a atualizada junto com SPEC/CHANGELOG. Comandos completos: `docker/vps/LEIA-ME.md` (backup) e a seção 2 abaixo.

Sempre atue invocando os conhecimentos das seguintes *skills* de engenharia:

- **`frontend-developer` & `react-patterns`**: 
  - Regra: O frontend é focado em React (18+), Vite, TypeScript estrito, Context API e TailwindCSS.
  - Composição: Use componentes funcionais divididos (não faça arquivos com mais de 300 linhas).
  - Estilização: Mantenha sempre o design-system em Tailwind. Interfaces devem parecer "Premium SaaS" com Glassmorphism leve se pertinente, feedbacks visuais (Lucide Icons) e layouts responsivos.
- **`design-md` & `react-components`** (ou `react:components`):
  - Regra: Para tarefas de UI/UX grandes, estruture primeiro referências semânticas e passe por uma arquitetura em Markdown do Design System, para só então derivar componentes modulares e focados no Vite/React.
  - UI/UX: Converta sempre designs em visual premium sem atalhos, com interfaces intuitivas seguindo guias de design consistentes.
- **`backend-architect` & `php-pro`**:
  - Regra: O Backend não utiliza Frameworks grandes (Laravel/Symfony). Emprega **PHP Puro 8+** com **PDO**.
  - Roteamento: Use o micro-router customizado do projeto (em `lib/Router.php`). Nunca use rotas acopladas nos componentes React.
  - Segurança: Use `requireRole()` do `auth.php` para RBAC.
- **`database-optimizer` & `sql-pro`**:
  - Regra: MariaDB 11.4 em container Docker (VPS). PDO com `EMULATE_PREPARES=false` → **nunca repetir o mesmo parâmetro nomeado** (`:uf` duas vezes = HY093).
  - Migrações do Bem Vindo: `docker/banco/NN_bv_descricao.sql` (numeradas; num banco novo rodam sozinhas no initdb). Idempotentes e aditivas (`ADD COLUMN IF NOT EXISTS` funciona no MariaDB). Sem `DELIMITER`. `backend/migrations/` é histórico da Frimelo.
- **`code-reviewer` & `clean-code`**:
  - Regra: Código legível, nomes de variáveis em Português ou Inglês (mas mantenha padrão de domínio como "Lancamento", "Funcionario", "Comissao").
  - Type-Safety: O Frontend *DEVE* mapear as interfaces vindas do backend em `types.ts`.

---

## 🏗 2. COMANDOS DO PROJETO (Workflow)

- **Verificar:** `npx tsc --noEmit -p .` (único erro aceito: `FormulasView.tsx` 148, pré-existente) e `npx vite build`.
- **PHP:** não há PHP local → `docker run --rm --entrypoint php folha-bemvindo:X.Y.Z -l /var/www/html/backend/v1/<arquivo>.php`.
- **Teste local (dados FICTÍCIOS):** `docker compose -p bemvindo-teste --env-file <env> -f docker-compose.yml -f <override initdb> up -d` numa porta livre (8090 costuma estar ocupada pelo túnel → usar 8091). Derrubar com `down -v` no fim. Playwright-core + `/usr/bin/google-chrome` para telas.
- **Versão:** `npm --no-git-tag-version version X.Y.Z` (perguntar o número antes).
- **Commits:** Conventional Commits em PT (`feat|fix|docs|chore(escopo): descricao`), código e docs em commits separados, rodapé de co-autoria.
- `create_zip.py` (zip Hostgator) **não é usado** no Bem Vindo.

### 2.1 Fluxo de versão (Bem Vindo — validado em v1.0.0, v1.1.0 e v1.2.0)
1. **Perguntar a versão** ao Valter antes de bumpar.
2. Implementar → testar no Docker local com dados fictícios → commit do código.
3. `docker build -q -f docker/Dockerfile -t folha-bemvindo:X.Y.Z .` → conferir na imagem: sem `.env`, versão no bundle, 4 extensões (`calendar gd bcmath pdo_mysql`), `php -l` dos PHP alterados.
4. Na VPS: **backup na hora** (`systemctl start bemvindo-backup.service`) → `docker save folha-bemvindo:X.Y.Z | gzip -1 | ssh luzitec-vps 'gunzip | docker load'` → migrations novas (`scp` para `/opt/bemvindo/docker/banco/` + `docker compose exec -T db mariadb ...`) **antes** de trocar a imagem → `sed -i "s/^IMAGEM_TAG=.*/IMAGEM_TAG=X.Y.Z/" .env && docker compose up -d --no-build`.
5. Conferir: `/backend/v1/status` (online + connected), versão no bundle, `.php` solto → 403, logs sem `EXCEPTION`, **CRM → 307**.
6. Valter testa na tela → CHANGELOG (+SPEC/PRD/CLAUDE/skill se mudou regra) → commit docs → `git tag vX.Y.Z`.
7. **Push é do Valter** (meu `git push` é bloqueado): `git push origin main` e `git push origin vX.Y.Z`. Conferir com `git ls-remote origin HEAD 'refs/tags/*'` (só tags v1.x no remoto).
8. **Rollback:** `IMAGEM_TAG` da versão anterior + `up -d --no-build`. Cron do CRM (`/etc/cron.d/docker-image-prune`, 05:25) apaga imagens sem uso há 24h → a anterior pode ter sumido da VPS; reenviar do PC (`docker images folha-bemvindo`). Migrations são aditivas.
9. **Nunca** gravar token/senha em arquivo, memória ou chat. Senha temporária do SUPERADMIN aparece só no terminal do Valter.

---

## 🔒 3. BOAS PRÁTICAS & ANTIPADRÕES DO PROJETO

1. **Testes de API Offline/Mock:**
   - Se o backend local não estiver rodando no PHP Server embutido, atue via porta Vite com `CONFIG.IS_MOCK = false` cuidando de CORS apenas se for domínio hosteado, senão suba um `php -S localhost:8000 -t backend/v1` para testes de integração.
2. **Atualização da Tabela Dashboard:**
   - Evite alterar a View gigante de `PayrollGridView.tsx` diretamente; se a feature for pesada, extraia como fizemos com o `DsrModal.tsx`.
3. **Erros de Deploy no React:**
   - Nunca altere a string `VERSION` manualmente no `config.ts`. O Vite já foi configurado para injetar `__APP_VERSION__` retirado dinamicamente do `package.json`.
4. **Resolução de Problemas no Backend:**
   - Logs de erro vão ser lançados no endpoint ou no servidor. Sempre valide as queries PDO com `try..catch` retornando um JSON `{ error: "msg" }` com `http_response_code()`.
5. **Produção tem dados reais:**
   - Na VPS, nunca criar/alterar funcionários/lançamentos "de teste". Testes com dados fictícios são feitos no **Docker local** (seção 2), que reproduz a produção.
   - Não há PHP local — `php -l` via a imagem Docker (seção 2).
6. **Regra de negócio multi-empresa:** todo ADMIN vê todas as empresas (intencional). Usuário de empresa cliente = perfil RH.

---

> As seções 4 e 5 vêm da Frimelo e continuam valendo para o código do Bem Vindo (mesma base). Diferenças do Bem Vindo: seção 5B.

## 📌 4. RÚBRICAS DO CADASTRO — v4.53.10+

A partir de v4.52.20, rúbricas críticas migraram do grid de lançamentos para o **cadastro do funcionário**. Estas rúbricas são **travadas em lançamentos** (read-only) e alimentam automaticamente em competências abertas.

### 4.1 Lista de Rúbricas Travadas

| Código | Nome | Tipo | Atualização |
|--------|------|------|------------|
| 33 | Salário Base | Valor fixo | Campo `salario_base` → Alimenta em competências abertas |
| 62 | Insalubridade | Percentual (%) | Campo `insalubridade_perc` → Recalcula conforme % × (Sal.Min − Faltas) |
| 833 | Assiduidade | Percentual (%) | Campo `assiduidade_perc` → Calcula como % × Salário / 100 |
| 1000 | Adic. Tempo Serviço | Percentual (%) | Campo `adic_tempo_servico_perc` → Calcula como % × Salário / 100 |
| 936 | Mensalidade Sindical | Valor fixo | Campo `mensalidade_sindical` → Valor direto em R$ |
| 4004 | Empréstimo Consignado | Valor fixo | Campo `emprestimo_consignado` → Valor direto em R$ |
| 88 | Gratificação | Valor fixo | Campo `gratificacao` (v4.53.10) → Valor direto em R$ |

### 4.2 Fluxo de Sincronização

Quando competência é **ABERTA**:
1. `aplicarSalarioBaseFuncionarios()` injeta campo `salario_base` na rubrica 33
2. `aplicarRubricasCadastroFuncionarios()` injeta todos os campos acima nas respectivas rúbricas
3. Cascata de cálculos auto-executa (Assiduidade → Adic.TS → Insalubridade → HE → DSR → INSS → IRRF)

Quando competência é **FECHADA**:
- Nenhuma injeção ocorre; valores salvos anteriormente são snapshot histórico

### 4.3 Como Adicionar Nova Rubrica do Cadastro

Se precisar adicionar nova rubrica do tipo "valor fixo" (como Gratificação):

1. **Interface TypeScript** (`types.ts`):
   ```typescript
   export interface Funcionario {
     // ... campos existentes
     nova_rubrica?: number;  // v4.54.x: descrição
   }
   ```

2. **Constante de Evento** (`constants/payroll.ts`):
   ```typescript
   export const EVENT_CODES = {
     // ...
     NOVA_RUBRICA: 12345,  // código novo
   };
   ```

3. **Backend — Rota de Funcionários** (`backend/v1/routes/funcionarios.php`):
   - Adicionar campo `nova_rubrica` ao SELECT em GET
   - Adicionar campo ao INSERT/UPDATE em POST

4. **Backend — Migration** (`backend/migrations/vX.Y.Z_add_nova_rubrica.sql`):
   - ALTER TABLE funcionarios ADD COLUMN nova_rubrica DECIMAL(10,2) NULL DEFAULT 0.00
   - UPDATE funcionarios com valor inicial (opcional)

5. **Frontend — EmployeesView.tsx**:
   - Adicionar input no formulário da seção "Rúbricas do Cadastro"
   - Adicionar campo ao estado inicial em `handleOpenModal()`

6. **Frontend — PayrollTableRow.tsx**:
   - Adicionar código ao array `isCadastroLocked`
   - Campo fica read-only automaticamente

7. **Frontend — usePayrollData.ts**:
   - Adicionar rubrica à função `aplicarRubricasCadastroFuncionarios()`
   - Padrão: valor fixo (sem recalc) ou percentual (com recalc base salarial)

---

## 📌 5. REGRAS RECENTES (v4.53.11 → v4.58.1)

### 5.1 Switcher de Feriado no DSR (v4.53.11)
- Superadmin liga/desliga feriado em Gestão de Feriados (`ativo=0` sai do DSR).
- Feriados **móveis** (Carnaval/Sexta-Santa/Corpus/Páscoa) vêm de algoritmo de Páscoa, NÃO só do DB. Toggle respeitado nos DOIS caminhos: `DsrService::getDatasFeriadosDesligados()` (backend) e `calcDiasComFeriados()` (fallback frontend em `usePayrollData.ts`).

### 5.2 Perda de Assiduidade (v4.54.0)
- Assiduidade (833) zera na competência ABERTA se Faltas(71) preenchida OU atestado informado.
- Atestado: checkbox por funcionário no grid → tabela isolada `competencia_atestados` (NÃO entra em `lancamentos_eventos`, não afeta export/import). Rota `atestados.php`, api `getAtestados`/`setAtestado`.
- Lógica em `recalcularAssiduidadeTodos(lancamentos, eventos, atestados)`.

### 5.3 Funcionário Desligado (v4.54.0)
- Status DESLIGADO some de Lançamentos/Relatórios em comp ABERTA; comp FECHADA preserva histórico.
- `filtrarVisiveis(funcs, compAberta)` no hook; dropdown filtrado em ReportsView.

### 5.4 Cascade centralizada (v4.54.0)
- `recalcularCascataCompleta()` em `usePayrollData.ts` centraliza Assiduidade→AdicTS→Insalub→HE→DSR→INSS→IRRF→FGTS. Usar sempre este helper ao invés de repetir a cadeia.

### 5.5 HE 100% com Gratificação + Fechada = snapshot (v4.54.1)
- Base HE (49) = Salário(33) + Gratificação(88) + Insalubridade(62) / 220 × 2. Frontend: `calcBaseHE()`; backend: `LancamentoService::calculateEventValue`. AdicTS(1000)/Assiduidade(833) fora.
- `recalcularCascataCompleta(..., competenciaAberta)`: FECHADA só calcula virtuais 59/1900. Todo call site novo DEVE passar `compAberta`.

### 5.6 Alterações não salvas + Segurança Deploy 2 (v4.55.0)
- `utils/unsavedChanges.ts`: `await confirmarDescarteAlteracoes()` (async desde v4.56.0, abre `UnsavedChangesDialog`) antes de qualquer navegação que desmonte o grid (NavLink, logout, troca empresa/competência). Nova navegação no Layout DEVE chamar.
- Nunca usar `fetch` cru com `sessionStorage.getItem('token')` — usar métodos de `api` (fetchApi + `authHeaders()` cuidam de cookie, CSRF e X-Company-Context; ver 5.9).
- `auth.php`: sem fallback `id_empresa=1`. ADMIN ver todas empresas é **intencional**.
- `RateLimiter`: login fail-closed; `getClientIP()` só confia em `CF-Connecting-IP` vindo de faixas Cloudflare. Nunca voltar a confiar em `X-Forwarded-For`.

### 5.7 Sessão e senha (v4.57.0)
- Emitir token SEMPRE via `AuthSession::emitirToken()` (inclui `jti`). Logout = `AuthSession::revogarToken()`.
- `pwd_change` no token libera só `change_password`/`logout`. Rota nova que precise funcionar antes da troca de senha deve entrar nessa lista em `auth.php`.
- Nunca reintroduzir senha padrão fixa: usuário novo sem senha → `AuthSession::gerarSenhaTemporaria()` + `must_change_password = 1`.

### 5.8 Sem PHP solto acessível (v4.57.1)
- `backend/v1/.htaccess` só libera `index.php`. Nunca criar script/endpoint como arquivo `.php` avulso nem abrir `.php` via `window.open` — criar rota autenticada no `index.php`.

### 5.9 Sessão em cookie (v4.58.0)
- Token NUNCA em storage do navegador. Todo `fetch` direto à API: `credentials: 'include'` + `headers: authHeaders()` (de `services/mockApi`). Preferir métodos de `api`.
- Mutações sem `X-Requested-With` via cookie → 403. Remover aceitação de header `Authorization` legado numa versão futura.
- Reutilizar componente com callback opcional (ex: `PaystubView.onPrint`) → conferir se o callback foi passado (bug v4.58.1).

---

## 📌 5B. REGRAS DO BEM VINDO (v1.0.0 → v1.2.0)

### Setores e hierarquia (v1.0.0)
- Tabela `setores` (8: Administrativo, Açougue, Padaria, FLV, PGC, Frente de Loja, Vendas Online/Escolas, Entregas); `cargos` com `id_setor` + `ordem_hierarquia` (1 = topo), único por (empresa, setor, nome). Setor/cargo **desativa**, não exclui. Tela `/setores` (`SetoresView` + `components/setores/`).
- `funcionarios`: `id_setor`, `id_cargo`, `data_nascimento`, `sexo`, `escolaridade`, `modalidade_pagamento` (BANCO/PIX/LOJA), dados bancários/Pix (**só ADMIN/RH/SUPERADMIN veem e gravam**). `departamento` continua sendo o código da exportação contábil — **não é setor**.
- Matriz `/lancamentos` "Por setor" (padrão, localStorage `bv_matriz_visao`) ou "Lista": blocos na ordem dos setores, pessoas por cargo, subtotal por rubrica + total geral (`views/payroll/agruparPorSetor.ts`, `PayrollGroupedBody.tsx`).

### Marca e segurança (v1.0.0)
- Marca Folha Bem Vindo; contracheque lê empresa via `GET empresa_atual`; PDFs usam `nome_cidade`. Cookie `bemvindo_session`. CORS só `bemvindo.luzitec.cnt.br` + `APP_ORIGIN`.
- Empresa nova → senha temporária (nunca `frimelo123`); SUPERADMIN por CLI (`docker/scripts/criar_superadmin.php`).

### Etiquetas, atestado em dias, padrões (v1.1.0)
- `views/payroll/FuncionarioCell.tsx`: etiquetas só informativas — nível (escolaridade), aniversariante no mês da competência, admissão no mês com "N/30 dias" (o proporcional já era calculado na rubrica 33).
- Atestado ganhou `competencia_atestados.dias` (1..31, NULL = não informado). Assiduidade continua dependendo só de existir atestado. `GET /atestados` → `{data:[ids], dias:{id:n}}`; `POST` com `dias` opcional (ausente = mantém); valida empresa; competência FECHADA → 409.
- Funcionário novo: **insalubridade e assiduidade 0%** (Frimelo: 20%/11%) — formulário, POST/PUT, fallback do cálculo e DEFAULT da coluna.

### Rubricas confirmadas pela contabilidade (v1.2.0) — detalhe em SPEC §0.6
- **82 Gratificação de função** (% no cadastro, `gratificacao_funcao_perc`) substitui a **88** (desativada, `ativo = 0`). Base HE = 33 + 82 + 62.
- **37 HE 60%** = base HE ÷ 220 × 1,6; entra no DSR 59 (`DSR_HE_CONFIG` + `dsr_he_config_eventos`). **23 Horas faltas** = 33 ÷ 220 × horas.
- **816 Desconto VT** = (33 − 71 − 23) × % (≤ 6, `vt_desconto_perc`), teto `vt_custo_mensal`. **Estagiário**: INSS e FGTS 0.
- Faltas 71 + 23 reduzem bases de INSS, IRRF e FGTS. Helpers em `hooks/payrollBemVindo.ts`; `updateLancamento` roda `recalcularCascataCompleta` (não repetir cascata manual). Rubrica `ativo = 0` fica fora do grid e da exportação.

### Infra (v1.0.0 → v1.1.0)
- Imagem `php:8.3-apache` com `calendar`, `gd`, `bcmath`, `pdo_mysql` (sem `calendar` o DSR dá 500).
- Backup diário 02:30 (`bemvindo-backup.timer`): 14 dias em `/opt/bemvindo/backup/copias` + 30 dias no Drive (`luzitec-backup-cripto:bemvindo/`). Ver `docker/vps/LEIA-ME.md`. O client_id compartilhado do rclone será desativado em 2026 → envio ao Drive (Bem Vindo e CRM) vai falhar até criar client_id próprio.

---

## 📋 6. PENDÊNCIAS (fonte única: SPEC.md §20)
- **Aguardando 2ª rodada (E1–E15 / B1–B12):** base da HE e divisor, insalubridade por função, DSR em faltas/suspensão, códigos pendentes, auxílios (859/689/902/687), quebra de caixa 834, produtividade 566, bônus aniversário 694, salário-família, 13º/férias/rescisão, encargos do Simples, retorno oficial e conciliação.
- Fase B (controles internos): adiantamentos (vale dia 21, convênios), saldo a pagar, pagamento banco/Pix/loja e conferência; status de competência em 6 etapas; perfis DP/contabilidade/diretor.
- Relatório para a contabilidade (HE em horas, faltas/atestados em dias) e os demais relatórios do documento de requisitos.
- CEP da empresa. Feriados municipais de Luziânia.
- Herdadas da Frimelo: remover transição v4.58.0 (`Authorization` legado), scripts `.php` soltos, CSP enforced, erro TS em `FormulasView.tsx`.

---
*Este CLAUDE.md foi gerado nativamente pelo Antigravity em colaboração com o Usuário e adaptado para a Folha Bem Vindo. Última atualização: v1.2.0 (2026-11-26)*
