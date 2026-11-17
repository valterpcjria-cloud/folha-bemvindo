<?php
require_once 'config.php';
header('Content-Type: application/json');

$results = [];

try {
    // 1. Tabela existe?
    $stmt = $conn->query("SHOW TABLES LIKE 'logs_auditoria'");
    $results['table_exists'] = $stmt->rowCount() > 0;

    if ($results['table_exists']) {
        // 2. Colunas
        $stmt = $conn->query("DESCRIBE logs_auditoria");
        $results['columns'] = $stmt->fetchAll();

        // 3. Quantidade de registros
        $stmt = $conn->query("SELECT COUNT(*) as total FROM logs_auditoria");
        $results['total_records'] = $stmt->fetch()['total'];

        // 4. Amostra de dados
        $stmt = $conn->query("SELECT * FROM logs_auditoria LIMIT 5");
        $results['sample_data'] = $stmt->fetchAll();

        // 5. Teste do JOIN que o logs.php faz
        $sql = "SELECT l.*, u.nome as usuario 
                FROM logs_auditoria l 
                LEFT JOIN usuarios u ON l.usuario_id = u.id 
                ORDER BY l.created_at DESC LIMIT 5";
        $stmt = $conn->query($sql);
        $results['join_test'] = $stmt->fetchAll();
    }
} catch (Exception $e) {
    $results['error'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>
