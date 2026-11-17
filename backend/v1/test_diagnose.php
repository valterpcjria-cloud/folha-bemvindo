<?php
// test_diagnose.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

$results = [
    "checks" => [],
    "final_status" => "pending"
];

// 1. Teste de Log / Permissões de Escrita
$logPath = __DIR__ . '/../logs';
$results["checks"]["log_dir_exists"] = is_dir($logPath);
$results["checks"]["log_dir_writable"] = is_writable($logPath);

if (!is_dir($logPath)) {
    @mkdir($logPath, 0777, true);
    $results["checks"]["log_dir_created"] = is_dir($logPath);
}

$testLogFile = $logPath . '/test_write.txt';
$canWrite = @file_put_contents($testLogFile, "Teste de escrita " . date('Y-m-d H:i:s'));
$results["checks"]["can_write_log"] = ($canWrite !== false);

// 2. Teste de Conexão com Banco
require_once 'config.php'; // Isso já cria $conn

if ($conn) {
    $results["checks"]["db_connection"] = "OK";
} else {
    $results["checks"]["db_connection"] = "FALHA";
}

// 3. Teste de Inserção Dummy (Para ver se o UNIQUE KEY funciona)
// Vamos tentar inserir/atualizar um registro de teste se houver funcionários
try {
    $func = $conn->query("SELECT id FROM funcionarios LIMIT 1")->fetch();
    $evento = $conn->query("SELECT id FROM eventos_folha LIMIT 1")->fetch();
    $comp = $conn->query("SELECT id FROM competencias LIMIT 1")->fetch();

    if ($func && $evento && $comp) {
        $results["checks"]["test_data"] = [
            "func_id" => $func['id'],
            "evento_id" => $evento['id'],
            "comp_id" => $comp['id']
        ];

        // Tentar INSERT ON DUPLICATE
        $sql = "INSERT INTO lancamentos_eventos (funcionario_id, competencia_id, evento_id, quantidade, valor_unitario, valor_total) 
                VALUES (?, ?, ?, 1, 10, 10)
                ON DUPLICATE KEY UPDATE valor_total = VALUES(valor_total) + 1";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$func['id'], $comp['id'], $evento['id']]);
        
        $results["checks"]["insert_test"] = "SUCESSO (Afetou " . $stmt->rowCount() . " linhas)";
    } else {
        $results["checks"]["insert_test"] = "PULADO (Falta dados base)";
    }
} catch (Exception $e) {
    $results["checks"]["insert_test_error"] = $e->getMessage();
}

// 4. Verificar PHP Input
$results["checks"]["php_input_test"] = file_get_contents("php://input");

$results["final_status"] = "finished";
echo json_encode($results, JSON_PRETTY_PRINT);
?>
