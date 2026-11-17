<?php
require_once 'config.php';
header('Content-Type: application/json');

$email_alvo = 'valterpcjria@gmail.com';
$senhas_para_testar = ['123456', 'admin123', 'mudar123', 'frimelo2024'];

$response = [
    'diagnostic_time' => date('Y-m-d H:i:s'),
    'target_email' => $email_alvo,
    'database_check' => [],
    'all_users' => []
];

try {
    // 1. Verificar se o usuário existe exatamente com esse email
    $stmt = $conn->prepare("SELECT id, nome, email, senha_hash FROM usuarios WHERE email = :email");
    $stmt->execute(['email' => $email_alvo]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $response['database_check']['status'] = 'FOUND';
        $response['database_check']['user_id'] = $user['id'];
        $response['database_check']['stored_hash'] = substr($user['senha_hash'], 0, 10) . '...';
        
        // 2. Testar se a senha bate com alguma das conhecidas
        $response['database_check']['password_verification'] = [];
        foreach ($senhas_para_testar as $senha) {
            $match = password_verify($senha, $user['senha_hash']);
            $response['database_check']['password_verification'][$senha] = $match ? 'MATCH (CORRETA)' : 'INVALID';
        }
    } else {
        $response['database_check']['status'] = 'NOT_FOUND';
        
        // 3. Se não achou exato, procurar parecidos (erro de digitação no banco)
        $stmtAll = $conn->query("SELECT id, nome, email FROM usuarios");
        $all = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
        $response['all_users'] = $all; // Listar todos para ver se tem erro de digitação
    }

} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
