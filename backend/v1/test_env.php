<?php
// backend/v1/test_env.php
require_once 'config.php';

header('Content-Type: text/plain; charset=utf-8');

echo "--- TEST ENV ---\n";

$testKey = "TEST_VAR_" . time();
$testVal = "WORKED";

echo "Tentando putenv($testKey=$testVal)...\n";
$res = putenv("$testKey=$testVal");
echo "Resultado putenv: " . ($res ? "Sucesso (true)" : "Falha (false)") . "\n";

echo "Tentando getenv($testKey): " . getenv($testKey) . "\n";

echo "\nVerificando JWT_SECRET e DB_NAME:\n";
echo "DB_NAME (getenv): " . getenv('DB_NAME') . "\n";
echo "JWT_SECRET (getenv): " . (getenv('JWT_SECRET') ? "DEFINIDA" : "NÃO DEFINIDA") . "\n";

echo "\n--- FIM TESTE ---\n";
?>