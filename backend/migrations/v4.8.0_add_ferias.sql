-- Migration v4.8.0: Adiciona tabela de Controle de Férias

CREATE TABLE IF NOT EXISTS `ferias` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `funcionario_id` BIGINT UNSIGNED NOT NULL,
    `periodo_aquisitivo_inicio` DATE NOT NULL,
    `periodo_aquisitivo_fim` DATE NOT NULL,
    `periodo_gozo_inicio` DATE NOT NULL,
    `periodo_gozo_fim` DATE NOT NULL,
    `dias_gozo` INT NOT NULL,
    `dias_abono` INT DEFAULT 0,
    `valor_pago` DECIMAL(10,2) NULL,
    `status` ENUM('PROGRAMADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') DEFAULT 'PROGRAMADA',
    `observacao` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ferias_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
