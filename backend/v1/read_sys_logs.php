<?php
require_once 'config.php';
header('Content-Type: application/json');

$results = [];
$logDir = __DIR__ . '/sys_logs';

if (is_dir($logDir)) {
    $files = ['audit_error.log', 'debug_logs_error.log', 'debug_lancamentos.log'];
    foreach ($files as $file) {
        $path = $logDir . '/' . $file;
        if (file_exists($path)) {
            $results[$file] = array_slice(explode("\n", file_get_contents($path)), -20); // Last 20 lines
        } else {
            $results[$file] = "File not found";
        }
    }
} else {
    $results['error'] = "Directory sys_logs not found";
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>
