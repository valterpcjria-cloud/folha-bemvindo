/**
 * Constantes de Folha de Pagamento
 * Centraliza magic numbers e códigos de eventos
 */

// Carga horária mensal padrão CLT
export const MONTHLY_WORKING_HOURS = 220;

// Multiplicadores de hora extra
export const OVERTIME_50_MULTIPLIER = 1.5;
export const OVERTIME_60_MULTIPLIER = 1.6; // Bem Vindo v1.2.0: HE 60% (37)
export const OVERTIME_100_MULTIPLIER = 2;

// Salário Mínimo 2026
export const SALARIO_MINIMO_2026 = 1621.00;

// Códigos de eventos obrigatórios
export const EVENT_CODES = {
    SALARIO: 33,
    INSALUBRIDADE: 62,
    HORAS_EXTRAS_50: 48,
    HORAS_EXTRAS_100: 49,
    DSR_HE_DIURNAS: 59,   // Rubrica 59 — DSR s/ Horas Extras Diurnas
    FALTAS: 71,
    FERIADO_TRABALHADO: 1080,
    INSS: 35,
    IRRF: 1920,
    FGTS: 99,
    VT_DESC: 17,
    ASSIDUIDADE: 833,
    ADICIONAL_TEMPO_SERVICO: 1000,
    MENSALIDADE_SINDICAL: 936,
    EMPRESTIMO_CONSIGNADO: 4004,
    FGTS_VISUAL: 1900,
    GRATIFICACAO: 88,            // Frimelo — desativada no Bem Vindo (v1.2.0)
    // Bem Vindo v1.2.0 (códigos do Questor, respostas da contabilidade)
    GRATIFICACAO_FUNCAO: 82,     // % sobre o salário (P4)
    HORAS_EXTRAS_60: 37,         // HE 60% (P1/P15)
    HORAS_FALTAS: 23,            // atrasos/saídas antecipadas em horas (P13)
    VT_DESCONTO: 816,            // desconto do vale-transporte, até 6% (P10)
} as const;

/** Bem Vindo v1.2.0: teto legal do desconto do vale-transporte (Lei 7.418/85, art. 4º) */
export const VT_DESCONTO_MAX_PERC = 6;

/**
 * Configuração de rubricas-fonte que compõem a base do DSR de HE Diurnas (Rubrica 59).
 * Para adicionar novas rubricas de HE (50%, 70%, 80%...) basta adicionar neste array.
 * Mantido em sincronia com a tabela DB: dsr_he_config_eventos.
 */
export const DSR_HE_CONFIG: Array<{ codigo_evento: number; descricao: string; ativo: boolean }> = [
    { codigo_evento: 49, descricao: 'Horas Extras 100%', ativo: true },
    { codigo_evento: 37, descricao: 'Horas Extras 60%', ativo: true },   // Bem Vindo v1.2.0 (P1)
    // { codigo_evento: 48, descricao: 'Horas Extras 50%',  ativo: true },  // descomentar quando existir
];

// Códigos de empresa padrão
export const DEFAULT_COMPANY_CODE = '165';
export const DEFAULT_LOCATION = '1';
export const DEFAULT_DEPARTMENT = '999';
