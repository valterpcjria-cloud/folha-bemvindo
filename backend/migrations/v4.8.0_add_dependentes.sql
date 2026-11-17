-- Migration v4.8.0: Adiciona tabela de Dependentes
-- Necessário para cálculo de IRRF e Salário Família

CREATE TABLE IF NOT EXISTS `dependentes` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `funcionario_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `cpf` CHAR(11) NULL,
    `data_nascimento` DATE NOT NULL,
    `tipo_parentesco` ENUM('FILHO', 'CONJUGE', 'PAI_MAE', 'OUTRO') NOT NULL,
    `irrf` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Deduzir do IRRF?',
    `salario_familia` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Recebe Salário Família?',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_dep_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
