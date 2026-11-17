<?php
declare(strict_types=1);

// /backend/v1/config.php

// 1. Configurações de exibição de erro para debug
ini_set('display_errors', 0);
error_reporting(E_ALL);

// 2. CORS Seguro - Whitelist de origens permitidas
$allowed_origins = [
    'https://frimelo.meusistema.com.br',
    'http://frimelo.meusistema.com.br',
    'https://frimelo.meusistemanaweb.com.br',
    'http://frimelo.meusistemanaweb.com.br',
    'https://app.frimelo.com.br',
    'http://app.frimelo.com.br',
];

// Adiciona origens de desenvolvimento apenas se APP_ENV=dev no .env
$appEnv = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?? 'production';
if ($appEnv === 'dev' || $appEnv === 'development') {
    $allowed_origins = array_merge($allowed_origins, [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
    ]);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, DELETE, PUT, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-Company-Context");

// Responder imediatamente ao Preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Carregar Bibliotecas Auxiliares (Utils e Database)
require_once __DIR__ . '/lib/Utils.php';
require_once __DIR__ . '/lib/Database.php';

// 4. Conexão com o Banco de Dados (usando classe Database)
$conn = Database::connect();

// Fim do arquivo config.php refatorado