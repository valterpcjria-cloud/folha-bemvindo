<?php
require_once 'config.php';
header('Content-Type: application/json');

$results = [];

try {
    $results['step'] = "Starting test";
    
    // Tentar inserir um log de teste
    $usuario_id = 1; // Admin padrão costuma ser 1
    $entidade = "TEST_DEBUG";
    $entidade_id = 999;
    $acao = "TEST_INSERT";
    $detalhes = "Teste manual de gravacao de log em " . date('Y-m-d H:i:s');
    
    $sql = "INSERT INTO logs_auditoria (usuario_id, entidade, entidade_id, acao, detalhes, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($sql);
    $success = $stmt->execute([$usuario_id, $entidade, $entidade_id, $acao, $detalhes]);
    
    $results['success'] = $success;
    if (!$success) {
        $results['error_info'] = $stmt->errorInfo();
    } else {
        $results['new_id'] = $conn->lastInsertId();
    }
    
} catch (Exception $e) {
    $results['exception'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>
