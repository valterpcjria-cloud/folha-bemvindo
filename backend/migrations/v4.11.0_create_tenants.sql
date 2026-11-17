-- v4.11.0_create_tenants.sql
-- Migração para suporte Multi-Tenant (SaaS)
-- REFATORADO EM v4.31.0 para ser IDEMPOTENTE (Idempotent Layout)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Criar tabela de Empresas (Tenants)
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

-- 2. Inserir a Frimelo como a primeira empresa
INSERT IGNORE INTO `empresas` (id, razao_social, slug, ativa) 
VALUES (1, 'Frigorífico Frimelo Ltda', 'frimelo', 1);

-- HELPER: Adicionar colunas se não existirem
-- Como o MySQL < 8.0.19 não tem 'ADD COLUMN IF NOT EXISTS' nativo, 
-- usamos um truque de procedure ou simplesmente ignoramos o erro via PHP se possível.
-- Para esta migração, vamos usar o padrão de verificação de esquema manual se necessário,
-- mas aqui aplicaremos a lógica de transição direta.

-- 3. Usuarios
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `usuarios` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `usuarios` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `usuarios` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

-- FK Usuarios (Check if exists)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND CONSTRAINT_NAME = 'fk_user_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `usuarios` ADD CONSTRAINT `fk_user_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas`(`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Funcionarios
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `funcionarios` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `funcionarios` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `funcionarios` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND CONSTRAINT_NAME = 'fk_func_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `funcionarios` ADD CONSTRAINT `fk_func_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas`(`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Unique Key Funcionarios
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND INDEX_NAME = 'uk_contrato_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `funcionarios` ADD UNIQUE KEY `uk_contrato_empresa` (`id_contrato`, `id_empresa`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Competências
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competencias' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `competencias` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `competencias` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `competencias` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'competencias' AND CONSTRAINT_NAME = 'fk_comp_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `competencias` ADD CONSTRAINT `fk_comp_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas`(`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Parametros do Sistema
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_sistema' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `parametros_sistema` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `parametros_sistema` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `parametros_sistema` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_sistema' AND CONSTRAINT_NAME = 'fk_param_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `parametros_sistema` ADD CONSTRAINT `fk_param_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas`(`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Lançamentos
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lancamentos_eventos' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `lancamentos_eventos` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `lancamentos_eventos` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `lancamentos_eventos` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'lancamentos_eventos' AND CONSTRAINT_NAME = 'fk_lanc_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `lancamentos_eventos` ADD CONSTRAINT `fk_lanc_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas`(`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8. Logs de Auditoria
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs_auditoria' AND COLUMN_NAME = 'id_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `logs_auditoria` ADD COLUMN `id_empresa` BIGINT UNSIGNED NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `logs_auditoria` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;
ALTER TABLE `logs_auditoria` MODIFY COLUMN `id_empresa` BIGINT UNSIGNED NOT NULL;

SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'logs_auditoria' AND CONSTRAINT_NAME = 'fk_log_empresa');
SET @sql = IF(@exists = 0, 'ALTER TABLE `logs_auditoria` ADD CONSTRAINT `fk_log_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas`(`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
