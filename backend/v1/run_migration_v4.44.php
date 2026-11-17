<?php
// /backend/v1/run_migration_v4.44.php
require_once 'lib/Database.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $conn = Database::connect();
    echo "<h2>Iniciando Migração v4.44.0</h2>";
    echo "Conectado ao banco com sucesso.<br><br>";
    
    // Caminho corrigido para a pasta de migrations (um nível acima de v1)
    $migrationPath = '../migrations/v4.44.0_relacao_calculo_fields.sql';
    
    if (!file_exists($migrationPath)) {
        throw new Exception("Arquivo de migração não encontrado em: $migrationPath");
    }
    
    $sql = file_get_contents($migrationPath);
    
    // Separar comandos por ponto e vírgula
    $commands = explode(';', $sql);
    $successCount = 0;
    $ignoreCount = 0;
    $errorCount = 0;

    foreach ($commands as $cmd) {
        $cmd = trim($cmd);
        if (empty($cmd)) continue;
        
        try {
            $conn->exec($cmd);
            echo "<span style='color:green'>[OK]</span> " . substr($cmd, 0, 80) . "...<br>";
            $successCount++;
        } catch (PDOException $e) {
            // Ignorar erro 1060 (Coluna já existe) ou 1061 (Índice já existe)
            if ($e->getCode() == '42S21' || strpos($e->getMessage(), '1060') !== false) {
                echo "<span style='color:orange'>[INFO]</span> " . substr($cmd, 0, 80) . "... (Coluna já existe, pulando)<br>";
                $ignoreCount++;
            } else {
                echo "<span style='color:red'>[ERRO]</span> " . substr($cmd, 0, 80) . "... <br><b>Mensagem:</b> " . $e->getMessage() . "<br>";
                $errorCount++;
            }
        }
    }
    
    echo "<h3>Resumo da Migração:</h3>";
    echo "<ul>
            <li>Comandos executados: $successCount</li>
            <li>Comandos ignorados (já existentes): $ignoreCount</li>
            <li>Erros críticos: $errorCount</li>
          </ul>";
          
    if ($errorCount === 0) {
        echo "<h2 style='color:green'>MIGRAÇÃO CONCLUÍDA COM SUCESSO!</h2>";
    } else {
        echo "<h2 style='color:red'>MIGRAÇÃO CONCLUÍDA COM ERROS.</h2>";
    }

} catch (Exception $e) {
    echo "<h2 style='color:red'>ERRO FATAL:</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
