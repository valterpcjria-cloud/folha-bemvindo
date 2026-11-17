-- Script de configuração do Banco de Dados Sistema RH
-- Compatível com MySQL 5.7 / 8.0 (HostGator)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabela de Funcionários
CREATE TABLE IF NOT EXISTS `funcionarios` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_contrato` INT UNSIGNED NOT NULL UNIQUE,
    `nome` VARCHAR(255) NOT NULL,
    `cpf` CHAR(11) NULL,
    `data_admissao` DATE NULL,
    `data_demissao` DATE NULL,
    `cargo` VARCHAR(150) NULL,
    `centro_custo` VARCHAR(100) NULL,
    `tipo_contrato` ENUM('CLT','PJ','ESTAGIO','OUTRO') DEFAULT 'CLT',
    `status` ENUM('ATIVO','DESLIGADO','AFASTADO') DEFAULT 'ATIVO',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_id_contrato` (`id_contrato`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Eventos de Folha
CREATE TABLE IF NOT EXISTS `eventos_folha` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `codigo_evento` INT UNSIGNED NOT NULL UNIQUE,
    `nome_evento` VARCHAR(150) NOT NULL,
    `tipo` ENUM('CREDITO','DEBITO','INFORMATIVO') NOT NULL,
    `natureza` ENUM('PROVENTO','DESCONTO','BASE','OUTRO') DEFAULT 'PROVENTO',
    `unidade` ENUM('VALOR','HORA','DIA','UNIDADE') DEFAULT 'VALOR',
    `formula` TEXT NULL,
    `descricao` TEXT NULL,
    `obrigatorio` TINYINT(1) NOT NULL DEFAULT 0,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `ordem_exportacao` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_codigo_evento` (`codigo_evento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Competências
CREATE TABLE IF NOT EXISTS `competencias` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `mes` TINYINT UNSIGNED NOT NULL,
    `ano` SMALLINT UNSIGNED NOT NULL,
    `status` ENUM('ABERTA','FECHADA') DEFAULT 'ABERTA',
    `data_abertura` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `data_fechamento` DATETIME NULL,
    UNIQUE KEY `uk_mes_ano` (`mes`, `ano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Lançamentos
CREATE TABLE IF NOT EXISTS `lancamentos_eventos` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `funcionario_id` BIGINT UNSIGNED NOT NULL,
    `competencia_id` BIGINT UNSIGNED NOT NULL,
    `evento_id` BIGINT UNSIGNED NOT NULL,
    `quantidade` DECIMAL(10,2) NULL,
    `valor_unitario` DECIMAL(10,2) NULL,
    `valor_total` DECIMAL(10,2) NOT NULL,
    `origem` ENUM('MANUAL','CALCULO','IMPORTADO') DEFAULT 'MANUAL',
    `observacao` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_lancamento_evento` (`funcionario_id`, `competencia_id`, `evento_id`),
    CONSTRAINT `fk_lanc_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lanc_competencia` FOREIGN KEY (`competencia_id`) REFERENCES `competencias` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lanc_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_folha` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Usuários
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `senha_hash` VARCHAR(255) NOT NULL,
    `perfil` ENUM('ADMIN','RH','GESTOR','LEITURA') DEFAULT 'RH',
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Auditoria
CREATE TABLE IF NOT EXISTS `logs_auditoria` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` BIGINT UNSIGNED NULL,
    `entidade` VARCHAR(100) NOT NULL,
    `entidade_id` BIGINT UNSIGNED NOT NULL,
    `acao` VARCHAR(50) NOT NULL,
    `detalhes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CARGA INICIAL: 9 EVENTOS OBRIGATÓRIOS (SISTEMA RH)
INSERT IGNORE INTO `eventos_folha` (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao)
VALUES
 (883,  'Pontualidade',          'CREDITO', 'PROVENTO',  'VALOR', 1, 1),
 (88,   'Gratificação',          'CREDITO', 'PROVENTO',  'VALOR', 1, 2),
 (719,  'Prêmio Domingo',        'CREDITO', 'PROVENTO',  'VALOR', 1, 3),
 (48,   'Horas Extras 50%',      'CREDITO', 'PROVENTO',  'HORA',  1, 4),
 (49,   'Horas Extras 100%',     'CREDITO', 'PROVENTO',  'HORA',  1, 5),
 (1080, 'Feriado Trabalhado',    'CREDITO', 'PROVENTO',  'DIA',   1, 6),
 (71,   'Faltas',                'DEBITO',  'DESCONTO',  'DIA',   1, 7),
 (191,  'Desc Vale',             'DEBITO',  'DESCONTO',  'VALOR', 1, 8),
 (936,  'Mensalidade Sindical',  'DEBITO',  'DESCONTO',  'VALOR', 1, 9),
 (4004, 'Empréstimo Consignado', 'DEBITO',  'DESCONTO',  'VALOR', 1, 10);

-- CARGA INICIAL: USUÁRIO ADMINISTRADOR
-- Credenciais: admin@empresa.com.br / Senha: admin123
INSERT IGNORE INTO `usuarios` (nome, email, senha_hash, perfil, ativo)
VALUES ('Administrador', 'admin@empresa.com.br', '$2y$10$8k0.hN1hM0N.z99Z.qf9EuG8S9mF8L0/yR0x0.9.z99Z.qf9EuG8S', 'ADMIN', 1);

SET FOREIGN_KEY_CHECKS = 1;
