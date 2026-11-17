<?php
// backend/v1/check_db.php
require_once 'config.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    echo "=== DATABASE DIAGNOSTIC ===\n\n";

    $tables = ['usuarios', 'funcionarios', 'eventos_folha', 'competencias', 'lancamentos_eventos', 'logs_auditoria', 'empresas'];

    foreach ($tables as $table) {
        echo "Table: $table\n";
        try {
            $stmt = $conn->query("DESCRIBE $table");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($columns as $col) {
                echo "  - {$col['Field']} ({$col['Type']}) " . ($col['Null'] == 'YES' ? 'NULL' : 'NOT NULL') . " [{$col['Key']}] Default: {$col['Default']}\n";
            }
        }
        catch (Exception $e) {
            echo "  ERROR: " . $e->getMessage() . "\n";
        }
        echo "\n";
    }

    echo "=== DATA CHECKS ===\n";
    $stmt = $conn->query("SELECT id, razao_social, slug FROM empresas");
    echo "Empresas:\n";
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        echo "  - ID: {$row['id']}, Slug: {$row['slug']}, Name: {$row['razao_social']}\n";
    }

    $userEmail = 'admin@frimelo.com.br'; // From my previous fix attempt if I used this
    // Let's check for any admin
    $stmt = $conn->query("SELECT id, email, perfil, id_empresa FROM usuarios WHERE perfil = 'SUPERADMIN' OR perfil = 'ADMIN'");
    echo "\nAdmin/SuperAdmin Users:\n";
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        echo "  - ID: {$row['id']}, Email: {$row['email']}, Profile: {$row['perfil']}, CompanyID: {$row['id_empresa']}\n";
    }

}
catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage();
}
?>