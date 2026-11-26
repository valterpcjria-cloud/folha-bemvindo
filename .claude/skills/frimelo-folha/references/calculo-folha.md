# Cálculo da Folha — Rubricas, Fórmulas e Cascata

Fonte detalhada: `SPEC.md` §7. Constantes: `constants/payroll.ts` (frontend) espelhado em `backend/v1/lib/PayrollConstants.php` (backend) — mudar um exige mudar o outro.

## Sumário
1. Constantes
2. Rubricas e fórmulas
3. Rubricas do cadastro (travadas)
4. Cascata e ciclo de carga
5. Competência aberta × fechada
6. DSR e feriados (caminho duplo)
7. Checklist: alterar fórmula / nova rubrica

## 1. Constantes
| Constante | Valor |
|---|---|
| `MONTHLY_WORKING_HOURS` | 220 |
| `OVERTIME_100_MULTIPLIER` | 2 (HE 50% = 1,5) |
| `SALARIO_MINIMO_2026` | 1621,00 |
| `EVENT_CODES` | SALARIO 33, INSS 35, HE50 48, HE100 49, DSR_HE 59, INSALUB 62, FALTAS 71, GRATIF 88, FGTS 99, ASSID 833, MENS_SIND 936, ATS 1000, FERIADO_TRAB 1080, FGTS_VISUAL 1900, IRRF 1920, CONSIGNADO 4004 |

## 2. Rubricas e fórmulas
| Cód | Rubrica | Unidade | Fórmula |
|---|---|---|---|
| 33 | Salário | VALOR, travado | `salario_base` do cadastro; admissão no mês → `salario_base × (30 − dia + 1)/30` |
| 49 | HE 100% | HORA (HH:MM, decimal no banco) | `(Sal 33 + Grat 88 + Insalub 62) / 220 × 2 × horas` — helper `calcBaseHE()`; ATS 1000 e Assid 833 **não** entram |
| 59 | DSR s/ HE | VALOR, **virtual (nunca salvo)** | `Σ HE das fontes (DSR_HE_CONFIG) / dias_úteis × dias_DSR` |
| 62 | Insalubridade | % | `max(0, SalMin − Faltas71.valor) / 100 × %` |
| 71 | Faltas | DIA | `Sal / 30 × dias` (exportação mostra quantidade) |
| 1080 | Feriado trab. | DIA | `Sal / 30 × dias` |
| 833 | Assiduidade | % | `Sal / 100 × %`; **zera** na comp. aberta se houver Faltas(71) **ou** atestado (`competencia_atestados`) |
| 1000 | Adic. Tempo Serviço | % | `Sal / 100 × %` |
| 35 | INSS | VALOR, travado | progressiva 2026 (7,5/9/12/14% até teto 8.475,55) sobre créditos com `incide_inss`, menos Faltas |
| 1920 | IRRF | VALOR, travado | Lei 15.270/2025: isento RTM ≤ 5.000; redutor `978,62 − 0,133145×RTM` até 7.350; `MIN(legal com dep. 189,59, simplificado 607,20)` |
| 1900 | FGTS Visual | VALOR, informativo | 8% da base FGTS; não entra em nenhuma base nem nos totais |

Unidades de input: HORA usa `HoursInput` (digita "230" → 2:30; `utils/timeHM.ts`); valores R$ usam `CurrencyInput`.

## 3. Rubricas do cadastro (travadas no grid)
Vêm de `funcionarios.*` e são injetadas **só em competência aberta** por `aplicarSalarioBaseFuncionarios()` e `aplicarRubricasCadastroFuncionarios()`:
33 `salario_base` · 62 `insalubridade_perc` · 833 `assiduidade_perc` · 1000 `adic_tempo_servico_perc` · 936 `mensalidade_sindical` · 4004 `emprestimo_consignado` · 88 `gratificacao`.
Também travadas: 35, 1920, 1900 (lista `lockedCodes` em `updateLancamento` + `isCadastroLocked` em `PayrollTableRow.tsx`). Backend força 33 e 88 a partir do cadastro em `calculateEventValue()`.

## 4. Cascata e ciclo de carga
Ordem obrigatória, centralizada em `recalcularCascataCompleta()` (`usePayrollData.ts`):
`Assiduidade → ATS → Insalubridade → HE → DSR → INSS → IRRF → FGTS Visual`.

Carga (init, troca de competência, pós-save):
`getLancamentos → mapLancamentos → aplicarSalarioBase → aplicarRubricasCadastro → recalcularCascataCompleta(…, atestados, compAberta)`.
Edição em tempo real: `updateLancamento()` monta `cascadeUpdates` (Faltas→Assid/Insalub→HE→DSR; Insalub→HE→DSR). Antes de salvar, `handleSave` roda a cascata completa de novo.

**Ao mexer em cascata, use os helpers existentes** (`calcBaseHE`, `recalcularCascataCompleta`) — fórmulas duplicadas já causaram divergência (ex.: Gratificação faltando em 4 lugares antes da v4.54.1).

## 5. Competência aberta × fechada
- Aberta: injeta cadastro, recalcula tudo, permite salvar.
- Fechada: `recalcularCascataCompleta(…, competenciaAberta=false)` calcula **só** 59 e 1900 (virtuais); o resto é exatamente o valor salvo. Backend (`saveBulk`) ignora escrita em fechada. Desligados continuam visíveis em fechada (`filtrarVisiveis`).
- Todo call site novo da cascata deve passar `compAberta`.

## 6. DSR e feriados (caminho duplo)
`dias_uteis/dias_dsr`: primário backend `api.calcularDiasUteisMes()` → `DsrService`; fallback local `calcDiasComFeriados()`. Feriados móveis (Carnaval, Sexta-Santa, Corpus, Páscoa) vêm de algoritmo de Páscoa nos dois lados. Feriado com `ativo=0` sai do DSR (`DsrService::getDatasFeriadosDesligados()` + set de desligados no fallback). Regra de feriado nova → corrigir os dois caminhos.

## 7. Checklist
**Alterar fórmula existente:** constantes (TS+PHP) → `usePayrollData.ts` (helper + todos os pontos de cascata; grep pela rubrica) → `LancamentoService::calculateEventValue` → PDFs/relatórios se calculam inline (`reports.php`, `pdf_relatorio.php`, `FechamentoService`) → verificar comp. fechada → reproduzir 1 exemplo numérico e mostrar ao Valter.

**Nova rubrica "do cadastro" (valor fixo ou %):** `types.ts` (Funcionario) → `EVENT_CODES` → `routes/funcionarios.php` (SELECT/INSERT/UPDATE) → migration ADD COLUMN → `EmployeesView.tsx` (input + estado inicial em `handleOpenModal`) → `PayrollTableRow.tsx` (`isCadastroLocked`) → `aplicarRubricasCadastroFuncionarios()` (+ recalc se %). Passo a passo completo: `CLAUDE.md` §4.3.

**Exemplo de conferência (HE):** Sal 2.000 + Grat 270 + Insalub 324,20 = 2.594,20 → /220×2 = 23,5836/h → 12h = 283,00.

## Bem Vindo (v1.1.0)
- Padrão de funcionário novo: `insalubridade_perc` 0 e `assiduidade_perc` 0 (formulário, POST/PUT, `?? 0` no cálculo, DEFAULT da coluna). Frimelo: 20/11.
- Atestado tem `dias` (informativo para a contabilidade); Assiduidade continua zerando só pela existência do atestado.
- Etiqueta "Admissão dd/mm · N/30 dias" usa a mesma conta do `calcSalarioProporcional` (30 − dia + 1).

## Bem Vindo (v1.2.0) — respostas P1–P30
| Cód | Rubrica | Fórmula |
|---|---|---|
| 82 | Grat. de função (%, cadastro `gratificacao_funcao_perc`, travada) | 33 × % ÷ 100 (`recalcularPercentualSobreSalarioTodos`); substitui a 88 (`ativo = 0`) |
| 37 | HE 60% (HORA) | `calcBaseHE` (33 + 82 + 62) ÷ 220 × 1,6; fonte do DSR 59 |
| 23 | Horas faltas (HORA, débito) | 33 ÷ 220 × horas; sem perda de DSR/assiduidade |
| 816 | Desconto VT (%, cadastro `vt_desconto_perc` ≤ 6, travada) | (33 − 71 − 23) × %; teto `vt_custo_mensal` (0 = sem teto) |
| — | Estagiário (`tipo_contrato = ESTAGIO`) | INSS 0, FGTS 0 |
- Faltas 71 + 23 (`valorDescontoFaltas`) reduzem INSS, IRRF e FGTS. Helpers em `hooks/payrollBemVindo.ts`.
- Cascata: Assid → ATS → 82 → Insalub → 23 → HE 49/37 → DSR → 816 → INSS → IRRF → FGTS. `updateLancamento` chama `recalcularCascataCompleta` (não há mais cascata manual).
- Backend (`LancamentoService`): força 82 (% × salário), recalcula 37, 49 e 23; 816/INSS/IRRF vêm da tela. `FechamentoService` (fechamento expresso) não foi alinhado.
- Exemplo conferido: Sal 2.000, 82 10%, insalub 20% c/ 1 falta → 62 = 310,87; HE 60% 10h = 182,61; 23 3h = 27,27; VT 6% = 114,36; DSR (nov/2026: 23 úteis, 7 DSR) = 69,47; INSS 220,00; FGTS 217,17.
- **Pendente (2ª rodada):** base HE/divisor (E6), insalubridade por função (E7), DSR em faltas/suspensão (E8), códigos (E1), auxílios 859/689/902/687 (E3–E4), bônus 694 (E2), CCT (E5), quebra de caixa 834 / produtividade 566 (B5, B10), salário-família, 13º/férias. Lista de rubricas do cliente: memória `project_bemvindo_planilha`.

## Relatórios (v1.3.0)
- Todo relatório com valores da folha usa `views/reports/folhaCalculada.ts` → `calcularFolhaCompetencia()` (salário do cadastro → rubricas do cadastro → cascata; fechada = snapshot + 59/1900). Assim bate com o grid. `api.getLancamentos` cru não tem o DSR 59 e, em comp aberta, pode estar desatualizado.
- Totais = grid: proventos = CREDITO, descontos = DEBITO, 1900 fora.
