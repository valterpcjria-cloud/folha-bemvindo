-- Migration v4.10.0: Adiciona campos de incidência INSS/FGTS/IRRF e tabela de alíquotas
-- NOTA: Este script é idempotente - pode ser executado várias vezes sem erro

-- 1. Adicionar campos de incidência na tabela eventos_folha (SE NÃO EXISTIREM)
-- MySQL não tem IF NOT EXISTS para colunas, então usamos IGNORE ou procedimento
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eventos_folha' AND COLUMN_NAME = 'incide_inss') > 0,
    'SELECT 1',
    'ALTER TABLE eventos_folha ADD COLUMN incide_inss TINYINT(1) NOT NULL DEFAULT 1 COMMENT "Incide INSS"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eventos_folha' AND COLUMN_NAME = 'incide_fgts') > 0,
    'SELECT 1',
    'ALTER TABLE eventos_folha ADD COLUMN incide_fgts TINYINT(1) NOT NULL DEFAULT 1 COMMENT "Incide FGTS"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eventos_folha' AND COLUMN_NAME = 'incide_irrf') > 0,
    'SELECT 1',
    'ALTER TABLE eventos_folha ADD COLUMN incide_irrf TINYINT(1) NOT NULL DEFAULT 1 COMMENT "Incide IRRF"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Atualizar eventos que NÃO incidem (descontos geralmente não incidem)
UPDATE `eventos_folha` SET incide_inss = 0, incide_fgts = 0, incide_irrf = 0 
WHERE tipo = 'DEBITO';

-- 3. Criar tabela de alíquotas INSS (faixas progressivas)
CREATE TABLE IF NOT EXISTS `aliquotas_inss` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `faixa_inicio` DECIMAL(12,2) NOT NULL,
    `faixa_fim` DECIMAL(12,2) NOT NULL,
    `aliquota` DECIMAL(5,2) NOT NULL COMMENT 'Percentual da alíquota',
    `vigencia_inicio` DATE NOT NULL,
    `vigencia_fim` DATE NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vigencia (vigencia_inicio, vigencia_fim),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Inserir alíquotas INSS 2026 (Salário Mínimo R$ 1.621,00, Teto R$ 8.666,44)
-- Faixas calculadas conforme fórmula: [TETO ANTERIOR] * (DIFERENÇA DE ALÍQUOTA) + [DEDUÇÃO ANTERIOR]
-- Valores extraídos das imagens oficiais fornecidas pelo usuário
INSERT INTO `aliquotas_inss` (`faixa_inicio`, `faixa_fim`, `aliquota`, `vigencia_inicio`) VALUES
(0.00, 1621.00, 7.50, '2026-01-01'),      -- Faixa 1: 7,5% sem dedução
(1621.01, 2902.84, 9.00, '2026-01-01'),   -- Faixa 2: 9% (Parcela deduzir: R$ 24,32)
(2902.85, 4354.27, 12.00, '2026-01-01'),  -- Faixa 3: 12% (Parcela deduzir: R$ 111,41)
(4354.28, 8666.44, 14.00, '2026-01-01');  -- Faixa 4: 14% (Parcela deduzir: R$ 198,49)

-- 5. Criar tabela de alíquotas IRRF
CREATE TABLE IF NOT EXISTS `aliquotas_irrf` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `faixa_inicio` DECIMAL(12,2) NOT NULL,
    `faixa_fim` DECIMAL(12,2) NOT NULL,
    `aliquota` DECIMAL(5,2) NOT NULL,
    `parcela_deduzir` DECIMAL(12,2) NOT NULL DEFAULT 0,
    `vigencia_inicio` DATE NOT NULL,
    `vigencia_fim` DATE NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vigencia (vigencia_inicio, vigencia_fim)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Inserir alíquotas IRRF 2026 (baseado na última MP vigente)
INSERT INTO `aliquotas_irrf` (`faixa_inicio`, `faixa_fim`, `aliquota`, `parcela_deduzir`, `vigencia_inicio`) VALUES
(0.00, 2428.80, 0.00, 0.00, '2026-01-01'),
(2428.81, 3036.00, 7.50, 182.16, '2026-01-01'),
(3036.01, 4028.00, 15.00, 409.80, '2026-01-01'),
(4028.01, 5009.00, 22.50, 712.00, '2026-01-01'),
(5009.01, 999999.99, 27.50, 962.45, '2026-01-01');

-- 7. Atualizar parâmetros do sistema para 2026 (Salário Mínimo R$ 1.621,00)
INSERT IGNORE INTO `parametros_sistema` (`chave`, `valor`, `tipo`, `descricao`) VALUES
('ALIQUOTA_FGTS', '8.00', 'NUMERO', 'Alíquota do FGTS (8%)'),
('SALARIO_MINIMO', '1621.00', 'NUMERO', 'Salário Mínimo Nacional 2026');

-- Atualizar teto INSS para 2026
UPDATE `parametros_sistema` SET `valor` = '8666.44' WHERE `chave` = 'TETO_INSS';

-- Atualizar dedução por dependente 2026
UPDATE `parametros_sistema` SET `valor` = '203.77' WHERE `chave` = 'VALOR_DEDUCAO_DEPENDENTE';

-- Atualizar faixa de isenção IRRF 2026
UPDATE `parametros_sistema` SET `valor` = '2428.80' WHERE `chave` = 'FAIXA_ISENCAO_IRRF';
