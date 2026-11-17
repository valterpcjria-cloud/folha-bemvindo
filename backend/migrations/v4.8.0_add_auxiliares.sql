-- Migration v4.8.0: Adiciona tabelas auxiliares Cargos e Parametros

-- Tabela de Cargos (Normalização)
CREATE TABLE IF NOT EXISTS `cargos` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL UNIQUE,
    `cbo` VARCHAR(10) NULL COMMENT 'Código Brasileiro de Ocupações',
    `piso_salarial` DECIMAL(10,2) NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Populando cargos existentes da tabela funcionarios (Migração de dados)
INSERT IGNORE INTO `cargos` (nome)
SELECT DISTINCT cargo FROM `funcionarios` WHERE cargo IS NOT NULL AND cargo != '';

-- Tabela de Parâmetros do Sistema (Singleton ou Chave-Valor)
CREATE TABLE IF NOT EXISTS `parametros_sistema` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chave` VARCHAR(100) NOT NULL UNIQUE,
    `valor` TEXT NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `tipo` ENUM('TEXTO', 'NUMERO', 'BOOLEANO', 'JSON') DEFAULT 'TEXTO',
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parâmetros Iniciais (Salário Mínimo, Teto INSS, etc - Valores ref. 2024/2025)
INSERT IGNORE INTO `parametros_sistema` (`chave`, `valor`, `tipo`, `descricao`) VALUES
('SALARIO_MINIMO', '1412.00', 'NUMERO', 'Valor do Salário Mínimo Nacional'),
('TETO_INSS', '7786.02', 'NUMERO', 'Teto máximo de contribuição do INSS'),
('FAIXA_ISENCAO_IRRF', '2259.20', 'NUMERO', 'Faixa de isenção do Imposto de Renda'),
('VALOR_DEDUCAO_DEPENDENTE', '189.59', 'NUMERO', 'Valor a deduzir por dependente no IRRF');
