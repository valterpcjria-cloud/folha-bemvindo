/**
 * Funções de Cálculo de Impostos e Encargos
 * INSS, FGTS, IRRF com tabelas progressivas
 */

import { EventoFolha, Lancamento } from '../types';

// Tipos para alíquotas
export interface FaixaINSS {
    faixa_inicio: number;
    faixa_fim: number;
    aliquota: number;
}

export interface FaixaIRRF {
    faixa_inicio: number;
    faixa_fim: number;
    aliquota: number;
    parcela_deduzir: number;
}

export interface ParametrosFiscais {
    TETO_INSS: number;
    ALIQUOTA_FGTS: number;
    FAIXA_ISENCAO_IRRF: number;
    VALOR_DEDUCAO_DEPENDENTE: number;
}

// Tabela INSS 2026 (Salário Mínimo R$ 1.621,00, Teto R$ 8.475,55)
// Faixas conforme Portaria Interministerial MPS/MF nº 13/2026 - Valores oficiais e contínuos
export const FAIXAS_INSS_2026: FaixaINSS[] = [
    { faixa_inicio: 0, faixa_fim: 1621.00, aliquota: 7.5 },        // Sem dedução
    { faixa_inicio: 1621.00, faixa_fim: 2902.84, aliquota: 9.0 },  // Parcela deduzir: R$ 24,32
    { faixa_inicio: 2902.84, faixa_fim: 4354.27, aliquota: 12.0 }, // Parcela deduzir: R$ 111,41
    { faixa_inicio: 4354.27, faixa_fim: 8475.55, aliquota: 14.0 }, // Parcela deduzir: R$ 198,49
];

// Tabela IRRF 2026 (Baseada na Lei 15.270/2025)
// Nota: Esta é a tabela base. A isenção de R$ 5k é aplicada via Redutor de IR no cálculo final.
export const FAIXAS_IRRF_2026: FaixaIRRF[] = [
    { faixa_inicio: 0, faixa_fim: 2428.80, aliquota: 0, parcela_deduzir: 0 },
    { faixa_inicio: 2428.80, faixa_fim: 2826.65, aliquota: 7.5, parcela_deduzir: 182.16 },
    { faixa_inicio: 2826.65, faixa_fim: 3751.05, aliquota: 15.0, parcela_deduzir: 394.16 },
    { faixa_inicio: 3751.05, faixa_fim: 4664.68, aliquota: 22.5, parcela_deduzir: 675.49 },
    { faixa_inicio: 4664.68, faixa_fim: 999999.99, aliquota: 27.5, parcela_deduzir: 908.73 },
];

// Constantes padrão 2026 (Salário Mínimo R$ 1.621,00)
export const TETO_INSS = 8475.55;
export const SALARIO_MINIMO = 1621.00;
export const ALIQUOTA_FGTS = 8.0;
// Lei 15.270/2025 — valores oficiais 2026
export const DEDUCAO_DEPENDENTE = 189.59;
export const DESCONTO_SIMPLIFICADO = 607.20;

/**
 * Calcula a base de incidência (soma dos eventos que incidem no tributo)
 */
export function calcularBaseIncidencia(
    lancamentos: Partial<Lancamento>[],
    eventos: EventoFolha[],
    tipoIncidencia: 'inss' | 'fgts' | 'irrf'
): number {
    return lancamentos
        .filter(l => {
            const evento = eventos.find(e => Number(e.id) === Number(l.evento_id));
            if (!evento || evento.tipo !== 'CREDITO') return false;

            // v4.52.23: Exclui explicitamente o FGTS Visual (1900) de qualquer base de cálculo (INSS, FGTS, IRRF)
            if (Number(evento.codigo_evento) === 1900) return false;

            // Verifica flag de incidência (default true se não existir)
            switch (tipoIncidencia) {
                case 'inss': return evento.incide_inss !== false;
                case 'fgts': return evento.incide_fgts !== false;
                case 'irrf': return evento.incide_irrf !== false;
                default: return true;
            }
        })
        .reduce((sum, l) => sum + Number(l.valor_total || 0), 0);
}

/**
 * Calcula INSS com tabela progressiva
 * @param salarioContribuicao - Base de cálculo INSS
 * @param faixas - Faixas de alíquotas (opcional, usa padrão 2024)
 */
export function calcularINSS(
    salarioContribuicao: number,
    faixas: FaixaINSS[] = FAIXAS_INSS_2026
): { valor: number; aliquotaEfetiva: number } {
    // Limita ao teto
    const base = Math.min(salarioContribuicao, TETO_INSS);

    let inssTotal = 0;
    let valorAcumulado = 0;

    for (const faixa of faixas) {
        if (base <= faixa.faixa_inicio) break;

        // Valor tributável nesta faixa
        const inicioFaixa = Math.max(faixa.faixa_inicio, valorAcumulado);
        const fimFaixa = Math.min(base, faixa.faixa_fim);
        const valorNaFaixa = Math.max(0, fimFaixa - inicioFaixa);

        inssTotal += valorNaFaixa * (faixa.aliquota / 100);
        valorAcumulado = faixa.faixa_fim;

        if (base <= faixa.faixa_fim) break;
    }

    const aliquotaEfetiva = base > 0 ? (inssTotal / base) * 100 : 0;

    return {
        valor: Math.round(inssTotal * 100) / 100,
        aliquotaEfetiva: Math.round(aliquotaEfetiva * 100) / 100
    };
}

/**
 * Calcula FGTS (8% sobre base)
 */
export function calcularFGTS(
    baseFGTS: number,
    aliquota: number = ALIQUOTA_FGTS
): number {
    return Math.round(baseFGTS * (aliquota / 100) * 100) / 100;
}

/**
 * Aplica tabela progressiva de IRRF sobre uma BC, usando RTM para o redutor.
 * Lei 15.270/2025: isenção total quando RTM ≤ 5.000; redutor linear 5k-7.35k.
 */
function _irrf_tabela(bc: number, rtm: number, faixas: FaixaIRRF[]): number {
    if (rtm <= 5000 || bc <= 0) return 0;
    const faixa = faixas.find(f => bc >= f.faixa_inicio && bc <= f.faixa_fim);
    if (!faixa || faixa.aliquota === 0) return 0;
    const irBruto = Math.max(0, (bc * (faixa.aliquota / 100)) - faixa.parcela_deduzir);
    if (rtm <= 7350) {
        // Redutor = 978,62 − 0,133145 × RTM (zera em RTM=7.350, máximo em RTM=5.000)
        const redutor = 978.62 - (0.133145 * rtm);
        return Math.max(0, irBruto - redutor);
    }
    return irBruto;
}

/**
 * Calcula IRRF — Lei 15.270/2025 / tabela progressiva 2026.
 *
 * @param rtm               Rendimento Tributável Mensal bruto (antes de INSS)
 * @param inss              Desconto INSS já calculado
 * @param dependentes       Número de dependentes (dedução de R$ 189,59 cada)
 * @param pensaoAlimenticia Pensão alimentícia judicial
 * @param previdenciaPrivada Contribuição previdência privada
 */
export function calcularIRRF(
    rtm: number,
    inss: number = 0,
    dependentes: number = 0,
    pensaoAlimenticia: number = 0,
    previdenciaPrivada: number = 0,
    faixas: FaixaIRRF[] = FAIXAS_IRRF_2026
): { valor: number; faixa: number } {
    if (rtm <= 0) return { valor: 0, faixa: 0 };

    const deducoesBase = inss + pensaoAlimenticia + previdenciaPrivada;

    // Método Legal: dedução por dependentes
    const bcLegal = Math.max(0, rtm - deducoesBase - (dependentes * DEDUCAO_DEPENDENTE));
    const irLegal = _irrf_tabela(bcLegal, rtm, faixas);

    // Método Simplificado: desconto padrão R$ 607,20
    const bcSimplificado = Math.max(0, rtm - deducoesBase - DESCONTO_SIMPLIFICADO);
    const irSimplificado = _irrf_tabela(bcSimplificado, rtm, faixas);

    // Contribuinte usa o método mais vantajoso (menor IR)
    const irFinal = Math.min(irLegal, irSimplificado);
    const bcUsado = irLegal <= irSimplificado ? bcLegal : bcSimplificado;
    const faixaObj = faixas.find(f => bcUsado >= f.faixa_inicio && bcUsado <= f.faixa_fim);

    return {
        valor: Math.round(irFinal * 100) / 100,
        faixa: irFinal > 0 ? (faixaObj?.aliquota ?? 0) : 0
    };
}

/** @deprecated Mantido por compatibilidade. */
export function calcularRedutorIRRF(_baseIRRF: number): number {
    return 0;
}

/**
 * Calcula todos os encargos de uma vez
 */
export interface ResultadoEncargos {
    baseINSS: number;
    baseFGTS: number;
    baseIRRF: number;
    inss: number;
    fgts: number;
    irrf: number;
    aliquotaEfetivaINSS: number;
    faixaIRRF: number;
}

export function calcularTodosEncargos(
    lancamentos: Partial<Lancamento>[],
    eventos: EventoFolha[],
    numDependentes: number = 0
): ResultadoEncargos {
    // Calcular bases
    const baseINSS = calcularBaseIncidencia(lancamentos, eventos, 'inss');
    const baseFGTS = calcularBaseIncidencia(lancamentos, eventos, 'fgts');

    // Calcular INSS
    const resultINSS = calcularINSS(baseINSS);

    // Calcular FGTS
    const fgts = calcularFGTS(baseFGTS);

    // RTM = base bruta IRRF (antes de INSS); IRRF deduz INSS internamente
    const rtm = calcularBaseIncidencia(lancamentos, eventos, 'irrf');
    const baseIRRF = Math.max(0, rtm - resultINSS.valor);

    // Calcular IRRF — passa RTM e INSS separadamente (redutor usa RTM)
    const resultIRRF = calcularIRRF(rtm, resultINSS.valor, numDependentes);

    return {
        baseINSS,
        baseFGTS,
        baseIRRF,
        inss: resultINSS.valor,
        fgts,
        irrf: resultIRRF.valor,
        aliquotaEfetivaINSS: resultINSS.aliquotaEfetiva,
        faixaIRRF: resultIRRF.faixa
    };
}
