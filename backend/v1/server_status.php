<?php
// server_status.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json');
require_once 'config.php';
require_once 'middleware/auth.php';

// Protegido: apenas SUPERADMIN
$authUser = requireAuth('server_status');
requireRole($authUser, ['SUPERADMIN']);

$results = [
    "status" => "online",
    "version" => "v4.38.16",
    "id_empresa_contexto" => $authUser['id_empresa'] ?? 'N/A (Use ?token=XXX)',
    "user_email" => $authUser['email'] ?? 'N/A',
    "user_perfil" => $authUser['perfil'] ?? 'N/A',
    "env" => "HostGator",
    "checks" => [],
];

// 1. Log Test
$logDir = __DIR__ . '/logs'; // Caminho Corrigido Unificado
if (!is_dir($logDir)) @mkdir($logDir, 0777, true);
$results["checks"]["log_dir"] = $logDir;
$results["checks"]["log_writable"] = is_writable($logDir);
$testFile = $logDir . '/test_diag.txt';
$results["checks"]["log_write_test"] = @file_put_contents($testFile, "OK") !== false;

// 2. DB Test
if ($conn) {
        $results["checks"]["db_conn"] = "OK";
        try {
        // Tenta ler algo
        $count = $conn->query("SELECT COUNT(*) FROM lancamentos_eventos")->fetchColumn();
        $results["checks"]["db_read"] = "OK (Count: $count)";

        // 2.3 Detailed Table Info (whitelist — sem SQL injection)
        $allowed_tables = ['funcionarios', 'usuarios', 'empresas', 'logs_auditoria'];
        foreach ($allowed_tables as $t) {
            try {
                $stmt = $conn->query("SHOW CREATE TABLE `$t`");
                $results['checks']["schema_$t"] = $stmt->fetch(PDO::FETCH_ASSOC)['Create Table'] ?? 'No Create Info';
            } catch (Exception $e) {
                $results['checks']["schema_$t"] = "Error";
            }
        }

        // List users count only (não expor dados de usuários)
        try {
            $stmt = $conn->query("SELECT COUNT(*) FROM usuarios");
            $results['checks']['users_count'] = $stmt->fetchColumn();
        } catch (Exception $e) { $results['checks']['users_count'] = 'N/A'; }
        
// 3. Read Log Content
$logContent = "Log debug_lancamentos.log not found or empty.";
$logFile = $logDir . '/debug_lancamentos.log';
if (file_exists($logFile)) {
    $logContent = file_get_contents($logFile, false, null, 0, 2048); 
}
$results["checks"]["log_lancamentos_head"] = substr($logContent, 0, 500) . "...";

// 3.1 Read Request Debug Log (New in v4.10.27)
$reqLogContent = "Log request_debug.log not found or empty.";
$reqLogFile = $logDir . '/request_debug.log';
if (file_exists($reqLogFile)) {
    // Read last 1000 bytes
    $f = fopen($reqLogFile, 'r');
    fseek($f, -1000, SEEK_END);
    $reqLogContent = fread($f, 1000);
    fclose($f);
}
$results["checks"]["log_routing_tail"] = "..." . substr($reqLogContent, -800);


// 4. Real Insert/Update Test
try {
    $f = $conn->query("SELECT id FROM funcionarios LIMIT 1")->fetch();
    $e = $conn->query("SELECT id FROM eventos_folha LIMIT 1")->fetch();
    $c = $conn->query("SELECT id FROM competencias LIMIT 1")->fetch();
    
    if ($f && $e && $c) {
        $stmt = $conn->prepare("INSERT INTO lancamentos_eventos 
            (funcionario_id, competencia_id, evento_id, quantidade, valor_unitario, valor_total) 
            VALUES (?, ?, ?, 1, 10, 10)
            ON DUPLICATE KEY UPDATE valor_total = valor_total + 1");
        $stmt->execute([$f['id'], $c['id'], $e['id']]);
        $results["checks"]["sql_test"] = "SUCCESS - Rows effected: " . $stmt->rowCount();
    } else {
        $results["checks"]["sql_test"] = "SKIPPED - Missing dependencies (func/evento/comp)";
    }
} catch (Exception $ex) {
    $results["checks"]["sql_test"] = "FAIL - " . $ex->getMessage();
}

        } catch (Exception $e) {
            $results["checks"]["db_error"] = $e->getMessage();
        }
} else {
        $results["checks"]["db_conn"] = "FAIL";
}

echo json_encode($results);
?>
