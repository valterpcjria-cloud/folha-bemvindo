<?php
// /backend/v1/create_saas_admin.php
// ACESSE ESTE ARQUIVO UMA VEZ PARA CRIAR O SUPERADMIN E DEPOIS EXCLUA-O!

require_once __DIR__ . '/config.php';

$nome = 'Valter (SuperAdmin)';
$email = 'valterpcjr@gmail.com';
$senha = AuthSession::gerarSenhaTemporaria(); // sem senha fixa no código
$perfil = 'SUPERADMIN';
$id_empresa = 1; // Default

$hash = password_hash($senha, PASSWORD_DEFAULT);

try {
    // Verifica se já existe
    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        // Se existe, atualiza a senha e o perfil (garantia)
        $stmt = $conn->prepare("UPDATE usuarios SET senha_hash = ?, perfil = ?, id_empresa = ?, ativo = 1, must_change_password = 1 WHERE email = ?");
        $stmt->execute([$hash, $perfil, 1, $email]); // Usando id_empresa 1 para evitar erro de FK
        echo "✅ Sucesso! Senha e perfil do usuário $email foram ATUALIZADOS.\n";
    } else {
        // Se não existe, cria
        $stmt = $conn->prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, id_empresa, must_change_password) VALUES (?, ?, ?, ?, 1, ?, 1)");
        $stmt->execute([$nome, $email, $hash, $perfil, 1]); // Usando id_empresa 1
        echo "✅ Sucesso! Novo usuário SuperAdmin CRIADO.\n";
    }

    echo "Login: $email\n";
    echo "Senha temporária: $senha (troca obrigatória no primeiro login)\n";
    echo "Perfil: $perfil\n";
    echo "\nATENÇÃO: Agora tente logar. Se funcionar, EXCLUA ESTE ARQUIVO por segurança!";
} catch (Exception $e) {
    die("Erro ao criar usuário: " . $e->getMessage());
}
?>
