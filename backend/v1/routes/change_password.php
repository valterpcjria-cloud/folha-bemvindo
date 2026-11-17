<?php
// /api/v1/routes/change_password.php
// v4.57.0 (C5): troca de senha (obrigatória no 1º login ou voluntária).
// Valida senha atual + regra da nova senha, revoga o token atual e devolve um novo token.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Método não permitido"]);
    exit;
}

$data = getJsonInput();
$senhaAtual = (string)($data['senha_atual'] ?? '');
$novaSenha = (string)($data['nova_senha'] ?? '');

if ($senhaAtual === '' || $novaSenha === '') {
    http_response_code(400);
    echo json_encode(["error" => "Informe a senha atual e a nova senha."]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT * FROM usuarios WHERE id = ? AND ativo = 1 LIMIT 1");
    $stmt->execute([$authUser['user_id'] ?? 0]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($senhaAtual, $user['senha_hash'])) {
        http_response_code(400);
        echo json_encode(["error" => "Senha atual incorreta."]);
        exit;
    }

    $erroSenha = AuthSession::validarNovaSenha($novaSenha, $senhaAtual);
    if ($erroSenha !== null) {
        http_response_code(400);
        echo json_encode(["error" => $erroSenha]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE usuarios SET senha_hash = ?, must_change_password = 0 WHERE id = ?");
    $stmt->execute([password_hash($novaSenha, PASSWORD_DEFAULT), $user['id']]);

    // Token antigo (possivelmente restrito a troca de senha) deixa de valer
    AuthSession::revogarToken($conn, $authUser);

    registrarLog($conn, $user['id'], 'USUARIO', $user['id'], 'TROCA_SENHA', 'Usuário alterou a própria senha', $user['id_empresa']);

    $token = AuthSession::emitirToken($user, false);
    AuthSession::definirCookieSessao($token); // v4.58.0
    echo json_encode(AuthSession::respostaSessao($user, $token, false));
} catch (PDOException $e) {
    error_log('[change_password] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Erro ao alterar a senha. Tente novamente."]);
}
// End of file
