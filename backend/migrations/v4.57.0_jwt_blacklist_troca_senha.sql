-- Migration v4.57.0: Logout seguro (A2) + Troca de senha obrigatória (C5)
-- Rodar ANTES de subir o zip 4.57.0. Idempotente: pode rodar mais de uma vez.

-- 1. Lista de tokens revogados (logout). Cada JWT emitido a partir da v4.57.0
--    carrega um identificador único (jti). No logout o jti entra aqui e o token
--    deixa de valer na hora. Registros vencidos são limpos automaticamente.
CREATE TABLE IF NOT EXISTS `jwt_blacklist` (
  `jti` CHAR(32) NOT NULL PRIMARY KEY,
  `usuario_id` INT UNSIGNED NULL,
  `expira_em` INT UNSIGNED NOT NULL COMMENT 'Unix timestamp do exp do token',
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_jwt_blacklist_expira` (`expira_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Flag de troca de senha obrigatória no próximo login
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'must_change_password'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE usuarios ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 COMMENT \'1 = usuario deve trocar a senha no proximo login\'',
    'SELECT \'must_change_password ja existe\' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
