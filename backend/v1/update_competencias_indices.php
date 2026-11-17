<?php
// backend/v1/update_competencias_indices.php
require_once 'config.php';

// Bypass de autenticação via SETUP_KEY para manutenção via browser
$setup_key = $_GET['key'] ?? '';
$expected_key = Database::getEnv('SETUP_KEY');
if (!$expected_key || $setup_key !== $expected_key) {
    http_response_code(403);
    die(json_encode(["error" => "Não autorizado", "message" => "Bypass key inválida."]));
}

header('Content-Type: text/html; charset=utf-8');

try {
    echo "<h2>Ajustando Índices de Competências - Multi-Empresa</h2>";
    echo "Conectado ao banco.<br><hr>";

    // 1. Mostrar índices atuais para log
    echo "<b>Índices atuais:</b><br>";
    $stmt = $conn->query("SHOW INDEX FROM competencias");
    $indices = $stmt->fetchAll();
    foreach ($indices as $idx) {
        echo "- {$idx['Key_name']} (Coluna: {$idx['Column_name']})<br>";
    }
    echo "<hr>";

    // 2. Tentar remover uk_mes_ano se ele existir
    $hasLegacyUK = false;
    foreach ($indices as $idx) {
        if ($idx['Key_name'] === 'uk_mes_ano') {
            $hasLegacyUK = true;
            break;
        }
    }

    if ($hasLegacyUK) {
        echo "Removendo índice restritivo 'uk_mes_ano'... ";
        $conn->exec("ALTER TABLE competencias DROP INDEX uk_mes_ano");
        echo "<span style='color:green'>Sucesso!</span><br>";
    } else {
        echo "ℹ Índice 'uk_mes_ano' não encontrado ou já removido.<br>";
    }

    // 3. Adicionar novo índice composto (mes, ano, id_empresa)
    $hasNewUK = false;
    foreach ($indices as $idx) {
        if ($idx['Key_name'] === 'uk_mes_ano_empresa') {
            $hasNewUK = true;
            break;
        }
    }

    if (!$hasNewUK) {
        echo "Adicionando novo índice único composto 'uk_mes_ano_empresa'... ";
        $conn->exec("ALTER TABLE competencias ADD UNIQUE KEY uk_mes_ano_empresa (mes, ano, id_empresa)");
        echo "<span style='color:green'>Sucesso!</span><br>";
    } else {
        echo "ℹ Índice 'uk_mes_ano_empresa' já existe.<br>";
    }

    echo "<hr><h3 style='color:green'>Ajuste concluído com sucesso!</h3>";
    echo "Agora o sistema deve permitir abrir o mesmo mês/ano para diferentes empresas.<br><br>";
    echo "<a href='/'>Voltar ao Sistema</a>";

} catch (Exception $e) {
    echo "<h3 style='color:red'>ERRO: " . $e->getMessage() . "</h3>";
}
?>
