<?php
// fix_indices.php
require_once 'config.php';
header('Content-Type: text/html; charset=utf-8');

try {
    echo "<h3>Revisando índices da tabela funcionários...</h3>";
    
    // 1. Remover UNIQUE global de id_contrato
    try {
        $conn->exec("ALTER TABLE funcionarios DROP INDEX id_contrato");
        echo "✔ Índice global 'id_contrato' removido.<br>";
    } catch(Exception $e) {
        echo "ℹ Índice 'id_contrato' não existia ou já foi removido.<br>";
    }
    
    // 2. Adicionar UNIQUE composto (id_contrato + id_empresa)
    try {
        $conn->exec("ALTER TABLE funcionarios ADD UNIQUE KEY uk_contrato_empresa (id_contrato, id_empresa)");
        echo "✔ Novo índice composto (Contrato + Empresa) criado com sucesso!<br>";
    } catch(Exception $e) {
        echo "❌ Erro ao criar índice composto: " . $e->getMessage() . "<br>";
    }

    echo "<hr><h4 style='color:green'>Ajuste de índices concluído. Agora registros de empresas diferentes não vão colidir.</h4>";
} catch (Exception $e) {
    echo "<span style='color:red'>Erro fatal: " . $e->getMessage() . "</span>";
}
?>
