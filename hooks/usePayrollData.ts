/**
 * usePayrollData - Hook para gerenciar dados da folha de pagamento
 * Extrai lógica de estado e cálculos do PayrollGridView
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Funcionario, EventoFolha, Competencia, Lancamento, Unidade, StatusCompetencia, StatusFuncionario } from '../types';
import { api } from '../services/mockApi';
import { MONTHLY_WORKING_HOURS, OVERTIME_100_MULTIPLIER, OVERTIME_60_MULTIPLIER, EVENT_CODES, SALARIO_MINIMO_2026, DSR_HE_CONFIG } from '../constants/payroll';
import { useAuth } from '../contexts/AuthContext';
import { calcularINSS, calcularIRRF, calcularBaseIncidencia, calcularFGTS } from '../utils/taxCalculations';
import { valorDescontoFaltas, isEstagiario, recalcularHorasFaltasTodos, recalcularValeTransporteTodos } from './payrollBemVindo';
import { ehSomenteLeitura } from '../constants/etapasCompetencia';
import { MENSAGEM_ALTERACOES_NAO_SALVAS, setAlteracoesPendentes, confirmarDescarteAlteracoes, registrarSalvamento } from '../utils/unsavedChanges';

export interface PayrollTotals {
    proventos: number;
    descontos: number;
    liquido: number;
}

export interface FuncTotals {
    proventos: number;
    descontos: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers puros para cálculo da Rubrica 59 (DSR s/ HE Diurnas)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula feriados móveis brasileiros (Páscoa, Carnaval, Sexta-Santa, Corpus Christi)
 * usando o algoritmo de Meeus/Jones/Butcher.
 */
function calcFeriadosMoveis(ano: number): string[] {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    const pascoa = new Date(ano, mes - 1, dia);

    const fmt = (dt: Date) =>
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    const offset = (days: number) => {
        const dt = new Date(pascoa);
        dt.setDate(pascoa.getDate() + days);
        return fmt(dt);
    };

    return [fmt(pascoa), offset(-47) /*Carnaval*/, offset(-2) /*Sexta-Santa*/, offset(60) /*Corpus Christi*/];
}

/**
 * Calcula dias úteis e dias de DSR considerando feriados da Gestão de Feriados.
 * Dias úteis = dias do mês excluindo domingos e feriados.
 * Dias DSR   = domingos + feriados (dias que geram DSR).
 */
export function calcDiasComFeriados(
    mes: number,
    ano: number,
    feriadosApi: Array<{ data: string; recorrente?: number | boolean; ativo?: number | boolean; tipo?: string; uf?: string; cidade?: string }> = []
): { dias_uteis: number; dias_dsr: number } {
    const feriadoDates = new Set<string>();

    // 0. Datas de feriados DESLIGADOS (ativo=0) — usadas para excluir móveis
    //    que o Superadmin desativou (Carnaval/Sexta-Santa/Corpus). Sem isso,
    //    o cálculo de móveis abaixo re-injetaria o feriado ignorando o switcher.
    const desligados = new Set<string>();
    for (const f of feriadosApi) {
        if (!(f.ativo === 0 || f.ativo === false) || !f.data) continue;
        const parts = String(f.data).split('T')[0].split('-');
        if (parts.length < 3) continue;
        const [ano_f, mes_f, dia_f] = parts;
        const isRecorrente = f.recorrente === 1 || f.recorrente === true;
        const alvoAno = isRecorrente ? ano : Number(ano_f);
        desligados.add(`${alvoAno}-${mes_f.padStart(2, '0')}-${dia_f.padStart(2, '0')}`);
    }

    // 1. Feriados móveis (Páscoa etc) — aplicam, exceto os desligados no cadastro
    for (const d of calcFeriadosMoveis(ano)) {
        const [y, m] = d.split('-');
        if (Number(y) === ano && Number(m) === mes && !desligados.has(d)) feriadoDates.add(d);
    }

    // 2. Feriados cadastrados em Gestão de Feriados (backend já filtra por empresa)
    for (const f of feriadosApi) {
        if (f.ativo === 0 || f.ativo === false) continue;
        if (!f.data) continue;
        const parts = String(f.data).split('T')[0].split('-');
        if (parts.length < 3) continue;
        const [ano_f, mes_f, dia_f] = parts;
        // Se recorrente, aplica o mes/dia no ano atual; senão usa data completa
        const isRecorrente = f.recorrente === 1 || f.recorrente === true;
        const alvoMes = Number(mes_f);
        const alvoAno = isRecorrente ? ano : Number(ano_f);
        if (alvoAno === ano && alvoMes === mes) {
            feriadoDates.add(`${ano}-${mes_f.padStart(2, '0')}-${dia_f.padStart(2, '0')}`);
        }
    }

    // 3. Varre o mês contando dias úteis vs DSR (domingos + feriados)
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let diasUteis = 0;
    let diasDsr = 0;
    for (let d = 1; d <= diasNoMes; d++) {
        const dateStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isDomingo = new Date(ano, mes - 1, d).getDay() === 0;
        const isFeriado = feriadoDates.has(dateStr);
        if (isDomingo || isFeriado) diasDsr++;
        else diasUteis++;
    }
    return { dias_uteis: diasUteis, dias_dsr: diasDsr };
}

/**
 * Soma os valor_total de todas as rubricas-fonte ativas (DSR_HE_CONFIG) de um funcionário
 * e aplica a fórmula: DSR = (totalHE / diasUteis) × diasDsr, arredondado p/ 2 casas.
 * Retorna 0,00 se diasUteis = 0 ou se nenhuma rubrica-fonte tiver valor.
 */
function calcDsrHe(
    funcionarioId: number,
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    diasUteis: number,
    diasDsr: number
): number {
    if (diasUteis === 0 || diasDsr === 0) return 0;

    const totalHE = DSR_HE_CONFIG
        .filter(cfg => cfg.ativo)
        .reduce((sum, cfg) => {
            const evento = eventos.find(e => e.codigo_evento === cfg.codigo_evento);
            if (!evento) return sum;
            const val = Number(lancamentos[`${funcionarioId}_${evento.id}`]?.valor_total || 0);
            return sum + val;
        }, 0);

    if (totalHE === 0) return 0;
    return Math.round(((totalHE / diasUteis) * diasDsr) * 100) / 100;
}

/**
 * Percorre todos os lançamentos e aplica calcDsrHe para cada funcionário.
 * Usado na troca de competência para recalcular rubrica 59 de todos.
 */
function recalcularDsrHeTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    diasUteis: number,
    diasDsr: number
): Record<string, Partial<Lancamento>> {
    const dsrEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.DSR_HE_DIURNAS);
    if (!dsrEvent) return lancamentos;

    // Coletar IDs únicos de funcionários presentes nos lançamentos
    const funcIds = new Set<number>();
    Object.keys(lancamentos).forEach(key => {
        const funcId = Number(key.split('_')[0]);
        if (!isNaN(funcId)) funcIds.add(funcId);
    });

    const result = { ...lancamentos };
    funcIds.forEach(funcId => {
        const valorDsr = calcDsrHe(funcId, lancamentos, eventos, diasUteis, diasDsr);
        const dsrKey = `${funcId}_${dsrEvent.id}`;
        result[dsrKey] = {
            funcionario_id: funcId,
            evento_id: dsrEvent.id,
            quantidade: 0,
            valor_unitario: 0,
            valor_total: valorDsr,
        };
    });
    return result;
}

/**
 * Recalcula INSS (rubrica 35) de UM funcionário usando a tabela progressiva
 * oficial 2026 (FAIXAS_INSS_2026 em utils/taxCalculations).
 * Base = soma dos lançamentos CREDITO com incide_inss != false (DSR 59 inclui).
 * v4.52.11.
 */
function recalcularINSSPara(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarioId: number,
    semINSS: boolean = false // Bem Vindo v1.2.0: estagiário não tem INSS (P20)
): Record<string, Partial<Lancamento>> {
    const inssEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.INSS);
    if (!inssEvent) return lancamentos;

    let baseINSS = 0;
    for (const ev of eventos) {
        if (ev.tipo !== 'CREDITO') continue;
        if (ev.incide_inss === false) continue;
        const lanc = lancamentos[`${funcionarioId}_${ev.id}`];
        baseINSS += Number(lanc?.valor_total || 0);
    }
    // Deduz Faltas (71) + Horas faltas (23, Bem Vindo v1.2.0) da base INSS
    baseINSS = Math.max(0, baseINSS - valorDescontoFaltas(lancamentos, eventos, funcionarioId));

    const inssKey = `${funcionarioId}_${inssEvent.id}`;
    if (baseINSS <= 0 || semINSS) {
        // Sem proventos: zera INSS (ou remove o lançamento)
        return {
            ...lancamentos,
            [inssKey]: {
                funcionario_id: funcionarioId,
                evento_id: inssEvent.id,
                quantidade: 0,
                valor_unitario: 0,
                valor_total: 0,
            },
        };
    }

    const { valor: inssValor, aliquotaEfetiva } = calcularINSS(baseINSS);
    return {
        ...lancamentos,
        [inssKey]: {
            funcionario_id: funcionarioId,
            evento_id: inssEvent.id,
            quantidade: 0,
            valor_unitario: aliquotaEfetiva,
            valor_total: inssValor,
        },
    };
}

/** Recalcula INSS para todos os funcionários presentes no estado de lançamentos. */
function recalcularINSSTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[] = []
): Record<string, Partial<Lancamento>> {
    const funcIds = new Set<number>();
    Object.keys(lancamentos).forEach(k => {
        const id = Number(k.split('_')[0]);
        if (!isNaN(id)) funcIds.add(id);
    });

    let result = lancamentos;
    funcIds.forEach(fid => {
        result = recalcularINSSPara(result, eventos, fid, isEstagiario(funcionarios, fid));
    });
    return result;
}

/**
 * v4.53.0: Recalcula IRRF (rubrica 1920) de UM funcionário usando a tabela progressiva
 * 2026 + Redutor Lei 15.270/2025 (isenção até R$ 5k).
 * Base = Σ proventos com incide_irrf != false − INSS descontado.
 * Aparece somente quando o salário cai na faixa tributável.
 */
function recalcularIRRFPara(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarioId: number,
    depIr: number = 0
): Record<string, Partial<Lancamento>> {
    const irrfEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.IRRF);
    if (!irrfEvent) return lancamentos;

    // Base = proventos com incide_irrf (exclui FGTS Visual 1900)
    let baseProventos = 0;
    for (const ev of eventos) {
        if (ev.tipo !== 'CREDITO') continue;
        if (ev.incide_irrf === false) continue;
        if (ev.codigo_evento === 1900) continue;
        const lanc = lancamentos[`${funcionarioId}_${ev.id}`];
        baseProventos += Number(lanc?.valor_total || 0);
    }

    // Deduz Faltas (71) + Horas faltas (23, Bem Vindo v1.2.0) da base IRRF
    baseProventos = Math.max(0, baseProventos - valorDescontoFaltas(lancamentos, eventos, funcionarioId));

    // INSS já calculado — passado ao calcularIRRF como dedução separada (redutor usa RTM)
    const inssEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.INSS);
    const inssVal = inssEvent
        ? Number(lancamentos[`${funcionarioId}_${inssEvent.id}`]?.valor_total || 0)
        : 0;

    const irrfKey = `${funcionarioId}_${irrfEvent.id}`;

    if (baseProventos <= 0) {
        return {
            ...lancamentos,
            [irrfKey]: {
                funcionario_id: funcionarioId,
                evento_id: irrfEvent.id,
                quantidade: 0,
                valor_unitario: 0,
                valor_total: 0,
            },
        };
    }

    // RTM = baseProventos (após faltas, antes de INSS); INSS deduzido internamente pelo calcularIRRF
    const { valor: irrfValor, faixa } = calcularIRRF(baseProventos, inssVal, depIr);

    return {
        ...lancamentos,
        [irrfKey]: {
            funcionario_id: funcionarioId,
            evento_id: irrfEvent.id,
            quantidade: 0,
            valor_unitario: faixa, // Alíquota efetiva (para exibição)
            valor_total: irrfValor,
        },
    };
}

/** v4.53.0: Recalcula IRRF para todos os funcionários presentes nos lançamentos. */
function recalcularIRRFTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[] = []
): Record<string, Partial<Lancamento>> {
    const funcIds = new Set<number>();
    Object.keys(lancamentos).forEach(k => {
        const id = Number(k.split('_')[0]);
        if (!isNaN(id)) funcIds.add(id);
    });
    let result = lancamentos;
    funcIds.forEach(fid => {
        const func = funcionarios.find(f => f.id === fid);
        result = recalcularIRRFPara(result, eventos, fid, func?.dep_ir ?? 0);
    });
    return result;
}

/**
 * v4.52.21: Recalcula FGTS Visual (1900) para todos os funcionários.
 * É uma rubrica informativa que não afeta o líquido do funcionário.
 * Baseada no 8% da base de incidência de FGTS.
 */
function recalcularFGTSTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[] = []
): Record<string, Partial<Lancamento>> {
    const fgtsVisualEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.FGTS_VISUAL);
    if (!fgtsVisualEvent) return lancamentos;

    const funcIds = new Set<number>();
    Object.keys(lancamentos).forEach(k => {
        const id = Number(k.split('_')[0]);
        if (!isNaN(id)) funcIds.add(id);
    });

    const result = { ...lancamentos };
    funcIds.forEach(fid => {
        // Filtra lançamentos apenas deste funcionário para calcular a base
        const empLancs = Object.keys(result)
            .filter(k => k.startsWith(`${fid}_`))
            .map(k => result[k]);

        // Bem Vindo v1.2.0: faltas (71) e horas faltas (23) reduzem a base; estagiário não tem FGTS (P20)
        const baseFGTS = isEstagiario(funcionarios, fid)
            ? 0
            : Math.max(0, calcularBaseIncidencia(empLancs, eventos, 'fgts') - valorDescontoFaltas(result, eventos, fid));
        const fgtsVal = calcularFGTS(baseFGTS);

        const key = `${fid}_${fgtsVisualEvent.id}`;
        result[key] = {
            ...result[key],
            funcionario_id: fid,
            evento_id: fgtsVisualEvent.id,
            quantidade: 8,
            valor_unitario: baseFGTS,
            valor_total: fgtsVal,
        };
    });
    return result;
}

/**
 * Calcula o salário proporcional aos dias trabalhados quando a admissão cai
 * dentro do mês/ano da competência. Fórmula CLT (mês comercial de 30 dias):
 *   dias_trabalhados = 30 - dia_admissao + 1
 *   salario_propor   = salario_base × dias_trabalhados / 30
 * Se admissão for em mês diferente da competência, retorna o salário integral.
 * v4.52.10.
 */
function calcSalarioProporcional(
    salarioBase: number,
    dataAdmissao: string | undefined,
    compMes: number,
    compAno: number
): number {
    if (!dataAdmissao || compMes <= 0 || salarioBase <= 0) return salarioBase;
    const parts = String(dataAdmissao).split('T')[0].split('-');
    if (parts.length < 3) return salarioBase;
    const admAno = Number(parts[0]);
    const admMes = Number(parts[1]);
    const admDia = Number(parts[2]);
    if (admAno !== compAno || admMes !== compMes) return salarioBase;
    const diasTrabalhados = Math.max(0, Math.min(30, 30 - admDia + 1));
    return Math.round((salarioBase * diasTrabalhados / 30) * 100) / 100;
}

/**
 * Força rubrica 33 (Salário) com funcionario.salario_base do cadastro.
 * v4.52.0: salário vira campo do cadastro — rubrica 33 é travada no grid.
 * v4.52.10: aplica proporcionalidade aos dias trabalhados se a admissão cair
 *   dentro do mês/ano da competência.
 * Aplica apenas em competências ABERTAS; fechadas preservam snapshot histórico.
 */
function aplicarSalarioBaseFuncionarios(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[],
    competenciaAberta: boolean,
    competencia?: { mes: number; ano: number } | null
): Record<string, Partial<Lancamento>> {
    if (!competenciaAberta) return lancamentos; // Fechada: não sobrescreve
    const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
    if (!salaryEvent) return lancamentos;

    const compMes = competencia?.mes || 0;
    const compAno = competencia?.ano || 0;

    const result = { ...lancamentos };
    funcionarios.forEach(f => {
        const salarioInteiro = Number(f.salario_base || 0);
        if (salarioInteiro <= 0) return; // Sem salario_base cadastrado: mantém o valor atual do lançamento
        const salario = calcSalarioProporcional(salarioInteiro, f.data_admissao, compMes, compAno);
        const key = `${f.id}_${salaryEvent.id}`;
        result[key] = {
            funcionario_id: f.id,
            evento_id: salaryEvent.id,
            quantidade: 0,
            valor_unitario: salario,
            valor_total: salario,
        };
    });
    return result;
}

/**
 * v4.52.20: Injeta os valores das rúbricas do cadastro do funcionário nos lançamentos.
 * Rubricas percentuais (62, 833, 1000): seta a `quantidade` (%) e deixa o recalc existente calcular valor_total.
 * Rubricas de valor fixo (936, 4004): seta `valor_total` diretamente.
 * Aplica apenas em competências ABERTAS; fechadas preservam snapshot histórico.
 */
function aplicarRubricasCadastroFuncionarios(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[],
    competenciaAberta: boolean
): Record<string, Partial<Lancamento>> {
    if (!competenciaAberta) return lancamentos;

    const insalubEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.INSALUBRIDADE);
    const assidEvent   = eventos.find(e => e.codigo_evento === EVENT_CODES.ASSIDUIDADE);
    const adicTSEvent  = eventos.find(e => e.codigo_evento === EVENT_CODES.ADICIONAL_TEMPO_SERVICO);
    const mensSindEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.MENSALIDADE_SINDICAL);
    const emprestimoEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.EMPRESTIMO_CONSIGNADO);
    const gratFuncaoEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.GRATIFICACAO_FUNCAO);
    const vtEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.VT_DESCONTO);

    const result = { ...lancamentos };
    funcionarios.forEach(f => {
        // Insalubridade (62): percentual sobre Salário Mínimo
        if (insalubEvent) {
            const perc = Number(f.insalubridade_perc ?? 0); // Bem Vindo v1.1.0: sem % no cadastro = sem insalubridade
            const key = `${f.id}_${insalubEvent.id}`;
            const existing = result[key] || {};
            result[key] = {
                ...existing,
                funcionario_id: f.id,
                evento_id: insalubEvent.id,
                quantidade: perc,
            };
        }

        // Assiduidade (833): percentual sobre Salário Base
        if (assidEvent) {
            const perc = Number(f.assiduidade_perc ?? 0); // Bem Vindo v1.1.0: sem % no cadastro = sem assiduidade
            const key = `${f.id}_${assidEvent.id}`;
            const existing = result[key] || {};
            result[key] = {
                ...existing,
                funcionario_id: f.id,
                evento_id: assidEvent.id,
                quantidade: perc,
            };
        }

        // Adicional Tempo de Serviço (1000): percentual sobre Salário Base
        if (adicTSEvent) {
            const perc = Number(f.adic_tempo_servico_perc ?? 0);
            const key = `${f.id}_${adicTSEvent.id}`;
            const existing = result[key] || {};
            result[key] = {
                ...existing,
                funcionario_id: f.id,
                evento_id: adicTSEvent.id,
                quantidade: perc,
            };
        }

        // Mensalidade Sindical (936): valor fixo em R$
        if (mensSindEvent) {
            const val = Number(f.mensalidade_sindical ?? 0);
            const key = `${f.id}_${mensSindEvent.id}`;
            result[key] = {
                funcionario_id: f.id,
                evento_id: mensSindEvent.id,
                quantidade: 0,
                valor_unitario: val,
                valor_total: val,
            };
        }

        // Empréstimo Consignado (4004): valor fixo em R$
        if (emprestimoEvent) {
            const val = Number(f.emprestimo_consignado ?? 0);
            const key = `${f.id}_${emprestimoEvent.id}`;
            result[key] = {
                funcionario_id: f.id,
                evento_id: emprestimoEvent.id,
                quantidade: 0,
                valor_unitario: val,
                valor_total: val,
            };
        }

        // Bem Vindo v1.2.0: Gratificação de função (82) e desconto do VT (816) — % do cadastro;
        // o valor é calculado na cascata. (A Gratificação 88 da Frimelo não é usada no Bem Vindo.)
        const percCadastro: Array<[EventoFolha | undefined, number]> = [
            [gratFuncaoEvent, Number(f.gratificacao_funcao_perc ?? 0)],
            [vtEvent, Number(f.vt_desconto_perc ?? 0)],
        ];
        percCadastro.forEach(([ev, perc]) => {
            if (!ev) return;
            const key = `${f.id}_${ev.id}`;
            result[key] = { ...(result[key] || {}), funcionario_id: f.id, evento_id: ev.id, quantidade: perc };
        });
    });
    return result;
}
/**
 * Recalcula Insalubridade (62) para todos os funcionários usando (Salário Mínimo − Faltas) como base.
 * Chamado após carregar dados do banco, garante que faltas já pagas reduzam a base da insalubridade.
 */
function recalcularInsalubridadeTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[]
): Record<string, Partial<Lancamento>> {
    const insalubEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.INSALUBRIDADE);
    const faltasEvent  = eventos.find(e => e.codigo_evento === EVENT_CODES.FALTAS);
    if (!insalubEvent) return lancamentos;

    const result = { ...lancamentos };
    Object.keys(lancamentos).forEach(k => {
        const [funcIdStr, evIdStr] = k.split('_');
        if (Number(evIdStr) !== insalubEvent.id) return;
        const funcId = Number(funcIdStr);
        const insalubData = lancamentos[k];
        const insalubQtd = insalubData?.quantidade || 0;
        if (insalubQtd <= 0) return;
        const faltasVal = faltasEvent ? Number(lancamentos[`${funcId}_${faltasEvent.id}`]?.valor_total || 0) : 0;
        const baseInsalub = Math.max(0, SALARIO_MINIMO_2026 - faltasVal);
        const newValUnit  = baseInsalub / 100;
        const newValTotal = Math.round((insalubQtd * newValUnit) * 100) / 100;
        result[k] = { ...insalubData, valor_unitario: newValUnit, valor_total: newValTotal };
    });
    return result;
}

/**
 * Recalcula uma rubrica percentual usando o Salário (rubrica 33) como base.
 * Fórmula: valor_unitario = salário / 100; valor_total = quantidade(%) × valor_unitario.
 * Usado por Assiduidade (833) e Adicional Tempo de Serviço (1000) — v4.52.5/v4.52.7.
 */
function recalcularPercentualSobreSalarioTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    codigoEvento: number
): Record<string, Partial<Lancamento>> {
    const evt = eventos.find(e => e.codigo_evento === codigoEvento);
    const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
    if (!evt || !salaryEvent) return lancamentos;

    const result = { ...lancamentos };
    Object.keys(lancamentos).forEach(k => {
        const [funcIdStr, evIdStr] = k.split('_');
        if (Number(evIdStr) !== evt.id) return;
        const funcId = Number(funcIdStr);
        const data = lancamentos[k];
        const qtd = Number(data?.quantidade || 0);
        // Quantidade zerada — zera valor_total (não deixa stale)
        if (qtd <= 0) {
            result[k] = { ...data, valor_unitario: 0, valor_total: 0 };
            return;
        }
        const salaryVal = Number(lancamentos[`${funcId}_${salaryEvent.id}`]?.valor_total || 0);
        if (salaryVal <= 0) return;
        const newValUnit = salaryVal / 100;
        const newValTotal = Math.round((qtd * newValUnit) * 100) / 100;
        result[k] = { ...data, valor_unitario: newValUnit, valor_total: newValTotal };
    });
    return result;
}

/**
 * Assiduidade (833) — calcula o percentual sobre salário e aplica as regras de PERDA.
 * O funcionário PERDE a assiduidade (valor zerado) na competência quando:
 *   (a) tem Faltas (71) preenchidas, OU
 *   (b) apresentou atestado (funcionario_id presente em `atestados`).
 * v4.54.0.
 */
function recalcularAssiduidadeTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    atestados: Set<number> = new Set()
): Record<string, Partial<Lancamento>> {
    // 1. Cálculo normal do percentual sobre salário
    const result = recalcularPercentualSobreSalarioTodos(lancamentos, eventos, EVENT_CODES.ASSIDUIDADE);

    // 2. Aplica perda de assiduidade (faltas OU atestado)
    const assidEvent  = eventos.find(e => e.codigo_evento === EVENT_CODES.ASSIDUIDADE);
    const faltasEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.FALTAS);
    if (!assidEvent) return result;

    Object.keys(result).forEach(k => {
        const [funcIdStr, evIdStr] = k.split('_');
        if (Number(evIdStr) !== assidEvent.id) return;
        const funcId = Number(funcIdStr);
        const faltasData = faltasEvent ? result[`${funcId}_${faltasEvent.id}`] : undefined;
        const temFaltas   = Number(faltasData?.quantidade || 0) > 0 || Number(faltasData?.valor_total || 0) > 0;
        const temAtestado = atestados.has(funcId);
        if (temFaltas || temAtestado) {
            result[k] = { ...result[k], valor_total: 0 };
        }
    });
    return result;
}

/** Atalho para Adicional Tempo de Serviço (1000) — v4.52.7. */
function recalcularAdicionalTempoServicoTodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[]
): Record<string, Partial<Lancamento>> {
    return recalcularPercentualSobreSalarioTodos(lancamentos, eventos, EVENT_CODES.ADICIONAL_TEMPO_SERVICO);
}

/**
 * Base da HE (49 e 37) = Salário (33) + Gratificação de função (82) + Insalubridade (62).
 * `insalubOverride` permite usar o valor recém-recalculado da insalubridade nas cascatas.
 * v4.54.1: Gratificação passa a compor a base. Bem Vindo v1.2.0: a gratificação é a 82 (não a 88).
 */
function calcBaseHE(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcId: number,
    insalubOverride?: number
): number {
    const valorRubrica = (codigo: number): number => {
        const ev = eventos.find(e => e.codigo_evento === codigo);
        return ev ? Number(lancamentos[`${funcId}_${ev.id}`]?.valor_total || 0) : 0;
    };
    const insalubVal = insalubOverride ?? valorRubrica(EVENT_CODES.INSALUBRIDADE);
    return valorRubrica(EVENT_CODES.SALARIO) + valorRubrica(EVENT_CODES.GRATIFICACAO_FUNCAO) + insalubVal;
}

/**
 * Recalcula uma rubrica de HE para todos os funcionários: base (calcBaseHE) ÷ 220 × multiplicador × horas.
 * Padrão: HE 100% (49, ×2). Bem Vindo v1.2.0: também HE 60% (37, ×1,6).
 */
function recalcularHETodos(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    codigoHE: number = EVENT_CODES.HORAS_EXTRAS_100,
    multiplicador: number = OVERTIME_100_MULTIPLIER
): Record<string, Partial<Lancamento>> {
    const heEvent = eventos.find(e => e.codigo_evento === codigoHE);
    const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
    if (!heEvent || !salaryEvent) return lancamentos;

    const result = { ...lancamentos };
    Object.keys(lancamentos).forEach(k => {
        const [funcIdStr, evIdStr] = k.split('_');
        if (Number(evIdStr) !== heEvent.id) return;
        const funcId = Number(funcIdStr);
        const heData = lancamentos[k];
        const heQtd = Number(heData?.quantidade || 0);
        const baseHE = calcBaseHE(lancamentos, eventos, funcId);
        if (baseHE <= 0) return;
        // Sempre recalcula valor_unitario (corrige base stale independente de qty)
        const newValUnit = (baseHE / MONTHLY_WORKING_HOURS) * multiplicador;
        const newValTotal = Math.round((heQtd * newValUnit) * 100) / 100;
        result[k] = { ...heData, valor_unitario: newValUnit, valor_total: newValTotal };
    });
    return result;
}

/**
 * Executa a cascata COMPLETA de recálculo da folha, na ordem correta:
 * Assiduidade → AdicTempoServiço → Grat.Função → Insalubridade → HorasFaltas → HE 100%/60% → DSR → VT → INSS → IRRF → FGTS.
 * Centraliza a cadeia que antes era duplicada em init/handleCompChange/save/toggle.
 * v4.54.0.
 *
 * Competência FECHADA: exibe exatamente o snapshot salvo no banco. Só as rubricas
 * virtuais (nunca persistidas) são calculadas: DSR s/ HE (59) e FGTS Visual (1900).
 * v4.54.1.
 */
function recalcularCascataCompleta(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[],
    diasUteis: number,
    diasDsr: number,
    atestados: Set<number> = new Set(),
    competenciaAberta: boolean = true
): Record<string, Partial<Lancamento>> {
    if (!competenciaAberta) {
        return recalcularFGTSTodos(recalcularDsrHeTodos(lancamentos, eventos, diasUteis, diasDsr), eventos, funcionarios);
    }
    // Bem Vindo v1.2.0: + Gratificação de função (82), Horas faltas (23), HE 60% (37) e desconto do VT (816)
    let r = recalcularAssiduidadeTodos(lancamentos, eventos, atestados);
    r = recalcularAdicionalTempoServicoTodos(r, eventos);
    r = recalcularPercentualSobreSalarioTodos(r, eventos, EVENT_CODES.GRATIFICACAO_FUNCAO);
    r = recalcularInsalubridadeTodos(r, eventos);
    r = recalcularHorasFaltasTodos(r, eventos);
    r = recalcularHETodos(r, eventos, EVENT_CODES.HORAS_EXTRAS_100, OVERTIME_100_MULTIPLIER);
    r = recalcularHETodos(r, eventos, EVENT_CODES.HORAS_EXTRAS_60, OVERTIME_60_MULTIPLIER);
    r = recalcularDsrHeTodos(r, eventos, diasUteis, diasDsr);
    r = recalcularValeTransporteTodos(r, eventos, funcionarios);
    r = recalcularINSSTodos(r, eventos, funcionarios);
    r = recalcularIRRFTodos(r, eventos, funcionarios);
    return recalcularFGTSTodos(r, eventos, funcionarios);
}

/**
 * Filtra funcionários visíveis conforme o status da competência.
 * Competência ABERTA → oculta DESLIGADOS (não entram em novos lançamentos).
 * Competência FECHADA → mantém todos (snapshot histórico/legal preservado).
 * v4.54.0.
 */
function filtrarVisiveis(funcionarios: Funcionario[], competenciaAberta: boolean): Funcionario[] {
    if (!competenciaAberta) return funcionarios;
    return funcionarios.filter(f => f.status !== StatusFuncionario.DESLIGADO);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bem Vindo v1.3.0: cadeia completa de cálculo de uma competência (a mesma do grid).
 * salário do cadastro → rubricas do cadastro → cascata. Usada pelo grid e pelos relatórios,
 * para que os relatórios mostrem exatamente os valores da tela (inclusive DSR 59, que não é salvo).
 */
export function calcularFolhaCompetencia(
    lancamentos: Record<string, Partial<Lancamento>>,
    eventos: EventoFolha[],
    funcionarios: Funcionario[],
    competencia: Competencia,
    dias: { dias_uteis: number; dias_dsr: number },
    atestados: Set<number>
): { funcionarios: Funcionario[]; lancamentos: Record<string, Partial<Lancamento>> } {
    const compAberta = competencia.status === StatusCompetencia.ABERTA;
    const funcsCalc = filtrarVisiveis(funcionarios, compAberta);
    const comSalario = aplicarSalarioBaseFuncionarios(lancamentos, eventos, funcsCalc, compAberta, competencia);
    const comRubricas = aplicarRubricasCadastroFuncionarios(comSalario, eventos, funcsCalc, compAberta);
    return {
        funcionarios: funcsCalc,
        lancamentos: recalcularCascataCompleta(comRubricas, eventos, funcsCalc, dias.dias_uteis, dias.dias_dsr, atestados, compAberta),
    };
}

export const usePayrollData = () => {
    const { selectedCompanyId, user } = useAuth();
    // Bem Vindo v1.4.0: só lança quem não é perfil de consulta, e só na etapa ABERTA (status ABERTA)
    const perfilSomenteLeitura = ehSomenteLeitura(user?.perfil);
    const [competencias, setCompetencias] = useState<Competencia[]>([]);
    const [selectedComp, setSelectedComp] = useState<Competencia | null>(null);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [eventos, setEventos] = useState<EventoFolha[]>([]);
    const [lancamentos, setLancamentos] = useState<Record<string, Partial<Lancamento>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    // Dias do calendário da competência atual (carregados do backend ou calculados localmente)
    const [diasCalendario, setDiasCalendario] = useState<{ dias_uteis: number; dias_dsr: number }>({ dias_uteis: 0, dias_dsr: 0 });
    // Feriados cadastrados em Gestão de Feriados — usados no cálculo local de dias_uteis/dias_dsr
    const [feriados, setFeriados] = useState<Array<{ data: string; recorrente?: number | boolean; ativo?: number | boolean; tipo?: string; uf?: string; cidade?: string }>>([]);
    // v4.54.0: funcionarios com atestado na competência atual → perdem Assiduidade (833)
    const [atestados, setAtestados] = useState<Set<number>>(new Set());
    // Bem Vindo v1.1.0: dias de cada atestado (só informativo p/ a contabilidade; não entra no cálculo)
    const [atestadoDias, setAtestadoDias] = useState<Record<number, number | null>>({});
    // v4.55.0: edições no grid ainda não persistidas (aviso ao sair/trocar competência)
    const [isDirty, setIsDirty] = useState(false);
    const lancamentosRef = useRef(lancamentos);
    lancamentosRef.current = lancamentos;

    // Helper para mapear array de lançamentos em Record por chave
    const mapLancamentos = (lancsData: Lancamento[]): Record<string, Partial<Lancamento>> => {
        const mapped: Record<string, Partial<Lancamento>> = {};
        lancsData.forEach(l => {
            mapped[`${l.funcionario_id}_${l.evento_id}`] = l;
        });
        return mapped;
    };

    // Carregar dados iniciais
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            setLoadError(null);
            setIsDirty(false);
            try {
                const [comps, funcs, evs, ferRes] = await Promise.all([
                    api.getCompetencias(),
                    api.getFuncionarios(),
                    api.getEventos(),
                    api.getHolidays().catch(() => ({ data: [] }))
                ]);

                setCompetencias(comps);
                setFuncionarios(funcs);
                const ferList = Array.isArray(ferRes) ? ferRes : (ferRes?.data ?? []);
                setFeriados(ferList);

                // Ordenar eventos por ordem de exportação
                // Bem Vindo v1.2.0: rubrica desativada (ex.: Gratificação 88) não aparece no grid
                let sortedEvs = evs.filter(e => e.ativo === undefined || Number(e.ativo) !== 0).sort((a, b) => (a.ordem_exportacao || 0) - (b.ordem_exportacao || 0));

                // v4.53.0: Forçar IRRF (1920) logo após o INSS (35)
                const irrfIdx = sortedEvs.findIndex(e => Number(e.codigo_evento) === 1920);
                if (irrfIdx !== -1) {
                    const irrfEv = sortedEvs.splice(irrfIdx, 1)[0];
                    const inssIdx = sortedEvs.findIndex(e => Number(e.codigo_evento) === 35);
                    if (inssIdx !== -1) {
                        sortedEvs.splice(inssIdx + 1, 0, irrfEv);
                    } else {
                        sortedEvs.push(irrfEv);
                    }
                }

                // v4.53.0: Forçar FGTS Visual (1900) logo após IRRF (1920) ou INSS (35)
                const fgtsVisualIdx = sortedEvs.findIndex(e => Number(e.codigo_evento) === 1900);
                if (fgtsVisualIdx !== -1) {
                    const fgtsVisualEv = sortedEvs.splice(fgtsVisualIdx, 1)[0];
                    const afterIdx = sortedEvs.findIndex(e => Number(e.codigo_evento) === 1920);
                    const fallbackIdx = sortedEvs.findIndex(e => Number(e.codigo_evento) === 35);
                    const insertAfter = afterIdx !== -1 ? afterIdx : fallbackIdx;
                    if (insertAfter !== -1) {
                        sortedEvs.splice(insertAfter + 1, 0, fgtsVisualEv);
                    } else {
                        sortedEvs.push(fgtsVisualEv);
                    }
                }
                setEventos(sortedEvs);

                if (comps.length > 0) {
                    const savedId = sessionStorage.getItem('selectedCompId');
                    const initialId = savedId && comps.find(c => c.id === Number(savedId))
                        ? Number(savedId)
                        : comps[0].id;

                    const comp = comps.find(c => c.id === initialId) || comps[0];
                    setSelectedComp(comp);
                    sessionStorage.setItem('selectedCompId', comp.id.toString());

                    try {
                        const [lancsData, dias, atestList] = await Promise.all([
                            api.getLancamentos(comp.id),
                            api.calcularDiasUteisMes(comp.id).catch(() => null),
                            api.getAtestados(comp.id).catch(() => ({ ids: [] as number[], dias: {} }))
                        ]);
                        const atestSet = new Set<number>(atestList.ids);
                        setAtestados(atestSet);
                        setAtestadoDias(atestList.dias);

                        // Fonte primária: backend (considera UF/cidade/móveis + feriados DB).
                        // Fallback: cálculo local com feriados vindos de Gestão de Feriados + móveis.
                        const newDias = dias ?? calcDiasComFeriados(comp.mes, comp.ano, ferList);
                        setDiasCalendario({ dias_uteis: newDias.dias_uteis, dias_dsr: newDias.dias_dsr });

                        // Aplica salario_base → r33 (só em comp ABERTA, com proporcionalidade na admissão) → RubricasCadastro → cascata completa
                        // v4.54.0: DESLIGADOS ficam fora da injeção/cálculo em comp ABERTA.
                        setLancamentos(calcularFolhaCompetencia(mapLancamentos(lancsData), sortedEvs, funcs, comp, newDias, atestSet).lancamentos);

                        // DEBUG: útil para confirmar que feriados estão sendo considerados
                        console.debug('[DSR] dias_uteis=', newDias.dias_uteis, 'dias_dsr=', newDias.dias_dsr, 'fonte=', dias ? 'backend' : 'local+feriados', 'feriados=', ferList.length, 'atestados=', atestSet.size);
                    } catch (err: any) {
                        setLoadError(err.message || 'Falha ao carregar lançamentos do servidor.');
                    }
                }
            } catch (err: any) {
                setLoadError(err.message || 'Falha ao carregar dados iniciais.');
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [selectedCompanyId]);

    // Mudar competência
    const handleCompChange = useCallback(async (compId: number) => {
        if (!(await confirmarDescarteAlteracoes())) return;
        setIsDirty(false);
        const comp = competencias.find(c => c.id === compId) || null;
        setSelectedComp(comp);
        if (comp) {
            sessionStorage.setItem('selectedCompId', comp.id.toString());
            const [data, dias, atestList] = await Promise.all([
                api.getLancamentos(comp.id),
                api.calcularDiasUteisMes(comp.id).catch(() => null),
                api.getAtestados(comp.id).catch(() => ({ ids: [] as number[], dias: {} }))
            ]);
            const atestSet = new Set<number>(atestList.ids);
            setAtestados(atestSet);
            setAtestadoDias(atestList.dias);

            const newDias = dias ?? calcDiasComFeriados(comp.mes, comp.ano, feriados);
            setDiasCalendario({ dias_uteis: newDias.dias_uteis, dias_dsr: newDias.dias_dsr });

            const mapped: Record<string, Partial<Lancamento>> = {};
            data.forEach(l => {
                mapped[`${l.funcionario_id}_${l.evento_id}`] = l;
            });
            // Aplica salario_base → r33 → RubricasCadastro → cascata completa (v4.54.0: desligados fora em comp aberta)
            setLancamentos(calcularFolhaCompetencia(mapped, eventos, funcionarios, comp, newDias, atestSet).lancamentos);

            console.debug('[DSR] troca comp → dias_uteis=', newDias.dias_uteis, 'dias_dsr=', newDias.dias_dsr, 'fonte=', dias ? 'backend' : 'local+feriados');
        }
    }, [competencias, eventos, funcionarios, feriados]);

    // Atualizar lançamento com cálculos automáticos
    const updateLancamento = useCallback((
        funcionarioId: number,
        eventoId: number,
        field: keyof Lancamento,
        value: string
    ) => {
        // v4.52.0: rubrica 33 (Salário) é travada — alterações só via cadastro do funcionário
        // v4.52.11: rubrica 35 (INSS) é travada — sempre auto-calculada pela tabela progressiva
        // v4.52.20: rubricas do cadastro (62, 833, 1000, 936, 4004) são travadas
        if (perfilSomenteLeitura || selectedComp?.status !== StatusCompetencia.ABERTA) return;
        const eventBeingEdited = eventos.find(e => e.id === eventoId);
        const lockedCodes: number[] = [
            EVENT_CODES.SALARIO, EVENT_CODES.INSS,
            EVENT_CODES.IRRF,
            EVENT_CODES.INSALUBRIDADE, EVENT_CODES.ASSIDUIDADE, EVENT_CODES.ADICIONAL_TEMPO_SERVICO,
            EVENT_CODES.MENSALIDADE_SINDICAL, EVENT_CODES.EMPRESTIMO_CONSIGNADO,
            EVENT_CODES.FGTS_VISUAL, EVENT_CODES.GRATIFICACAO,
            EVENT_CODES.GRATIFICACAO_FUNCAO, EVENT_CODES.VT_DESCONTO, // Bem Vindo v1.2.0: % no cadastro
        ];
        if (eventBeingEdited && lockedCodes.includes(eventBeingEdited.codigo_evento)) {
            return; // Ignora silenciosamente; UI deve bloquear o input
        }

        const rawValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
        const numValue = parseFloat(rawValue) || 0;
        const key = `${funcionarioId}_${eventoId}`;
        if (Number(lancamentosRef.current[key]?.[field] || 0) !== numValue) setIsDirty(true);

        setLancamentos(prev => {
            const current = prev[key] || { funcionario_id: funcionarioId, evento_id: eventoId, quantidade: 0, valor_unitario: 0, valor_total: 0 };
            const updated = {
                ...current,
                [field]: numValue,
                // Garantir que campos numéricos sejam números
                quantidade: Number(field === 'quantidade' ? numValue : (current.quantidade || 0)),
                valor_unitario: Number(field === 'valor_unitario' ? numValue : (current.valor_unitario || 0)),
                valor_total: Number(field === 'valor_total' ? numValue : (current.valor_total || 0))
            };

            const event = eventos.find(e => e.id === eventoId);

            // AUTO-CALC: Horas Extras 100% (Código 49) — Base: Salário (33) + Gratificação (88) + Insalubridade (62)
            if (event?.codigo_evento === EVENT_CODES.HORAS_EXTRAS_100 && field === 'quantidade') {
                const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
                if (salaryEvent) {
                    const baseHE = calcBaseHE(prev, eventos, funcionarioId);
                    if (baseHE > 0) {
                        updated.valor_unitario = (baseHE / MONTHLY_WORKING_HOURS) * OVERTIME_100_MULTIPLIER;
                    }
                }
            }

            // AUTO-CALC: Feriado Trabalhado (1080) e Faltas (71) - Base: Salário / 30
            if ((event?.codigo_evento === EVENT_CODES.FERIADO_TRABALHADO || event?.codigo_evento === EVENT_CODES.FALTAS) && field === 'quantidade') {
                const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
                if (salaryEvent) {
                    const salaryKey = `${funcionarioId}_${salaryEvent.id}`;
                    const salaryVal = Number(prev[salaryKey]?.valor_total || 0);
                    if (salaryVal > 0) {
                        updated.valor_unitario = salaryVal / 30;
                    }
                }
            }

            // AUTO-CALC: Insalubridade (62) — Base: (Salário Mínimo 2026 − Faltas) / 100
            if (event?.codigo_evento === EVENT_CODES.INSALUBRIDADE && field === 'quantidade') {
                const faltasEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.FALTAS);
                const faltasVal   = faltasEvent ? Number(prev[`${funcionarioId}_${faltasEvent.id}`]?.valor_total || 0) : 0;
                const baseInsalub = Math.max(0, SALARIO_MINIMO_2026 - faltasVal);
                updated.valor_unitario = baseInsalub / 100;
            }

            // AUTO-CALC: Assiduidade (833) — v4.52.5: Base = Salário do funcionário (rubrica 33)
            if (event?.codigo_evento === EVENT_CODES.ASSIDUIDADE && field === 'quantidade') {
                const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
                const salaryVal = salaryEvent ? Number(prev[`${funcionarioId}_${salaryEvent.id}`]?.valor_total || 0) : 0;
                updated.valor_unitario = salaryVal / 100;
            }

            // AUTO-CALC: Adicional Tempo de Serviço (1000) — v4.52.7: Base = Salário do funcionário (rubrica 33)
            if (event?.codigo_evento === EVENT_CODES.ADICIONAL_TEMPO_SERVICO && field === 'quantidade') {
                const salaryEvent = eventos.find(e => e.codigo_evento === EVENT_CODES.SALARIO);
                const salaryVal = salaryEvent ? Number(prev[`${funcionarioId}_${salaryEvent.id}`]?.valor_total || 0) : 0;
                updated.valor_unitario = salaryVal / 100;
            }

            // Calcular valor total para eventos que não são de valor fixo
            if (event?.unidade !== Unidade.VALOR) {
                updated.valor_total = Math.round((updated.quantidade * updated.valor_unitario) * 100) / 100;
            }

            // CASCADE (Bem Vindo v1.2.0): roda a cascata completa — a mesma da carga e do salvar —
            // em vez de repetir partes dela aqui (faltas → assiduidade/insalubridade/VT, HE 100%/60% → DSR,
            // horas faltas, INSS, IRRF, FGTS). Só competência ABERTA é editável.
            const stateB = { ...prev, [key]: updated };
            return recalcularCascataCompleta(stateB, eventos, funcionarios, diasCalendario.dias_uteis, diasCalendario.dias_dsr, atestados, true);
        });
    }, [eventos, funcionarios, diasCalendario, atestados, selectedComp, perfilSomenteLeitura]);

    // Salvar todos os lançamentos
    const handleSave = useCallback(async (): Promise<boolean> => {
        if (!selectedComp) return false;
        setIsSaving(true);
        try {
            // v4.53.6: força recálculo completo antes de persistir — garante que HE, INSS, IRRF
            // salvos no banco reflitam a cascata correta (evita stale values de versões antigas)
            const compAberta = selectedComp.status === StatusCompetencia.ABERTA;
            const funcsCalc = filtrarVisiveis(funcionarios, compAberta);
            const comRubricasPreSave = aplicarRubricasCadastroFuncionarios(lancamentos, eventos, funcsCalc, compAberta);
            const lancamentosParaSalvar = recalcularCascataCompleta(comRubricasPreSave, eventos, funcsCalc, diasCalendario.dias_uteis, diasCalendario.dias_dsr, atestados, compAberta);

            const itemsToSave = Object.keys(lancamentosParaSalvar)
                .filter(key => {
                    const data = lancamentosParaSalvar[key];
                    const ev = eventos.find(e => e.id === data.evento_id);
                    // v4.52.23: NUNCA salva o FGTS Visual (1900) no banco, pois ele é estritamente informativo/calculado em runtime
                    return Number(ev?.codigo_evento) !== EVENT_CODES.DSR_HE_DIURNAS && 
                           Number(ev?.codigo_evento) !== EVENT_CODES.FGTS_VISUAL;
                })
                .map(key => {
                    const data = lancamentosParaSalvar[key];
                    const ev = eventos.find(e => e.id === data.evento_id);
                    return {
                        funcionario_id: data.funcionario_id!,
                        evento_id: data.evento_id!,
                        competencia_id: selectedComp.id,
                        codigo_evento: ev?.codigo_evento ?? null,
                        quantidade: data.quantidade || 0,
                        valor_unitario: data.valor_unitario || 0,
                        valor_total: data.valor_total || 0
                    };
                });

            if (itemsToSave.length > 0) {
                await api.bulkSaveLancamentos(itemsToSave);
            }

            // Recarrega do banco e reaplica salario_base → RubricasCadastro → cascata completa
            const freshData = await api.getLancamentos(selectedComp.id);
            const comSalario = aplicarSalarioBaseFuncionarios(mapLancamentos(freshData), eventos, funcsCalc, compAberta, selectedComp);
            const comRubricas = aplicarRubricasCadastroFuncionarios(comSalario, eventos, funcsCalc, compAberta);
            setLancamentos(recalcularCascataCompleta(comRubricas, eventos, funcsCalc, diasCalendario.dias_uteis, diasCalendario.dias_dsr, atestados, compAberta));

            setLastSaved(new Date());
            setIsDirty(false);
            return true;
        } catch (e: any) {
            throw e; // Lançar para o componente capturar a mensagem
        } finally {
            setIsSaving(false);
        }
    }, [selectedComp, lancamentos, eventos, funcionarios, diasCalendario, atestados]);

    // v4.55.0: só competência ABERTA pode ter pendência (FECHADA não salva)
    const temAlteracoesNaoSalvas = isDirty && selectedComp?.status === StatusCompetencia.ABERTA;

    // v4.55.0: publica pendência p/ menu/logout e avisa ao fechar/atualizar a aba
    const descricaoComp = selectedComp ? `${String(selectedComp.mes).padStart(2, '0')}/${selectedComp.ano}` : '';
    useEffect(() => {
        setAlteracoesPendentes(temAlteracoesNaoSalvas, descricaoComp);
        if (!temAlteracoesNaoSalvas) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = MENSAGEM_ALTERACOES_NAO_SALVAS; // navegadores exibem texto padrão próprio
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [temAlteracoesNaoSalvas, descricaoComp]);

    // v4.56.0: "Salvar e continuar" do diálogo usa o mesmo fluxo do botão Salvar
    useEffect(() => {
        registrarSalvamento(handleSave);
        return () => registrarSalvamento(null);
    }, [handleSave]);

    // Grid desmontado (navegação confirmada) → limpa registro global
    useEffect(() => () => setAlteracoesPendentes(false), []);

    // v4.54.0: funcionários visíveis conforme status da competência (DESLIGADO some em comp ABERTA)
    const funcionariosVisiveis = useMemo(
        () => filtrarVisiveis(funcionarios, selectedComp?.status === StatusCompetencia.ABERTA),
        [funcionarios, selectedComp]
    );

    // v4.54.0: liga/desliga atestado do funcionário na competência aberta → zera Assiduidade (833)
    const toggleAtestado = useCallback(async (funcionarioId: number) => {
        if (!selectedComp || selectedComp.status !== StatusCompetencia.ABERTA) return;
        const novoTem = !atestados.has(funcionarioId);
        const novoSet = new Set(atestados);
        if (novoTem) novoSet.add(funcionarioId); else novoSet.delete(funcionarioId);
        const funcsCalc = filtrarVisiveis(funcionarios, true);
        // Atualização otimista: novo set + recálculo (assiduidade → INSS/IRRF/FGTS)
        setAtestados(novoSet);
        if (!novoTem) setAtestadoDias(prev => ({ ...prev, [funcionarioId]: null })); // servidor apaga a linha (e os dias)
        setLancamentos(prev => recalcularCascataCompleta(prev, eventos, funcsCalc, diasCalendario.dias_uteis, diasCalendario.dias_dsr, novoSet));
        try {
            await api.setAtestado(funcionarioId, selectedComp.id, novoTem);
        } catch (e) {
            // Reverte em caso de erro
            setAtestados(atestados);
            setLancamentos(prev => recalcularCascataCompleta(prev, eventos, funcsCalc, diasCalendario.dias_uteis, diasCalendario.dias_dsr, atestados));
        }
    }, [selectedComp, atestados, funcionarios, eventos, diasCalendario]);

    // Bem Vindo v1.1.0: grava a quantidade de dias de um atestado já marcado (não recalcula nada:
    // a Assiduidade depende só de existir o atestado).
    const setDiasAtestado = useCallback(async (funcionarioId: number, dias: number | null) => {
        if (!selectedComp || selectedComp.status !== StatusCompetencia.ABERTA) return;
        if (!atestados.has(funcionarioId)) return;
        const anterior = atestadoDias[funcionarioId] ?? null;
        if (anterior === dias) return;
        setAtestadoDias(prev => ({ ...prev, [funcionarioId]: dias }));
        try {
            await api.setAtestado(funcionarioId, selectedComp.id, true, dias);
        } catch (e) {
            setAtestadoDias(prev => ({ ...prev, [funcionarioId]: anterior }));
        }
    }, [selectedComp, atestados, atestadoDias]);

    // Cálculo de totais por funcionário
    const totalsByFunc = useMemo((): Record<number, FuncTotals> => {
        const totals: Record<number, FuncTotals> = {};
        funcionariosVisiveis.forEach(f => {
            let proventos = 0;
            let descontos = 0;
            eventos.forEach(e => {
                // v4.52.23: Ignora FGTS Visual (1900) COMPLETAMENTE de qualquer totalização (seja provento ou desconto)
                if (Number(e.codigo_evento) === 1900 || Number(e.codigo_evento) === EVENT_CODES.FGTS_VISUAL) return;

                const rawVal = lancamentos[`${f.id}_${e.id}`]?.valor_total;
                const val = typeof rawVal === 'string' ? parseFloat(rawVal) : (typeof rawVal === 'number' ? rawVal : 0);

                if (e.tipo === 'CREDITO') proventos += (val || 0);
                // v4.52.23: Garante que apenas DEBITO some em descontos, ignorando INFORMATIVOS que poderiam cair no else
                else if (e.tipo === 'DEBITO') descontos += (val || 0);
            });
            totals[f.id] = { proventos, descontos };
        });
        return totals;
    }, [funcionariosVisiveis, eventos, lancamentos]);

    // Cálculo de totais globais
    const globalTotals = useMemo((): PayrollTotals => {
        let proventos = 0;
        let descontos = 0;
        Object.values(totalsByFunc).forEach((t: FuncTotals) => {
            proventos += (t.proventos || 0);
            descontos += (t.descontos || 0);
        });
        return { proventos, descontos, liquido: proventos - descontos };
    }, [totalsByFunc]);

    // Obter lançamentos de um funcionário
    const getLancamentosForEmployee = useCallback((empId: number): Partial<Lancamento>[] => {
        return Object.keys(lancamentos)
            .filter(k => k.startsWith(`${empId}_`))
            .map(k => lancamentos[k]);
    }, [lancamentos]);

    return {
        // Estado
        competencias,
        selectedComp,
        funcionarios: funcionariosVisiveis,
        eventos,
        lancamentos,
        isSaving,
        lastSaved,
        isLoading,
        loadError,
        atestados,
        atestadoDias,
        temAlteracoesNaoSalvas,

        // Totais calculados
        totalsByFunc,
        globalTotals,

        // Ações
        handleCompChange,
        updateLancamento,
        handleSave,
        getLancamentosForEmployee,
        toggleAtestado,
        setDiasAtestado,
    };
};
