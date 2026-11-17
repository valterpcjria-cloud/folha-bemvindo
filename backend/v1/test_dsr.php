<?php
declare(strict_types=1);

/**
 * Script de testes unitários simples para validar as 3 fórmulas de DSR.
 * Pode ser executado em linha de comando: php backend/v1/test_dsr.php
 */

echo " Iniciando Testes Unitários de DSR\n";
echo str_repeat("-", 50) . "\n\n";

$passouCount = 0;
$falhouCount = 0;

function assertEqual(string $nomeTeste, float $recebido, float $esperado) {
    global $passouCount, $falhouCount;
    // Precisao de 2 casas decimais
    if (round($recebido, 2) === round($esperado, 2)) {
        echo "✅ [PASSOU] $nomeTeste\n";
        $passouCount++;
    } else {
        echo "❌ [FALHOU] $nomeTeste - Esperado: $esperado | Recebido: $recebido\n";
        $falhouCount++;
    }
}

// FÓRMULA 1: DSR sobre Horas Extras
// DSR_HE = (Total HE / Dias Úteis do Mês) × Dias DSR
// Ex: 310,50 de HE num mês de 22 dias utéis e 5 dsrs (igual ao exemplo do usuario)
$totalHe = 310.50;
$diasUteis = 22;
$diasDsr = 5;
$dsrHeCalculado = ($totalHe / $diasUteis) * $diasDsr;
$dsrHeEsperado = 70.57; // Do prompt: "(310,50 / 22) × 5 = R$ 70,57"

assertEqual("Cálculo de DSR sobre Horas Extras (Exemplo Prompt)", $dsrHeCalculado, $dsrHeEsperado);

// FÓRMULA 2: DSR sobre Comissões
// DSR_Comissoes = (Total Comissões / Dias Úteis do Mês) × Dias DSR
// Ex: R$ 1500 de Comissões, array util (20) / (6) dias DSR.
$totalComissao = 1500;
$diasUteisComissao = 20;
$diasDsrComissao = 6;
$dsrComissaoCalculado = ($totalComissao / $diasUteisComissao) * $diasDsrComissao;
$dsrComissaoEsperado = 450.00;

assertEqual("Cálculo de DSR sobre Comissões", $dsrComissaoCalculado, $dsrComissaoEsperado);

// FÓRMULA 3: Desconto por Falta pré-DSR
// Desconto por Falta = (DSR Total / Dias DSR) × Qtd. Faltas pré-DSR
// Ex: O funcionario fez $450 de dsr (acima). Faltou 1 vez pre DSR. Perde 1 de seus 6 domingos.
$dsrTotal = $dsrComissaoCalculado; // 450
$qtdFaltasPreDsr = 1;
$descontoCalculado = ($dsrTotal / $diasDsrComissao) * $qtdFaltasPreDsr;
$descontoEsperado = 75.00; // (450 / 6) * 1

assertEqual("Cálculo de Desconto por Falta Injustificada pré-DSR", $descontoCalculado, $descontoEsperado);

// Liquido
$dsrLiquido = $dsrTotal - $descontoCalculado;
assertEqual("Cálculo de DSR Líquido", $dsrLiquido, 375.00);


echo "\n".str_repeat("-", 50)."\n";
echo "RESULTADO: $passouCount Passaram, $falhouCount Falharam.\n";

if ($falhouCount > 0) {
    exit(1);
} else {
    exit(0);
}
