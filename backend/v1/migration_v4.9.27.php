<?php
// /backend/v1/migration_v4.9.27.php
// Script para adicionar a coluna data_admissao se ela não existir

require_once 'config.php';

try {
    // Verifica se a coluna já existe
    $check = $conn->query("SHOW COLUMNS FROM `funcionarios` LIKE 'data_admissao'");
    $exists = $check->fetch();

    if (!$exists) {
        $conn->exec("ALTER TABLE `funcionarios` ADD COLUMN `data_admissao` DATE NULL AFTER `cpf` ");
        echo json_encode(["success" => true, "message" => "Coluna data_admissao adicionada com sucesso."]);
    } else {
        echo json_encode(["success" => true, "message" => "A coluna data_admissao já existe."]);
    }
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
