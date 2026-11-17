-- ARQUIVO DE REPARO SEGURO - SISTEMA RH
-- Abra este arquivo no seu VS Code, copie e cole no phpMyAdmin.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabela de Empresas
CREATE TABLE IF NOT EXISTS `empresas` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `razao_social` VARCHAR(255) NOT NULL,
    `cnpj` VARCHAR(20) NULL,
    `slug` VARCHAR(50) NOT NULL UNIQUE,
    `ativa` TINYINT(1) NOT NULL DEFAULT 1,
    `data_cadastro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Empresa Padrão
INSERT IGNORE INTO `empresas` (id, razao_social, slug, ativa) 
VALUES (1, 'Frimelo', 'frimelo', 1);

-- 3. Usuarios (Blindagem)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `usuarios` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `usuarios` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `usuarios` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

-- 4. Funcionarios (Blindagem)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `funcionarios` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `funcionarios` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `funcionarios` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

-- 5. Competencias (Blindagem)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competencias' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `competencias` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `competencias` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `competencias` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

-- 6. Parametros (Blindagem)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_sistema' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `parametros_sistema` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `parametros_sistema` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `parametros_sistema` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
