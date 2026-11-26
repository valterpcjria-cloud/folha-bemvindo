/**
 * Bem Vindo v1.2.0 — cálculos das rubricas confirmadas pela contabilidade (respostas P1–P30).
 * Funções puras usadas pela cascata de `usePayrollData.ts`.
 *
 *   23  Horas faltas (P13): salário (33) ÷ 220 × horas. Não mexe em DSR nem assiduidade.
 *   816 Desconto VT (P10): % × (salário − faltas 71 − horas faltas 23), limitado ao custo do VT.
 *   Estagiário (P20): sem INSS e sem FGTS (IRRF continua).
 */

import { Funcionario, EventoFolha, Lancamento } from '../types';
import { EVENT_CODES, MONTHLY_WORKING_HOURS, VT_DESCONTO_MAX_PERC } from '../constants/payroll';

type Lancs = Record<string, Partial<Lancamento>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Valor (R$) de uma rubrica do funcionário nos lançamentos; 0 se não existir. */
export function valorRubrica(lancamentos: Lancs, eventos: EventoFolha[], funcId: number, codigo: number): number {
    const ev = eventos.find(e => e.codigo_evento === codigo);
    return ev ? Number(lancamentos[`${funcId}_${ev.id}`]?.valor_total || 0) : 0;
}

/**
 * Descontos por falta que reduzem as bases de INSS, IRRF e FGTS:
 * Faltas em dias (71) + Horas faltas (23).
 */
export function valorDescontoFaltas(lancamentos: Lancs, eventos: EventoFolha[], funcId: number): number {
    return valorRubrica(lancamentos, eventos, funcId, EVENT_CODES.FALTAS)
        + valorRubrica(lancamentos, eventos, funcId, EVENT_CODES.HORAS_FALTAS);
}

/** Estagiário: bolsa sem INSS e sem FGTS (P20). */
export function isEstagiario(funcionarios: Funcionario[], funcId: number): boolean {
    return funcionarios.find(f => f.id === funcId)?.tipo_contrato === 'ESTAGIO';
}

/** Horas faltas (23): valor_unitario = salário ÷ 220; valor_total = horas × valor_unitario. */
export function recalcularHorasFaltasTodos(lancamentos: Lancs, eventos: EventoFolha[]): Lancs {
    const ev = eventos.find(e => e.codigo_evento === EVENT_CODES.HORAS_FALTAS);
    if (!ev) return lancamentos;
    const result = { ...lancamentos };
    Object.keys(lancamentos).forEach(k => {
        const [funcIdStr, evIdStr] = k.split('_');
        if (Number(evIdStr) !== ev.id) return;
        const funcId = Number(funcIdStr);
        const data = lancamentos[k];
        const horas = Number(data?.quantidade || 0);
        const salario = valorRubrica(lancamentos, eventos, funcId, EVENT_CODES.SALARIO);
        const unit = salario > 0 ? salario / MONTHLY_WORKING_HOURS : 0;
        result[k] = { ...data, valor_unitario: unit, valor_total: horas > 0 ? round2(horas * unit) : 0 };
    });
    return result;
}

/**
 * Desconto do vale-transporte (816), por funcionário com % no cadastro:
 *   base  = salário (33) − faltas (71) − horas faltas (23)   → "acompanha o salário proporcional"
 *   valor = base × % ÷ 100, limitado ao custo mensal do VT (se informado no cadastro).
 * O % vem do cadastro (quantidade do lançamento) e é limitado a 6%.
 */
export function recalcularValeTransporteTodos(lancamentos: Lancs, eventos: EventoFolha[], funcionarios: Funcionario[]): Lancs {
    const ev = eventos.find(e => e.codigo_evento === EVENT_CODES.VT_DESCONTO);
    if (!ev) return lancamentos;
    const result = { ...lancamentos };
    Object.keys(lancamentos).forEach(k => {
        const [funcIdStr, evIdStr] = k.split('_');
        if (Number(evIdStr) !== ev.id) return;
        const funcId = Number(funcIdStr);
        const data = lancamentos[k];
        const perc = Math.min(VT_DESCONTO_MAX_PERC, Math.max(0, Number(data?.quantidade || 0)));
        if (perc <= 0) {
            result[k] = { ...data, quantidade: 0, valor_unitario: 0, valor_total: 0 };
            return;
        }
        const base = Math.max(0,
            valorRubrica(lancamentos, eventos, funcId, EVENT_CODES.SALARIO) - valorDescontoFaltas(lancamentos, eventos, funcId));
        let valor = round2(base * perc / 100);
        const teto = Number(funcionarios.find(f => f.id === funcId)?.vt_custo_mensal || 0);
        if (teto > 0) valor = Math.min(valor, round2(teto));
        result[k] = { ...data, quantidade: perc, valor_unitario: base / 100, valor_total: valor };
    });
    return result;
}
