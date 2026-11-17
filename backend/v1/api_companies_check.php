<?php
// backend/v1/test_companies_api.php
require_once 'config.php';
require_once 'lib/Database.php';

header('Content-Type: application/json');

$sql = "
    SELECT 
        e.*, 
        (SELECT COUNT(*) FROM funcionarios f WHERE f.id_empresa = e.id) as total_funcionarios,
        (SELECT COUNT(*) FROM usuarios u WHERE u.id_empresa = e.id) as total_usuarios
    FROM empresas e 
    ORDER BY e.data_cadastro DESC
";

try {
    $stmt = $conn->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "debug_info" => [
            "database" => $conn->query("SELECT DATABASE()")->fetchColumn(),
            "count_raw" => count($data)
        ],
        "data" => $data
    ], JSON_PRETTY_PRINT);

}
catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>