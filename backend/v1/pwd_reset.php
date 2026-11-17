<?php
require_once 'config.php';
header('Content-Type: application/json');

$email = 'valterpcjria@gmail.com';
$nova_senha = '123456'; // Senha temporária
$hash = password_hash($nova_senha, PASSWORD_DEFAULT);

try {
    $stmt = $conn->prepare("UPDATE usuarios SET senha_hash = :hash WHERE email = :email");
    $stmt->execute(['hash' => $hash, 'email' => $email]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "status" => "success",
            "message" => "Senha redefinida com sucesso para: $nova_senha",
            "email" => $email
        ]);
        
        // Logar essa alteração
        registrarLog($conn, 1, 'USUARIO', 1, 'SENHA_RESET', "Senha resetada via script de diagnóstico");
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Usuário não encontrado ou senha já é a mesma."
        ]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
