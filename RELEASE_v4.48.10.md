# Release v4.48.10 — Gestão de Ciclo de Competências

**Data:** 29/03/2026
**Tipo:** Feature / Lifecycle Management
**Deploy:** `deploy-frimelo-4.48.10.zip`

---

## Resumo

Esta versão introduz o controle avançado do ciclo de vida das competências (períodos de folha), permitindo a exclusão de períodos abertos e a reabertura de períodos fechados. Ambas as ações agora exigem uma justificativa obrigatória para fins de auditoria e conformidade.

---

## Novas Funcionalidades

### 🗑️ Exclusão de Competência
- Permite remover competências com status `ABERTA`.
- **Impacto:** Remoção automática e permanente de todos os lançamentos de eventos vinculados (CASCADE).
- **Segurança:** Exige justificativa textual e confirmação em modal com alerta crítico.

### 🔄 Reabertura de Competência
- Permite que uma competência `FECHADA` retorne ao status `ABERTA`.
- **Objetivo:** Correções de última hora ou ajustes em folhas já encerradas sob supervisão.
- **Segurança:** Exige justificativa textual que fica gravada no registro da competência e nos logs.

---

## Mudanças Técnicas

### Banco de Dados
- **Migração:** `v4.48.10_add_competencia_justificativa.sql`
- **Alteração:** Adição da coluna `justificativa_status` (TEXT) na tabela `competencias`.

### Backend (API)
- **Rota `/competencias`**:
    - Adicionado suporte ao método `DELETE` para remoção segura.
    - Adicionada sub-rota `POST /reopen` para reversão de status.
    - Implementada obrigatoriedade do campo `justificativa` no corpo da requisição.
    - Integração total com o sistema de `registrarLog` para auditoria.

### Frontend
- **View:** `CompetenceView.tsx` atualizada com novos botões e estados.
- **Components:** Novo modal de justificativa com validação de campo obrigatório.
- **Services:** `mockApi.ts` atualizado com métodos `deleteCompetencia` e `reopenCompetencia`.

---

## Arquivos Modificados

**Frontend:**
- `package.json`
- `CHANGELOG.md`
- `types.ts`
- `services/mockApi.ts`
- `views/CompetenceView.tsx`

**Backend:**
- `backend/migrations/v4.48.10_add_competencia_justificativa.sql`
- `backend/v1/routes/competencias.php`

---

*Release gerada pelo Antigravity — FRIMELO Technical Assistant*
