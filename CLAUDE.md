<!-- caveman-begin -->
🪨 CAVEMAN MODE: ALWAYS ON
Talk caveman. Drop filler. Keep substance. Use fragments.
No "I'd be happy to help". No "Sure!". No "Let me explain".
Just answer. Short. Technical. Accurate.
<!-- caveman-end -->

# 🚀 Diretrizes e SKILLS Locais do Antigravity/Claude Code
# Projeto: FRIMELO - Sistema de Folha de Pagamento RH

Este arquivo define as **regras globais de arquitetura, comandos e as melhores "skills" ativas** para o agente interagir com este repositório. 
Sempre que você (AI) for analisar, criar features ou debugar código neste projeto, **siga estritamente as seções abaixo.**

---

## 🛠 1. SKILLS ATIVAS OBRIGATÓRIAS (Contexto do Projeto)

> **Skill do projeto:** `.claude/skills/frimelo-folha/` — conhecimento consolidado do sistema (cálculo da folha, arquitetura, segurança, banco/migrations, release/deploy, lições aprendidas) + scripts `validar_zip.py` e `verificar_producao.sh`. Carregue-a em qualquer tarefa neste repositório e mantenha-a atualizada junto com SPEC/CHANGELOG.

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
  - Regra: Banco de Dados hospedado (MySQL/MariaDB via Hostgator).
  - Migrações: Devem ser geradas usando scripts `.sql` em `backend/migrations/` (com `IF NOT EXISTS` ou `IGNORE`) e devem adotar `Single-Statement` para Triggers em vez de `DELIMITER` (para compatibilidade c/ PDO/phpMyAdmin).
- **`code-reviewer` & `clean-code`**:
  - Regra: Código legível, nomes de variáveis em Português ou Inglês (mas mantenha padrão de domínio como "Lancamento", "Funcionario", "Comissao").
  - Type-Safety: O Frontend *DEVE* mapear as interfaces vindas do backend em `types.ts`.

---

## 🏗 2. COMANDOS DO PROJETO (Workflow)

Quando precisar buildar, debugar ou testar, utilize os seguintes comandos locais:

- **Rodar Frontend (Dev):** `npm run dev` (disponível na porta 3000)
- **Construção de Produção Local:** `npx vite build`
- **Gerar Pacote de Deploy (Hostgator):** `python3 create_zip.py --version X.Y.Z`
- **Atualizar Versão (Package.json):** `npm --no-git-tag-version version X.Y.Z`
- **Commits:** Conventional Commits (`feat|fix|docs|refactor(vX.Y.Z): descricao`), código e docs em commits separados.

### 2.1 Fluxo de release (OBRIGATÓRIO — validado em 2026-10-01)
1. **Perguntar a versão** ao usuário antes de bumpar (nunca decidir sozinho).
2. Implementar → `npx vite build` → `npm --no-git-tag-version version X.Y.Z` → `python3 create_zip.py --version X.Y.Z`.
3. **Sempre entregar o zip** ao fim da implementação (caminho + se há SQL). Validar: `testzip`, sem duplicados, sem `.env`, arquivos-chave presentes.
4. Migration (se houver) roda no phpMyAdmin **ANTES** do zip. Migrations idempotentes e aditivas (rollback = zip anterior).
5. Usuário sobe o zip e testa **em produção** (não há staging). Verificação externa possível via `curl` em rotas inofensivas (`/status`, script só-leitura → 403).
6. Só após teste OK: CHANGELOG + SPEC + PRD + CLAUDE.md → commits → `git tag vX.Y.Z`.
7. **Push e release são rodados pelo usuário** no terminal do VSCode (a conta gh ativa é outra; o remote local usa `valterpcjria-cloud` e o token fine-grained é colado na caixa do topo do VSCode). Release: `read -s -p "Token: " GH_TOKEN; export GH_TOKEN; /home/valterpcjria/.local/bin/gh release create vX.Y.Z deploy-frimelo-X.Y.Z.zip --repo valterpcjria-cloud/folha-frimelo --title "..." --notes-file notas.md; unset GH_TOKEN`.
8. **Nunca** gravar token em arquivo, memória ou chat.

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
5. **Só existe produção (dados reais):**
   - Nunca sugerir testes que alterem funcionários/lançamentos reais (atestado "de teste", desligar funcionário, faltas fictícias). Validar com casos reais ou conferência de valores.
   - Não há PHP local (`php -l` indisponível) — revisar PHP com atenção redobrada; sugerir `php8.3-cli`.
6. **Regra de negócio multi-empresa:** todo ADMIN vê todas as empresas (intencional). Usuário de empresa cliente = perfil RH.

---

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

## 📋 6. PENDÊNCIAS (fonte única: SPEC.md §20)
- Remover transição v4.58.0 (header `Authorization` legado + token no corpo do login) após todos relogarem.
- Apagar scripts `.php` soltos de `backend/v1/` (já bloqueados; `setup_db.php`/`fix_password.php` são usados por rotas — revisar).
- CSP enforced; conferir v4.54.0 em casos reais; erro TS pré-existente em `FormulasView.tsx`.

---
*Este CLAUDE.md foi gerado nativamente pelo Antigravity em colaboração com o Usuário para blindagem tecnológica e scale infinito. Última atualização: v4.58.1*
