<?php
declare(strict_types=1);

/**
 * Script de Migração Manual - Sistema RH
 * Use este script via CLI ou URL protegida para atualizar o banco de dados.
 */

require_once 'config.php';
require_once 'lib/MigrationSystem.php';

// Proteção simples por KEY (opcional, igual ao setup)
$setup_key = $_GET['key'] ?? '';
$expected_key = getenv('SETUP_KEY') ?: 'frimelo_default_key';

if ($setup_key !== $expected_key) {
    http_response_code(403);
    die(json_encode(["error" => "Acesso negado", "message" => "SETUP_KEY inválida."]));
}

try {
    $migrationDir = __DIR__ . '/migrations';
    if (!is_dir($migrationDir)) {
        mkdir($migrationDir, 0777, true);
    }

    $migrator = new MigrationSystem($conn, $migrationDir);
    ob_start();
    $migrator->run();
    $output = ob_get_clean();

    echo json_encode([
        "status" => "success",
        "message" => "Migrações executadas com sucesso.",
        "log" => $output
    ]);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
