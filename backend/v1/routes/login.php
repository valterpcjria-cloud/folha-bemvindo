<?php
// /api/v1/routes/login.php

require_once __DIR__ . '/../lib/JWT.php';
require_once __DIR__ . '/../lib/AuthSession.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Rate limiting específico para login (5 tentativas por minuto)
    // v4.55.0 (A1): fail-closed — sem cache gravável, login bloqueado (evita brute force sem limite)
    if (class_exists('RateLimiter') && !RateLimiter::isAvailable()) {
        http_response_code(503);
        echo json_encode([
            "error" => "Serviço de login temporariamente indisponível",
            "message" => "Tente novamente em instantes. Se persistir, contate o suporte."
        ]);
        exit;
    }
    if (class_exists('RateLimiter') && !RateLimiter::checkLogin()) {
        http_response_code(429);
        echo json_encode([
            "error" => "Muitas tentativas de login",
            "message" => "Aguarde 1 minuto antes de tentar novamente."
        ]);
        exit;
    }
    
    $data = getJsonInput();
    
    // Sanitização de entrada (defensivo: funciona sem a classe)
    $email = class_exists('InputSanitizer') 
        ? InputSanitizer::sanitizeEmail($data['email'] ?? '') 
        : trim($data['email'] ?? '');
    $senha = $data['senha'] ?? ($data['password'] ?? '');

    if (empty($email) || empty($senha)) {
        http_response_code(400);
        echo json_encode(["error" => "Email e senha são obrigatórios"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($senha, $user['senha_hash'])) {
        // Registrar log de login (com usuario_id e id_empresa válidos)
        registrarLog($conn, $user['id'], 'USUARIO', $user['id'], 'LOGIN', 'Usuário realizou login no sistema', $user['id_empresa']);

        // v4.57.0 (C5): troca obrigatória se marcada no cadastro OU se ainda usa a senha padrão legada
        $trocaSenha = ((int)($user['must_change_password'] ?? 0) === 1)
            || hash_equals(AuthSession::SENHA_PADRAO_LEGADA, (string)$senha);

        // Gerar token JWT (v4.57.0: com jti para revogação no logout)
        $token = AuthSession::emitirToken($user, $trocaSenha);

        // v4.58.0 (A3): sessão em cookie HttpOnly. O token ainda volta no corpo apenas
        // para telas antigas em cache (transição) — o frontend novo não o armazena.
        AuthSession::definirCookieSessao($token);

        // Retornar dados do usuário com token
        echo json_encode(AuthSession::respostaSessao($user, $token, $trocaSenha));
    } else {
        // Log de tentativa falha (sem user_id, id_empresa = NULL para log global)
        registrarLog($conn, 0, 'USUARIO', 0, 'LOGIN_FALHA', "Tentativa de login inválida: {$email}", null);
        http_response_code(401);
        echo json_encode(["error" => "Credenciais inválidas ou usuário inativo"]);
        exit;
    }
}
// End of file