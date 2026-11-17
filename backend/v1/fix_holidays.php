<?php
// backend/v1/fix_holidays.php
/**
 * Script de emergência para corrigir a tabela de feriados e popular dados iniciais.
 * Use este script após o deploy da v4.43.0+ se a lista de feriados estiver vazia.
 */

require_once 'config.php';
header('Content-Type: text/html; charset=utf-8');

echo "<div style='font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.6;'>";
echo "<h2 style='color: #2563eb;'>Reparador de Feriados - Folha Frimelo</h2>";
echo "<hr>";

try {
    // 1. Verificar se a tabela empresas tem os novos campos
    echo "Verificando estrutura da tabela 'empresas'... ";
    $stmtEmp = $conn->query("DESCRIBE empresas");
    $empColumns = $stmtEmp->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('uf', $empColumns)) {
        $conn->exec("ALTER TABLE empresas ADD COLUMN uf CHAR(2) NULL AFTER cnpj, ADD COLUMN nome_cidade VARCHAR(150) NULL AFTER uf");
        echo "<span style='color:green'>Campos 'uf' e 'nome_cidade' adicionados!</span><br>";
    } else {
        echo "<span style='color:gray'>Estrutura OK.</span><br>";
    }

    // 2. Verificar se a nova tabela 'feriados' existe
    $stmtTab = $conn->query("SHOW TABLES LIKE 'feriados'");
    $existsFeriados = $stmtTab->rowCount() > 0;

    if (!$existsFeriados) {
        echo "Tabela 'feriados' não encontrada. Verificando 'feriados_nacionais'... ";
        $stmtTabOld = $conn->query("SHOW TABLES LIKE 'feriados_nacionais'");
        
        if ($stmtTabOld->rowCount() > 0) {
            echo "Migrando 'feriados_nacionais' para 'feriados'... ";
            $conn->exec("ALTER TABLE feriados_nacionais RENAME TO feriados");
            echo "<span style='color:green'>Renomeado com sucesso!</span><br>";
        } else {
            echo "Criando nova tabela 'feriados'... ";
            $conn->exec("CREATE TABLE `feriados` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `nome` VARCHAR(100) NOT NULL,
                `data` DATE NOT NULL,
                `tipo` ENUM('nacional', 'estadual', 'municipal') DEFAULT 'nacional',
                `uf` CHAR(2) NULL,
                `cidade` VARCHAR(150) NULL,
                `recorrente` TINYINT(1) NOT NULL DEFAULT 1,
                `ativo` TINYINT(1) NOT NULL DEFAULT 1,
                `empresa_id` INT UNSIGNED NULL,
                `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY `uk_feriado_data_local` (`data`, `tipo`, `uf`, `cidade`, `empresa_id`),
                INDEX `idx_feriado_empresa` (`empresa_id`),
                INDEX `idx_feriado_busca` (`tipo`, `uf`, `cidade`, `ativo`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            echo "<span style='color:green'>Criada com sucesso!</span><br>";
        }
    }

    // 3. Garantir que as colunas novas existam (caso o rename tenha funcionado mas colunas não foram adicionadas)
    $stmtCol = $conn->query("DESCRIBE feriados");
    $ferColumns = $stmtCol->fetchAll(PDO::FETCH_COLUMN);

    // 3.5 Auto-atualizar o ano para 2026 em feriados recorrentes de 2025 (UX)
    echo "Atualizando anos de feriados recorrentes para 2026... ";
    $conn->exec("UPDATE feriados SET data = REPLACE(data, '2025-', '2026-') WHERE recorrente = 1 AND data LIKE '2025-%'");
    echo "<span style='color:green'>OK.</span><br>";

    // 4. Limpar e Popular com Feriados Nacionais Oficiais de 2026
    echo "Limpando e re-semeando feriados nacionais para 2026... ";
    
    // Primeiro limpamos os nacionais para evitar duplicidade 2025/2026 (conforme pedido do usuário)
    $conn->exec("DELETE FROM feriados WHERE tipo = 'nacional'");
    
    $sqlSeed = "INSERT IGNORE INTO feriados (nome, data, tipo, recorrente) VALUES 
        ('Confraternização Universal', '2026-01-01', 'nacional', 1),
        ('Carnaval 2026', '2026-02-17', 'nacional', 0),
        ('Sexta-feira Santa 2026', '2026-04-03', 'nacional', 0),
        ('Tiradentes', '2026-04-21', 'nacional', 1),
        ('Dia do Trabalho', '2026-05-01', 'nacional', 1),
        ('Corpus Christi 2026', '2026-06-04', 'nacional', 0),
        ('Independência do Brasil', '2026-09-07', 'nacional', 1),
        ('Nossa Sra. Aparecida', '2026-10-12', 'nacional', 1),
        ('Finados', '2026-11-02', 'nacional', 1),
        ('Proclamação da República', '2026-11-15', 'nacional', 1),
        ('Dia da Consciência Negra', '2026-11-20', 'nacional', 1),
        ('Natal', '2026-12-25', 'nacional', 1)";
    $conn->exec($sqlSeed);
    echo "<span style='color:green'>Sucesso!</span><br>";

    echo "<hr>";
    echo "<h3 style='color: #059669;'>Processo concluído!</h3>";
    echo "<p>A lista de feriados deve aparecer normalmente agora.</p>";
    echo "<a href='/feriados' style='display:inline-block; padding: 10px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;'>Voltar ao Sistema</a>";

} catch (Exception $e) {
    echo "<div style='color:red; background: #fee2e2; padding: 15px; border-radius: 5px; border: 1px solid #ef4444; margin-top: 20px;'>";
    echo "<strong>Erro Fatal:</strong> " . $e->getMessage();
    echo "</div>";
}

echo "</div>";
