<?php
require_once 'config.php';
require_once 'middleware/auth.php';

// Protegido: apenas SUPERADMIN
$authUser = requireAuth('diag_db');
requireRole($authUser, ['SUPERADMIN']);

// Whitelist de tabelas permitidas (evita SQL injection)
$allowed_tables = ['usuarios', 'funcionarios', 'eventos_folha', 'competencias', 'lancamentos_eventos', 'logs_auditoria'];
$results = [];

try {
    foreach ($allowed_tables as $table) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) as count FROM `$table`");
            $row = $stmt->fetch();
            $results[$table] = $row['count'];
        } catch (Exception $e) {
            $results[$table] = "ERRO";
        }
    }
    echo json_encode($results, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erro interno"]);
}
?>
