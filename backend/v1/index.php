<?php
declare(strict_types=1);

// /backend/v1/index.php

// 1. Inicia buffer de saída para evitar poluição do JSON com warnings/errors do PHP
ob_start();

// 2. Define manipulador global de exceções para garantir resposta JSON
set_exception_handler(function ($e) {
    if (ob_get_level())
        ob_clean(); // Limpa qualquer lixo anterior
    header('Content-Type: application/json');

    $message = "Ocorreu um erro inesperado no servidor.";
    $error = "ERRO_INTERNO_SERVIDOR";
    $code = 500;

    // Tratamento específico para erros de configuração
    if (strpos($e->getMessage(), 'JWT_SECRET') !== false) {
        $message = "Erro de Configuração: JWT_SECRET não definida no arquivo .env";
        $error = "ERRO_CONFIGURACAO";
        $code = 503;
    }

    http_response_code($code);
    echo json_encode([
        "error" => $error,
        "message" => $message
    ]);
    
    // Log detalhado no servidor para auxílio de manutenção
    $reqUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
    $reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'unknown';
    $timestamp = date('Y-m-d H:i:s');
    
    error_log("[{$timestamp}] EXCEPTION [{$code}] at [{$reqMethod} {$reqUri}]: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    exit;
});

// Carrega as configurações (incluindo o header de JSON e CORS)
require_once 'config.php';
global $conn;

// Carrega middleware de autenticação JWT
require_once 'middleware/auth.php';

// Carrega middleware de segurança (rate limiting, headers, etc.)
require_once 'middleware/security.php';

// Detecta a rota de forma dinâmica
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Pega o diretório onde este arquivo index.php está rodando (ex: /api/v1 ou /backend/v1)
$base_dir = dirname($_SERVER['SCRIPT_NAME']);

// Remove a base do caminho para pegar apenas a ação (ex: /setup)
$relative_path = str_replace($base_dir, '', $path);
$route_parts = explode('/', trim($relative_path, '/'));
$main_route = $route_parts[0] ?? '';

// Valida autenticação (rotas públicas são ignoradas automaticamente)
$authUser = requireAuth($main_route);

// Carrega o Router
require_once 'lib/Router.php';

$router = new Router();

// Rota: Status
$router->add('status', function () use ($conn, $base_dir) {
    echo json_encode([
    "status" => "online",
    "environment" => "HostGator",
    "folder_detected" => $base_dir,
    "database" => ($conn ? "connected" : "failed"),
    "php_version" => phpversion()
    ]);
});

// Rota: Setup
$router->add('setup', function () {
    $setup_key = $_GET['key'] ?? '';
    $expected_key = getenv('SETUP_KEY');

    if (!$expected_key || $setup_key !== $expected_key) {
        http_response_code(403);
        echo json_encode(["error" => "Acesso negado ao setup.", "message" => "SETUP_KEY não configurada ou inválida."]);
        exit;
    }
    require_once 'setup_db.php';
});

// Rota: Fix Password (ADMINISTRATIVA — requer SUPERADMIN + SETUP_KEY)
$router->add('fix_password', function () use ($conn, $authUser) {
    requireRole($authUser, ['SUPERADMIN']);
    $setup_key = $_GET['key'] ?? '';
    $expected_key = getenv('SETUP_KEY');
    if (!$expected_key || $setup_key !== $expected_key) {
        http_response_code(403);
        echo json_encode(["error" => "SETUP_KEY inválida ou ausente."]);
        exit;
    }
    require_once 'fix_password.php';
});

// Rota: Login
$router->add('login', function () use ($conn) {
    require_once 'routes/login.php';
});

// Rota: Logout (v4.57.0 — revoga o token atual)
$router->add('logout', function () use ($conn, $authUser) {
    require_once 'routes/logout.php';
});

// Rota: Troca de senha (v4.57.0 — obrigatória no 1º login ou voluntária)
$router->add('change_password', function () use ($conn, $authUser) {
    require_once 'routes/change_password.php';
});

// Rota: Users
$router->add('users', function () use ($conn, $authUser) {
    require_once 'routes/users.php';
});

// Rota: Funcionarios
$router->add('funcionarios', function () use ($conn, $authUser, $route_parts) {
    require_once 'routes/funcionarios.php';
});

// Rota: Eventos
$router->add('eventos', function () use ($conn, $authUser) {
    require_once 'routes/eventos.php';
});

// Rota: Competencias
$router->add('competencias', function () use ($conn, $authUser, $route_parts) {
    // Passa $path_segments para o arquivo incluído se necessário
    $path_segments = $route_parts;
    require_once 'routes/competencias.php';
});

// Rota: Lancamentos
$router->add('lancamentos', function () use ($conn, $authUser, $route_parts) {
    require_once 'routes/lancamentos.php';
});

// Rota: DSR
$router->add('dsr', function () use ($conn, $authUser, $route_parts) {
    require_once 'routes/dsr.php';
});

// Rota: Logs
$router->add('logs', function () use ($conn, $authUser) {
    require_once 'routes/logs.php';
});

// Rota: Stats
$router->add('stats', function () use ($conn, $authUser) {
    require_once 'routes/stats.php';
});

// Rota: Cargos
$router->add('cargos', function () use ($conn, $authUser) {
    require_once 'routes/cargos.php';
});

// Rota: Dependentes
$router->add('dependentes', function () use ($conn, $authUser) {
    require_once 'routes/dependentes.php';
});

// Rota: Ferias
$router->add('ferias', function () use ($conn, $authUser) {
    require_once 'routes/ferias.php';
});

// Rota: Parametros
$router->add('parametros', function () use ($conn, $authUser) {
    require_once 'routes/parametros.php';
});

// Rota: Aliquotas
$router->add('aliquotas', function () use ($conn, $authUser) {
    require_once 'routes/aliquotas.php';
});

// Rota: Companies
$router->add('companies', function () use ($conn, $authUser) {
    require_once 'routes/companies.php';
});

// Rota: Fechamento Expresso
$router->add('fechamento_expresso', function () use ($conn, $authUser) {
    require_once 'routes/fechamento_expresso.php';
});

// Rota: Reports
$router->add('reports', function () use ($conn, $authUser, $route_parts) {
    require_once 'routes/reports.php';
});

// Rota: PDF Relatório (Espelho da Folha)
$router->add('pdf-relatorio', function () use ($conn, $authUser) {
    require_once 'routes/pdf_relatorio.php';
});

// Rota: PDF Contracheques
$router->add('pdf-contracheque', function () use ($conn, $authUser) {
    require_once 'routes/pdf_contracheque.php';
});

// Rota: Feriados
$router->add('feriados', function () use ($conn, $authUser, $route_parts) {
    require_once 'routes/feriados.php';
});

// Rota: Atestados por competência (perda de Assiduidade)
$router->add('atestados', function () use ($conn, $authUser, $route_parts) {
    require_once 'routes/atestados.php';
});

// Rota: Create SaaS Admin (ADMINISTRATIVA — requer SUPERADMIN + SETUP_KEY, igual fix_password)
$router->add('create_saas_admin', function () use ($conn, $authUser) {
    requireRole($authUser, ['SUPERADMIN']);
    $setup_key = $_GET['key'] ?? '';
    $expected_key = getenv('SETUP_KEY');
    if (!$expected_key || $setup_key !== $expected_key) {
        http_response_code(403);
        echo json_encode(["error" => "SETUP_KEY inválida ou ausente."]);
        exit;
    }
    require_once 'create_saas_admin.php';
});

// Handler 404 / Default
$router->setNotFound(function () use ($main_route, $base_dir) {
    if (empty($main_route)) {
        echo json_encode([
        "message" => "Sistema RH API ativa.",
        "path" => $base_dir
        ]);
    }
    else {
        http_response_code(404);
        echo json_encode([
        "error" => "Rota não encontrada",
        "requested" => $main_route,
        "detected_base" => $base_dir
        ]);
    }
});

// Dispatch request
$router->dispatch($main_route);
// End of file