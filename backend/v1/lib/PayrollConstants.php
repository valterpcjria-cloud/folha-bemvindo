<?php
declare(strict_types=1);

/**
 * Constantes de Folha de Pagamento
 * Espelha as definições do frontend para consistência nos cálculos do backend.
 */
class PayrollConstants
{
    const MONTHLY_WORKING_HOURS = 220;
    
    const OVERTIME_50_MULTIPLIER = 1.5;
    const OVERTIME_60_MULTIPLIER = 1.6; // Bem Vindo v1.2.0: HE 60% (37)
    const OVERTIME_100_MULTIPLIER = 2.0;

    const SALARIO_MINIMO_2026 = 1621.00;

    const EVENT_CODES = [
        'SALARIO' => 33,
        'INSALUBRIDADE' => 62,
        'HORAS_EXTRAS_50' => 48,
        'HORAS_EXTRAS_100' => 49,
        'FALTAS' => 71,
        'FERIADO_TRABALHADO' => 1080,
        'ASSIDUIDADE' => 833,
        'ADICIONAL_TEMPO_SERVICO' => 1000,
        'DSR' => 9999,
        'INSS' => 35,
        'IRRF' => 1920,
        'FGTS_VISUAL' => 1900,
        'GRATIFICACAO' => 88,            // Frimelo — desativada no Bem Vindo (v1.2.0)
        // Bem Vindo v1.2.0 (códigos do Questor)
        'GRATIFICACAO_FUNCAO' => 82,
        'HORAS_EXTRAS_60' => 37,
        'HORAS_FALTAS' => 23,
        'VT_DESCONTO' => 816,
    ];
}
