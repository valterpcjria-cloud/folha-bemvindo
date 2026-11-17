-- Migração v4.39.0 - Módulo de DSR (Descanso Semanal Remunerado)

-- 1. Alterar tabela Funcionários para incluir salário hora
-- Como o MySQL < 8 não tem ADD COLUMN IF NOT EXISTS nativo, a aplicação lidará com o erro se já existir,
-- ou podemos criar de forma idempotente, mas este script assume que rodará via MigrationSystem
ALTER TABLE `funcionarios` ADD COLUMN IF NOT EXISTS `salario_hora` DECIMAL(10,4) DEFAULT 0 AFTER `salario`;

-- 2. Tabela de Feriados Nacionais e Regionais
CREATE TABLE IF NOT EXISTS `feriados_nacionais` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `data` DATE NOT NULL UNIQUE,
    `descricao` VARCHAR(100) NOT NULL,
    `tipo` ENUM('nacional', 'estadual', 'municipal') DEFAULT 'nacional',
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- População Feriados DSR 2025/2026 (Nacionais Fixos - Não cobrimos pontos facultativos por definição para DSR Nacional)
INSERT IGNORE INTO `feriados_nacionais` (`data`, `descricao`, `tipo`) VALUES 
('2025-01-01', 'Confraternização Universal', 'nacional'),
('2025-03-04', 'Carnaval', 'nacional'),
('2025-04-18', 'Paixão de Cristo', 'nacional'),
('2025-04-21', 'Tiradentes', 'nacional'),
('2025-05-01', 'Dia do Trabalho', 'nacional'),
('2025-09-07', 'Independência do Brasil', 'nacional'),
('2025-10-12', 'Nossa Sra. Aparecida', 'nacional'),
('2025-11-02', 'Finados', 'nacional'),
('2025-11-15', 'Proclamação da República', 'nacional'),
('2025-11-20', 'Dia da Consciência Negra', 'nacional'),
('2025-12-25', 'Natal', 'nacional'),

('2026-01-01', 'Confraternização Universal', 'nacional'),
('2026-02-17', 'Carnaval', 'nacional'),
('2026-04-03', 'Paixão de Cristo', 'nacional'),
('2026-04-21', 'Tiradentes', 'nacional'),
('2026-05-01', 'Dia do Trabalho', 'nacional'),
('2026-09-07', 'Independência do Brasil', 'nacional'),
('2026-10-12', 'Nossa Sra. Aparecida', 'nacional'),
('2026-11-02', 'Finados', 'nacional'),
('2026-11-15', 'Proclamação da República', 'nacional'),
('2026-11-20', 'Dia da Consciência Negra', 'nacional'),
('2026-12-25', 'Natal', 'nacional');

-- 3. Tabela de Configuração de Eventos que compõem a base do DSR
CREATE TABLE IF NOT EXISTS `dsr_config_eventos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `evento_id` INT UNSIGNED NOT NULL,
    `tipo_dsr` ENUM('horas_extras', 'comissao', 'producao') NOT NULL,
    `ativo` TINYINT(1) DEFAULT 1,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`evento_id`) REFERENCES `eventos_folha`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir Regras baseadas nos eventos já mapeados no sistema
INSERT IGNORE INTO `dsr_config_eventos` (`evento_id`, `tipo_dsr`)
SELECT id, 'horas_extras' FROM `eventos_folha` WHERE `codigo_evento` = 907;

-- Tenta inserir Feriado Trabalhado na HE (se existir código 1080)
INSERT IGNORE INTO `dsr_config_eventos` (`evento_id`, `tipo_dsr`)
SELECT id, 'horas_extras' FROM `eventos_folha` WHERE `codigo_evento` = 1080;

-- Tenta inserir Prêmio Domingo na HE ou Producao (se existir código 719)
INSERT IGNORE INTO `dsr_config_eventos` (`evento_id`, `tipo_dsr`)
SELECT id, 'comissao' FROM `eventos_folha` WHERE `codigo_evento` = 719;

-- 4. Tabela Faltas Pré-DSR
CREATE TABLE IF NOT EXISTS `dsr_faltas_pre_dsr` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `funcionario_id` BIGINT UNSIGNED NOT NULL,
    `competencia_id` INT UNSIGNED NOT NULL,
    `data_falta` DATE NOT NULL,
    `data_dsr_perdido` DATE NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`competencia_id`) REFERENCES `competencias`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_falta_dsr` (`funcionario_id`, `competencia_id`, `data_falta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Consolidação e Memória de Cálculo DSR
CREATE TABLE IF NOT EXISTS `dsr_calculado` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `funcionario_id` BIGINT UNSIGNED NOT NULL,
    `competencia_id` INT UNSIGNED NOT NULL,
    `mes` TINYINT UNSIGNED NOT NULL,
    `ano` SMALLINT UNSIGNED NOT NULL,
    
    -- Inputs do Calendario
    `dias_uteis_mes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `dias_dsr_mes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `faltas_pre_dsr_qtd` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    
    -- Valores Discriminados Base
    `dsr_horas_extras` DECIMAL(12,2) DEFAULT 0,
    `dsr_comissoes` DECIMAL(12,2) DEFAULT 0,
    `dsr_horista` DECIMAL(12,2) DEFAULT 0,
    
    -- Finais Monetarios
    `dsr_bruto` DECIMAL(12,2) DEFAULT 0,
    `dsr_desconto_faltas` DECIMAL(12,2) DEFAULT 0,
    `dsr_liquido` DECIMAL(12,2) DEFAULT 0,
    
    `memoria_calculo` TEXT NULL,
    `calculado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `calculado_por` VARCHAR(50) DEFAULT 'sistema',
    
    FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`competencia_id`) REFERENCES `competencias`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_func_comp_dsr` (`funcionario_id`, `competencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela intermediária "Fila" para contornar Mutating Table no MySQL
-- Em MySQL, um TRIGGER AFTER INSERT/UPDATE não pode consultar e inserir livremente na mesma tabela ou causar loop infinito. 
-- Em vez de disparar a lógica massiva de DSR dentro do DB ou quebrar os Triggers de soma_total já existentes,
-- Vamos agendar a competência e funcionário para recálculo por uma "Procedure" ou Background Job via PHP (DsrService)
-- Como o prompt pediu trigger + recálculo: o Trigger no MySQL vai sinalizar uma "flag_sujo_dsr" 
CREATE TABLE IF NOT EXISTS `dsr_fila_recalculo` (
    `funcionario_id` BIGINT UNSIGNED NOT NULL,
    `competencia_id` INT UNSIGNED NOT NULL,
    `id_empresa` INT UNSIGNED NOT NULL,
    `marcado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`funcionario_id`, `competencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers sem a sintaxe DELIMITER (Single Statement)
-- Isso evita erros em clientes como phpMyAdmin (quando a caixa delimiter não é alterada) e erros na API de PDO->exec()

DROP TRIGGER IF EXISTS `trg_lanc_dsr_insert`;
CREATE TRIGGER `trg_lanc_dsr_insert` AFTER INSERT ON `lancamentos_eventos`
FOR EACH ROW
    INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
    SELECT NEW.funcionario_id, NEW.competencia_id, NEW.id_empresa
    FROM DUAL
    WHERE NEW.origem != 'CALCULO'
      AND EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = NEW.evento_id AND `ativo` = 1)
    ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS `trg_lanc_dsr_update`;
CREATE TRIGGER `trg_lanc_dsr_update` AFTER UPDATE ON `lancamentos_eventos`
FOR EACH ROW
    INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
    SELECT NEW.funcionario_id, NEW.competencia_id, NEW.id_empresa
    FROM DUAL
    WHERE NEW.origem != 'CALCULO'
      AND (NEW.valor_total != OLD.valor_total OR NEW.evento_id != OLD.evento_id)
      AND (
          EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = NEW.evento_id AND `ativo` = 1)
          OR 
          EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = OLD.evento_id AND `ativo` = 1)
      )
    ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS `trg_lanc_dsr_delete`;
CREATE TRIGGER `trg_lanc_dsr_delete` AFTER DELETE ON `lancamentos_eventos`
FOR EACH ROW
    INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
    SELECT OLD.funcionario_id, OLD.competencia_id, OLD.id_empresa
    FROM DUAL
    WHERE OLD.origem != 'CALCULO'
      AND EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = OLD.evento_id AND `ativo` = 1)
    ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP;

