<?php
// /backend/v1/fix_password.php
require_once 'config.php';

$email = 'valterpcjria@gmail.com';
$nova_senha = AuthSession::gerarSenhaTemporaria(); // sem senha fixa no código
$hash = password_hash($nova_senha, PASSWORD_DEFAULT);

try {
    $stmt = $conn->prepare("UPDATE usuarios SET senha_hash = ?, ativo = 1, must_change_password = 1 WHERE email = ?");
    $stmt->execute([$hash, $email]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "status" => "success",
            "message" => "Senha de $email resetada com sucesso para: $nova_senha",
            "info" => "Agora tente logar no sistema com essa senha."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Usuário $email não encontrado no banco de dados.",
            "suggestion" => "Verifique se o email está correto no banco."
        ]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
// End of file
