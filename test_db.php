<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Mock the Database class and connection
$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$db->exec("CREATE TABLE lancamentos_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER,
    competencia_id INTEGER,
    evento_id INTEGER,
    quantidade REAL,
    valor_unitario REAL,
    valor_total REAL,
    id_empresa INTEGER,
    origem TEXT,
    UNIQUE(funcionario_id, competencia_id, evento_id)
)");

class Database {
    public static function connect() {
        global $db;
        return $db;
    }
}

require_once 'backend/v1/lib/PayrollConstants.php';
require_once 'backend/v1/services/LancamentoService.php';

$service = new LancamentoService($db);

try {
    $service->saveBulk([
        ["funcionario_id" => 1, "evento_id" => 1, "competencia_id" => 1, "quantidade" => 1, "valor_unitario" => 1, "valor_total" => 1]
    ], 1, 1);
    echo "SUCCESS\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
