# Release v4.42.0 — Rubrica 59: DSR s/ Horas Extras Diurnas

**Data:** 2026-03-27  
**Tipo:** Feature

---

## ✨ Novidade: Rubrica 59 — DSR s/ Horas Extras Diurnas

### O que foi implementado

Nova rubrica de provento calculada automaticamente que apura o **Descanso Semanal Remunerado proporcional às horas extras diurnas** de cada funcionário.

**Posição na grid:** Entre a rubrica 49 (Horas Extras 100%) e 1080 (Feriado Trabalhado).

### Fórmula

```
DSR = (Total HE no mês / Dias Úteis) × (Domingos + Feriados)
```

### Comportamento

- Campo **somente leitura** (fundo verde) — recalc울 automaticamente ao alterar HE 100%
- Recalcula ao trocar de competência
- Se HE = 0, DSR = 0,00
- Soma ao Total de Proventos

### Arquitetura multi-percentual

A rubrica foi construída com configuração extensível. Para adicionar HE 50%, 70%, etc. no futuro:
- **Frontend:** descomentar linha em `DSR_HE_CONFIG` em `constants/payroll.ts`
- **Backend:** inserir linha na tabela `dsr_he_config_eventos`
- **Zero alteração de código de negócio**

### Dados de validação (04/2026 — 24 dias úteis / 6 DSR)

| HE 100% | DSR Esperado |
|---------|-------------|
| R$ 191,57 | R$ 47,89 |
| R$ 44,21  | R$ 11,05 |
| R$ 0,00   | R$ 0,00  |

---

## 🗄️ Migration SQL obrigatória

**Arquivo:** `backend/migrations/v4.41.4_rubrica59_dsr_he.sql`

Execute no banco antes de subir os arquivos:

```sql
-- Criar evento 59 + tabela dsr_he_config_eventos
-- Ver arquivo completo em backend/migrations/v4.41.4_rubrica59_dsr_he.sql
```

> ⚠️ A migration é idempotente (`INSERT IGNORE` + `CREATE TABLE IF NOT EXISTS`) — segura para rodar mesmo se parcialmente aplicada.

---

## 📁 Arquivos alterados

| Arquivo | Tipo |
|---------|------|
| `backend/migrations/v4.41.4_rubrica59_dsr_he.sql` | NOVO |
| `constants/payroll.ts` | MODIFICADO |
| `constants.tsx` | MODIFICADO |
| `hooks/usePayrollData.ts` | MODIFICADO |
| `views/payroll/PayrollTableRow.tsx` | MODIFICADO |
| `services/mockApi.ts` | MODIFICADO |
