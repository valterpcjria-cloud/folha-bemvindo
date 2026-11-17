<?php
/**
 * Middleware de Autenticação
 * 
 * Verifica se a requisição possui um token JWT válido.
 * Rotas públicas podem ser definidas no array $publicRoutes.
 */

require_once __DIR__ . '/../lib/JWT.php';
require_once __DIR__ . '/../lib/AuthSession.php';

// Rotas que não precisam de autenticação
// IMPORTANTE: Endpoints administrativos (fix_password, repair_schema, fix_indices)
// foram removidos daqui e agora exigem SUPERADMIN autenticado + SETUP_KEY (ver index.php)
$publicRoutes = [
    'login',
    'status',
    'health',
];

/**
 * Verifica autenticação para a rota atual
 * @param string $route Rota atual
 * @return array|null Retorna os dados do usuário ou null para rotas públicas/GET sem token
 */
function requireAuth(string $route): ?array
{
    global $publicRoutes, $conn;

    // Rotas públicas não precisam de token
    if (in_array($route, $publicRoutes)) {
        return null;
    }

    $payload = JWT::validateRequest();
    
    // Log para depuração de tokens
    if (!$payload) {
        // error_log("[AUTH_DEBUG] Falha na validação do JWT para rota: $route");
    }

    // Se o token for válido, retorna o payload
    if ($payload) {
        // v4.57.0 (A2): token revogado no logout deixa de valer na hora
        if (!empty($payload['jti']) && $conn instanceof PDO && AuthSession::tokenRevogado($conn, (string)$payload['jti'])) {
            http_response_code(401);
            echo json_encode([
                'error' => 'SESSAO_ENCERRADA',
                'message' => 'Sua sessão foi encerrada. Faça login novamente.'
            ]);
            exit;
        }

        // v4.58.0 (A3): sessão via cookie → alterações exigem header que outro site não consegue
        // enviar sem passar pelo CORS (proteção CSRF, somada ao SameSite=Strict do cookie)
        $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (JWT::getTokenSource() === 'cookie' && !in_array($metodo, ['GET', 'HEAD', 'OPTIONS'], true)
            && strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'xmlhttprequest') {
            http_response_code(403);
            echo json_encode([
                'error' => 'REQUISICAO_BLOQUEADA',
                'message' => 'Requisição recusada por segurança. Atualize a página (Ctrl+F5) e tente novamente.'
            ]);
            exit;
        }

        // v4.57.0 (C5): troca de senha obrigatória — token só acessa troca de senha e logout
        if (!empty($payload['pwd_change']) && !in_array($route, ['change_password', 'logout'], true)) {
            http_response_code(403);
            echo json_encode([
                'error' => 'TROCA_SENHA_OBRIGATORIA',
                'message' => 'Defina uma nova senha para continuar.'
            ]);
            exit;
        }

        $user_id = $payload['user_id'] ?? $payload['id'] ?? 'unknown';
        
        // SUPERADMIN e ADMIN podem trocar o contexto de empresa via header X-Company-Context
        if (($payload['perfil'] ?? '') === 'SUPERADMIN' || ($payload['perfil'] ?? '') === 'ADMIN') {
            $headers = getallheaders();
            $contextId = $headers['X-Company-Context'] ?? $headers['x-company-context'] ?? $_SERVER['HTTP_X_COMPANY_CONTEXT'] ?? null;

            if ($contextId && is_numeric($contextId)) {
                $payload['id_empresa'] = (int)$contextId;
            }
            // v4.55.0 (C4): removido fallback id_empresa=1 — sem contexto e sem empresa no token,
            // a garantia final abaixo rejeita (antes caía silenciosamente na empresa 1).
        }

        // Garantia final: se id_empresa não definido no token, rejeita
        if (!isset($payload['id_empresa']) || $payload['id_empresa'] <= 0) {
            http_response_code(401);
            echo json_encode(['error' => 'Token inválido: empresa não identificada']);
            exit;
        }

        return $payload;
    }

    // Se o token for inválido, nega acesso (Fail-Closed)
    // Bloqueia qualquer acesso não autenticado para rotas privadas
    http_response_code(401);
    echo json_encode([
        'error' => 'Não autorizado',
        'message' => 'Acesso permitido apenas para usuários autenticados.'
    ]);
    exit;
}

/**
 * Verifica se o usuário tem o perfil necessário
 */
function requireRole($userData, array $allowedRoles): void
{
    // Prevenção de crash: se userData for null (erro de autenticação prévia), nega imediatamente
    if ($userData === null) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Sessão inválida',
            'message' => 'Não foi possível identificar seu usuário. Por favor, faça login novamente.'
        ]);
        exit;
    }

    // Se o perfil não estiver definido no token (tokens antigos), assume LEITURA por padrão
    $userRole = $userData['perfil'] ?? 'LEITURA';

    // SUPERADMIN has full access to everything/any route
    if ($userRole === 'SUPERADMIN') {
        return;
    }

    // Se ainda assim estiver vazio, usa LEITURA
    if (empty($userRole)) {
        $userRole = 'LEITURA';
    }

    if (!in_array($userRole, $allowedRoles)) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Acesso negado',
            'message' => 'Você não tem permissão para acessar este recurso. Perfil necessário: ' . implode(' ou ', $allowedRoles)
        ]);
        exit;
    }
}
// End of file