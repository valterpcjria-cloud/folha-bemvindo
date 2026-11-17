-- Migration vX.Y.Z: <descrição curta>
-- Rodar ANTES de subir o zip X.Y.Z (phpMyAdmin → aba SQL). Idempotente: pode rodar mais de uma vez.
-- Sem DELIMITER (compatível com phpMyAdmin/PDO). Somente mudanças ADITIVAS (rollback = zip anterior).

-- 1. Tabela nova
CREATE TABLE IF NOT EXISTS `nome_tabela` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `id_empresa` INT UNSIGNED NOT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nome_tabela_empresa` (`id_empresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Coluna nova (MySQL não tem ADD COLUMN IF NOT EXISTS)
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tabela'
      AND COLUMN_NAME = 'nova_coluna'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE tabela ADD COLUMN nova_coluna DECIMAL(10,2) NULL DEFAULT 0.00 COMMENT \'descricao\'',
    'SELECT \'nova_coluna ja existe\' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Conferência (o Valter roda e manda print)
-- SHOW TABLES LIKE 'nome_tabela';
-- SHOW COLUMNS FROM tabela LIKE 'nova_coluna';
