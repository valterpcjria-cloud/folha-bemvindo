<?php
declare(strict_types=1);

// /backend/v1/lib/Database.php

class Database
{
    private static $conn = null;
    private static $config = [];

    private static function loadEnv()
    {
        if (!empty(self::$config))
            return;

        $envFile = __DIR__ . '/../.env';
        if (!file_exists($envFile))
            $envFile = dirname(__DIR__) . '/../.env';
        if (!file_exists($envFile))
            $envFile = dirname(dirname(__DIR__)) . '/../.env';

        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '#') === 0 || strpos($line, '=') === false)
                    continue;
                list($key, $value) = explode('=', $line, 2);
                self::$config[trim($key)] = trim($value);
            }
        }
    }

    public static function getEnv(string $key, $default = null)
    {
        self::loadEnv();
        return self::$config[$key] ?? $default;
    }

    public static function connect()
    {
        if (self::$conn !== null) {
            return self::$conn;
        }

        self::loadEnv();

        $host = self::$config['DB_HOST'] ?? 'localhost';
        $db_name = self::$config['DB_NAME'] ?? '';
        $username = self::$config['DB_USER'] ?? '';
        $password = self::$config['DB_PASS'] ?? '';
        $charset = 'utf8mb4';

        if (!$db_name || !$username) {
            header('Content-Type: application/json');
            http_response_code(500);
            die(json_encode(["error" => "Configuração de banco de dados incompleta no .env", "details" => "DB_NAME ou DB_USER ausentes.", "looked_at" => __DIR__]));
        }

        try {
            $dsn = "mysql:host=$host;dbname=$db_name;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            self::$conn = new PDO($dsn, $username, $password, $options);
            return self::$conn;
        }
        catch (\PDOException $e) {
            // Logar erro real para o admin (silencioso para não quebrar JSON)
            $logDir = __DIR__ . '/../sys_logs';
            if (!is_dir($logDir))
                @mkdir($logDir, 0777, true);
            @file_put_contents($logDir . '/db_error.log', date('Y-m-d H:i:s') . " - PDO Error: " . $e->getMessage() . "\n", FILE_APPEND);

            // Garante limpeza de buffer antes de enviar JSON
            if (ob_get_level())
                ob_clean();

            header('Content-Type: application/json');
            http_response_code(503);
            die(json_encode([
                "error" => "ERRO_CONEXAO_BANCO",
                "message" => "O serviço está temporariamente indisponível. Verifique credenciais do banco."
            ]));
        }
    }
}