<?php
declare(strict_types=1);

/**
 * FOLHA BEM VINDO — cria (ou redefine) um usuário SUPERADMIN pela linha de comando.
 *
 * Fica FORA do site (/opt/bemvindo-scripts): não dá para chamar pelo navegador.
 * Uso, na VPS:
 *   docker compose exec app php /opt/bemvindo-scripts/criar_superadmin.php "Nome" email@exemplo.com
 *
 * Gera uma senha temporária aleatória (mostrada só aqui, uma vez) e marca must_change_password = 1:
 * no primeiro login o sistema obriga o usuário a criar a própria senha.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$backend = getenv('BEMVINDO_BACKEND') ?: '/var/www/html/backend/v1';
require_once $backend . '/lib/Database.php';
require_once $backend . '/lib/AuthSession.php';

$nome = trim($argv[1] ?? '');
$email = strtolower(trim($argv[2] ?? ''));
$idEmpresa = (int)($argv[3] ?? 1);

if ($nome === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Uso: php criar_superadmin.php \"Nome Completo\" email@exemplo.com [id_empresa=1]\n");
    exit(1);
}

$conn = Database::connect();

$stmt = $conn->prepare("SELECT id FROM empresas WHERE id = ?");
$stmt->execute([$idEmpresa]);
if (!$stmt->fetch()) {
    fwrite(STDERR, "Empresa id=$idEmpresa não existe. Cadastre a empresa principal antes.\n");
    exit(1);
}

$senha = AuthSession::gerarSenhaTemporaria(12);
$hash = password_hash($senha, PASSWORD_DEFAULT);

$stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$existente = $stmt->fetch();

if ($existente) {
    $stmt = $conn->prepare("UPDATE usuarios SET nome = ?, senha_hash = ?, perfil = 'SUPERADMIN', ativo = 1,
                            id_empresa = ?, must_change_password = 1 WHERE id = ?");
    $stmt->execute([$nome, $hash, $idEmpresa, $existente['id']]);
    $acao = 'ATUALIZADO (senha redefinida)';
} else {
    $stmt = $conn->prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, id_empresa, must_change_password)
                            VALUES (?, ?, ?, 'SUPERADMIN', 1, ?, 1)");
    $stmt->execute([$nome, $email, $hash, $idEmpresa]);
    $acao = 'CRIADO';
}

echo "SUPERADMIN $acao\n";
echo "  Nome:  $nome\n";
echo "  Login: $email\n";
echo "  Senha temporária: $senha\n";
echo "No primeiro login o sistema vai pedir para criar a senha definitiva.\n";
