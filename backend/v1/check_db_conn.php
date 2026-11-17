<?php
// backend/v1/debug_connection.php
require_once 'config.php';
require_once 'lib/Database.php';
require_once 'middleware/auth.php';

header('Content-Type: text/plain; charset=utf-8');

echo "--- DEBUG CONNECTION ---\n";

try {
    $conn = Database::connect();

    // 1. Qual banco estou usando?
    $dbName = $conn->query("SELECT DATABASE()")->fetchColumn();
    echo "Banco de Dados Ativo: " . $dbName . "\n";

    // 2. Listagem de Tabelas
    echo "\nTabelas no Banco:\n";
    $tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    print_r($tables);

    // 3. Contagem de Perfis
    echo "\nResumo de Perfis de Usuários:\n";
    $profiles = $conn->query("SELECT perfil, COUNT(*) as total FROM usuarios GROUP BY perfil")->fetchAll(PDO::FETCH_ASSOC);
    print_r($profiles);

    // 4. Conteúdo da tabela empresas
    echo "\nConteúdo da tabela 'empresas':\n";
    $stmt = $conn->query("SELECT id, razao_social, slug FROM empresas");
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($res);

    // 4. Verificação de Usuário Logado (Simulado se possível)
    echo "\nVerificando Token (Header Authorization):\n";
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? 'NÃO ENVIADO';
    echo "Auth Header: " . $authHeader . "\n";

    // 5. Tenta validar o token se enviado
    if ($authHeader !== 'NÃO ENVIADO') {
        try {
            require_once 'lib/JWT.php';
            $payload = JWT::validateRequest();
            echo "Payload JWT: ";
            print_r($payload);
        }
        catch (Exception $e) {
            echo "Erro JWT: " . $e->getMessage() . "\n";
        }
    }

}
catch (Exception $e) {
    echo "ERRO FATAL: " . $e->getMessage() . "\n";
}
?>