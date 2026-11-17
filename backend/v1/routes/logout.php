<?php
// /api/v1/routes/logout.php
// v4.57.0 (A2): revoga o token atual — deixa de valer imediatamente, não só ao expirar.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Método não permitido"]);
    exit;
}

AuthSession::revogarToken($conn, $authUser);
AuthSession::apagarCookieSessao(); // v4.58.0

if (!empty($authUser['user_id'])) {
    registrarLog($conn, $authUser['user_id'], 'USUARIO', $authUser['user_id'], 'LOGOUT', 'Usuário encerrou a sessão', $authUser['id_empresa'] ?? null);
}

echo json_encode(["message" => "Sessão encerrada"]);
// End of file
