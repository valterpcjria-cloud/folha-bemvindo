<?php
// backend/v1/repair_schema.php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

try {
    echo "<h2>Reparando Banco de Dados - Correção de Lançamentos</h2>";
    echo "Conectado ao banco.<br><hr>";

    $tablesToFix = [
        'competencias',
        'lancamentos_eventos',
        'logs_auditoria',
        'usuarios'
    ];

    foreach ($tablesToFix as $table) {
        try {
            // Verifica se a coluna já existe para não dar erro
            $stmt = $conn->query("DESCRIBE $table");
            $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (!in_array('id_empresa', $columns)) {
                echo "Adicionando coluna 'id_empresa' à tabela '$table'... ";
                $conn->exec("ALTER TABLE $table ADD COLUMN id_empresa INT UNSIGNED DEFAULT 1 AFTER id");
                $conn->exec("ALTER TABLE $table ADD INDEX idx_{$table}_empresa (id_empresa)");
                echo "<span style='color:green'>Sucesso!</span><br>";
            }
            else {
                echo "ℹ Coluna 'id_empresa' já existe em '$table'.<br>";
            }

            // Garante que os dados existentes estejam vinculados à empresa 1
            $conn->exec("UPDATE $table SET id_empresa = 1 WHERE id_empresa IS NULL OR id_empresa = 0");
            echo "✔ Vínculos em '$table' atualizados para empresa ID 1.<br>";

        }
        catch (Exception $e) {
            echo "<span style='color:red'>Erro ao processar '$table': " . $e->getMessage() . "</span><br>";
        }
    }

    // Caso especial: Índices da tabela competencias
    try {
        echo "Ajustando índices da tabela 'competencias'... ";
        // 1. Mostrar índices atuais
        $stmt = $conn->query("SHOW INDEX FROM competencias");
        $allIndices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $indicesNames = array_column($allIndices, 'Key_name');

        // 2. Remover uk_mes_ano antigo se existir
        if (in_array('uk_mes_ano', $indicesNames)) {
            $conn->exec("ALTER TABLE competencias DROP INDEX uk_mes_ano");
            echo "Índice antigo 'uk_mes_ano' removido. ";
        }

        // 3. Adicionar uk_mes_ano_empresa se não existir
        if (!in_array('uk_mes_ano_empresa', $indicesNames)) {
            $conn->exec("ALTER TABLE competencias ADD UNIQUE KEY uk_mes_ano_empresa (mes, ano, id_empresa)");
            echo "<span style='color:green'>Novo índice multi-empresa criado!</span><br>";
        } else {
            echo "ℹ Índice multi-empresa já existe.<br>";
        }
    } catch (Exception $e) {
        echo "<span style='color:red'>Erro ao ajustar índices de competencias: " . $e->getMessage() . "</span><br>";
    }

    // Caso especial: Módulo DSR (Descanso Semanal Remunerado)
    try {
        echo "<hr><h3>Reparando Módulo DSR...</h3>";
        
        // 1. Criar Tabelas
        $dsr_tables = [
            "feriados_nacionais" => "CREATE TABLE `feriados_nacionais` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `data` DATE NOT NULL UNIQUE,
                `descricao` VARCHAR(100) NOT NULL,
                `tipo` ENUM('nacional', 'estadual', 'municipal') DEFAULT 'nacional',
                `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            
            "dsr_config_eventos" => "CREATE TABLE `dsr_config_eventos` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `evento_id` BIGINT UNSIGNED NOT NULL,
                `tipo_dsr` ENUM('horas_extras', 'comissao', 'producao') NOT NULL,
                `ativo` TINYINT(1) DEFAULT 1,
                `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            
            "dsr_faltas_pre_dsr" => "CREATE TABLE `dsr_faltas_pre_dsr` (
                `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `funcionario_id` BIGINT UNSIGNED NOT NULL,
                `competencia_id` BIGINT UNSIGNED NOT NULL,
                `data_falta` DATE NOT NULL,
                `data_dsr_perdido` DATE NULL,
                `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY `uk_falta_dsr` (`funcionario_id`, `competencia_id`, `data_falta`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            
            "dsr_calculado" => "CREATE TABLE `dsr_calculado` (
                `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `funcionario_id` BIGINT UNSIGNED NOT NULL,
                `competencia_id` BIGINT UNSIGNED NOT NULL,
                `mes` TINYINT UNSIGNED NOT NULL,
                `ano` SMALLINT UNSIGNED NOT NULL,
                `dias_uteis_mes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
                `dias_dsr_mes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
                `faltas_pre_dsr_qtd` TINYINT UNSIGNED NOT NULL DEFAULT 0,
                `dsr_horas_extras` DECIMAL(12,2) DEFAULT 0,
                `dsr_comissoes` DECIMAL(12,2) DEFAULT 0,
                `dsr_horista` DECIMAL(12,2) DEFAULT 0,
                `dsr_bruto` DECIMAL(12,2) DEFAULT 0,
                `dsr_desconto_faltas` DECIMAL(12,2) DEFAULT 0,
                `dsr_liquido` DECIMAL(12,2) DEFAULT 0,
                `memoria_calculo` TEXT NULL,
                `calculado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `calculado_por` VARCHAR(50) DEFAULT 'sistema',
                UNIQUE KEY `uk_func_comp_dsr` (`funcionario_id`, `competencia_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            
            "dsr_fila_recalculo" => "CREATE TABLE `dsr_fila_recalculo` (
                `funcionario_id` BIGINT UNSIGNED NOT NULL,
                `competencia_id` BIGINT UNSIGNED NOT NULL,
                `id_empresa` INT UNSIGNED NOT NULL,
                `marcado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`funcionario_id`, `competencia_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        ];

        foreach ($dsr_tables as $tableName => $sql) {
            $stmt = $conn->query("SHOW TABLES LIKE '$tableName'");
            if ($stmt->rowCount() == 0) {
                echo "Criando tabela '$tableName'... ";
                $conn->exec($sql);
                echo "<span style='color:green'>Sucesso!</span><br>";
            } else {
                echo "ℹ Tabela '$tableName' já existe.<br>";
            }
        }

        // 2. Popular Feriados (2025/2026)
        echo "Populando feriados base... ";
        $conn->exec("INSERT IGNORE INTO `feriados_nacionais` (`data`, `descricao`, `tipo`) VALUES 
            ('2025-01-01', 'Confraternização Universal', 'nacional'), ('2025-03-04', 'Carnaval', 'nacional'),
            ('2025-04-18', 'Paixão de Cristo', 'nacional'), ('2025-04-21', 'Tiradentes', 'nacional'),
            ('2025-05-01', 'Dia do Trabalho', 'nacional'), ('2025-09-07', 'Independência do Brasil', 'nacional'),
            ('2025-10-12', 'Nossa Sra. Aparecida', 'nacional'), ('2025-11-02', 'Finados', 'nacional'),
            ('2025-11-15', 'Proclamação da República', 'nacional'), ('2025-11-20', 'Dia da Consciência Negra', 'nacional'),
            ('2025-12-25', 'Natal', 'nacional'),
            ('2026-01-01', 'Confraternização Universal', 'nacional'), ('2026-02-17', 'Carnaval', 'nacional'),
            ('2026-04-03', 'Paixão de Cristo', 'nacional'), ('2026-04-21', 'Tiradentes', 'nacional'),
            ('2026-05-01', 'Dia do Trabalho', 'nacional'), ('2026-09-07', 'Independência do Brasil', 'nacional'),
            ('2026-10-12', 'Nossa Sra. Aparecida', 'nacional'), ('2026-11-02', 'Finados', 'nacional'),
            ('2026-11-15', 'Proclamação da República', 'nacional'), ('2026-11-20', 'Dia da Consciência Negra', 'nacional'),
            ('2026-12-25', 'Natal', 'nacional')");
        echo "<span style='color:green'>Sucesso!</span><br>";

        // 3. Recriar Triggers
        echo "Limpando e Recriando Triggers de DSR... ";
        $conn->exec("DROP TRIGGER IF EXISTS `trg_lanc_dsr_insert` ");
        $conn->exec("CREATE TRIGGER `trg_lanc_dsr_insert` AFTER INSERT ON `lancamentos_eventos`
            FOR EACH ROW
            INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
            SELECT NEW.funcionario_id, NEW.competencia_id, NEW.id_empresa
            FROM (SELECT 1) AS dummy
            WHERE NEW.origem != 'CALCULO'
              AND EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = NEW.evento_id AND `ativo` = 1)
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP");

        $conn->exec("DROP TRIGGER IF EXISTS `trg_lanc_dsr_update` ");
        $conn->exec("CREATE TRIGGER `trg_lanc_dsr_update` AFTER UPDATE ON `lancamentos_eventos`
            FOR EACH ROW
            INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
            SELECT NEW.funcionario_id, NEW.competencia_id, NEW.id_empresa
            FROM (SELECT 1) AS dummy
            WHERE NEW.origem != 'CALCULO'
              AND (NEW.valor_total != OLD.valor_total OR NEW.evento_id != OLD.evento_id)
              AND (
                  EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = NEW.evento_id AND `ativo` = 1)
                  OR 
                  EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = OLD.evento_id AND `ativo` = 1)
              )
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP");

        $conn->exec("DROP TRIGGER IF EXISTS `trg_lanc_dsr_delete` ");
        $conn->exec("CREATE TRIGGER `trg_lanc_dsr_delete` AFTER DELETE ON `lancamentos_eventos`
            FOR EACH ROW
            INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
            SELECT OLD.funcionario_id, OLD.competencia_id, OLD.id_empresa
            FROM (SELECT 1) AS dummy
            WHERE OLD.origem != 'CALCULO'
              AND EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = OLD.evento_id AND `ativo` = 1)
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP");
        echo "<span style='color:green'>Sucesso!</span><br>";

    } catch (Exception $e) {
        echo "<span style='color:red'>Erro no Módulo DSR: " . $e->getMessage() . "</span><br>";
    }

    echo "<hr><h3 style='color:green'>Reparo Concluído!</h3>";
    echo "Agora você pode tentar salvar a folha de pagamento novamente.<br><br>";
    echo "<a href='/'>Voltar ao Sistema</a>";

}
catch (Exception $e) {
    echo "<h3 style='color:red'>ERRO FATAL: " . $e->getMessage() . "</h3>";
}
?>