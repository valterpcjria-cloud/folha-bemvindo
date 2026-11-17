<?php
// backend/v1/saas_stats.php
require_once 'config.php';
require_once 'lib/Database.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h2>Relatório de Dados Multi-Empresa</h2>";

try {
    // 1. Listar Empresas
    echo "<h3>Tabela: empresas</h3>";
    $companies = $conn->query("SELECT * FROM empresas")->fetchAll(PDO::FETCH_ASSOC);
    echo "<table border='1'><tr><th>ID</th><th>Razão Social</th><th>Slug</th><th>Ativa</th></tr>";
    foreach ($companies as $c) {
        echo "<tr><td>{$c['id']}</td><td>{$c['razao_social']}</td><td>{$c['slug']}</td><td>{$c['ativa']}</td></tr>";
    }
    echo "</table>";

    // 2. Contagem de Funcionários por Empresa
    echo "<h3>Funcionários por Empresa (Agrupado por id_empresa)</h3>";
    $stats = $conn->query("SELECT id_empresa, COUNT(*) as total FROM funcionarios GROUP BY id_empresa")->fetchAll(PDO::FETCH_ASSOC);
    echo "<table border='1'><tr><th>ID Empresa</th><th>Total Funcionários</th></tr>";
    foreach ($stats as $s) {
        echo "<tr><td>" . ($s['id_empresa'] ?? 'NULL/VAZIO') . "</td><td>{$s['total']}</td></tr>";
    }
    echo "</table>";

    // 3. Amostra de Funcionários sem empresa
    $nullEmpresas = $conn->query("SELECT id, nome FROM funcionarios WHERE id_empresa IS NULL OR id_empresa = 0 LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    if (count($nullEmpresas) > 0) {
        echo "<p style='color:red'>AVISO: Existem funcionários sem ID de empresa definido!</p>";
    }

    // 4. Contagem de Usuários por Empresa
    echo "<h3>Usuários por Empresa</h3>";
    $statsU = $conn->query("SELECT id_empresa, COUNT(*) as total FROM usuarios GROUP BY id_empresa")->fetchAll(PDO::FETCH_ASSOC);
    echo "<table border='1'><tr><th>ID Empresa</th><th>Total Usuários</th></tr>";
    foreach ($statsU as $s) {
        echo "<tr><td>" . ($s['id_empresa'] ?? 'NULL/VAZIO') . "</td><td>{$s['total']}</td></tr>";
    }
    echo "</table>";

}
catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
?>