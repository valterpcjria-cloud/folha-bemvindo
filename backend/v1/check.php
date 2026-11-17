<?php
// backend/v1/check.php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

$results = [
    'checks' => [],
    'status' => 'ok'
];

// 1. Check PHP Version
$results['checks']['php_version'] = phpversion();

// 2. Check .env file
$envFile = __DIR__ . '/.env';
$envExists = file_exists($envFile);
$results['checks']['env_file_exists'] = $envExists;

// Load .env manualy to check vars
$envVars = [];
if ($envExists) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0)
            continue;
        if (strpos($line, '=') === false)
            continue;
        list($key, $value) = explode('=', $line, 2);
        $envVars[trim($key)] = trim($value);
    }
}

// 3. Check JWT_SECRET
$jwtSecret = $envVars['JWT_SECRET'] ?? getenv('JWT_SECRET');
$results['checks']['jwt_secret_configured'] = !empty($jwtSecret);
if (empty($jwtSecret)) {
    $results['status'] = 'error';
    $results['error'] = 'JWT_SECRET_MISSING';
}

// 4. Check DB Credentials presence
$results['checks']['db_configured'] = !empty($envVars['DB_HOST']) && !empty($envVars['DB_USER']);

// 5. Test DB Connection
if ($results['checks']['db_configured']) {
    try {
        $dsn = "mysql:host={$envVars['DB_HOST']};dbname={$envVars['DB_NAME']};charset=utf8mb4";
        $pdo = new PDO($dsn, $envVars['DB_USER'], $envVars['DB_PASS']);
        $results['checks']['db_connection'] = 'success';
    }
    catch (PDOException $e) {
        $results['checks']['db_connection'] = 'failed';
        $results['checks']['db_error'] = $e->getMessage();
        $results['status'] = 'error';
    }
}
else {
    $results['checks']['db_connection'] = 'skipped';
}

// 6. Check sys_logs permissions
$logDir = __DIR__ . '/sys_logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0777, true);
}
$isWritable = is_writable($logDir);
$results['checks']['logs_writable'] = $isWritable;
if (!$isWritable) {
    $results['status'] = 'warning';
    $results['warnings'][] = 'sys_logs not writable';
}

echo json_encode($results, JSON_PRETTY_PRINT);