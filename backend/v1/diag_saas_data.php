<?php
// backend/v1/debug_saas.php
require_once 'config.php';
require_once 'lib/Database.php';

header('Content-Type: application/json');

$response = [
    "status" => "online",
    "timestamp" => date('Y-m-d H:i:s'),
    "checks" => []
];

try {
    // 1. Check Empresas Count
    $stmt = $conn->query("SELECT COUNT(*) as total FROM empresas");
    $totalEmpresas = $stmt->fetch()['total'];
    $response['checks']['total_empresas'] = $totalEmpresas;

    // 2. List Top 5 Empresas
    $stmt = $conn->query("SELECT id, razao_social, active FROM empresas LIMIT 5"); // 'active' column name might be 'ativa'
    // Let's check column names first
    $columns = $conn->query("DESCRIBE empresas")->fetchAll(PDO::FETCH_COLUMN);
    $response['checks']['empresas_columns'] = $columns;

    $stmt = $conn->query("SELECT * FROM empresas LIMIT 5");
    $response['checks']['empresas_sample'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. List SuperAdmins
    $stmt = $conn->query("SELECT id, nome, email, profile, id_empresa FROM usuarios WHERE profile = 'SUPERADMIN' OR perfil = 'SUPERADMIN'");
    // Handling potential column name differences (profile vs perfil)
    $userColumns = $conn->query("DESCRIBE usuarios")->fetchAll(PDO::FETCH_COLUMN);
    $response['checks']['usuarios_columns'] = $userColumns;

    $stmt = $conn->query("SELECT * FROM usuarios WHERE email LIKE '%master%' OR perfil = 'SUPERADMIN'");
    $response['checks']['superadmins'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

}
catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>