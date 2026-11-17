-- Migração v4.44.0: Campos para Relatório Relação de Cálculo (Espelho da Folha)
-- Objetivo: Adicionar metadados detalhados de funcionários e empresa para o relatório de alta fidelidade.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Expansão da tabela de Funcionários
ALTER TABLE `funcionarios` ADD `carga_horaria` VARCHAR(10) DEFAULT '220:00' AFTER `cargo`;
ALTER TABLE `funcionarios` ADD `sindicato_codigo` VARCHAR(10) DEFAULT '0066' AFTER `carga_horaria`;
ALTER TABLE `funcionarios` ADD `dep_ir` TINYINT UNSIGNED DEFAULT 0 AFTER `sindicato_codigo`;
ALTER TABLE `funcionarios` ADD `dep_sf` TINYINT UNSIGNED DEFAULT 0 AFTER `dep_ir`;
ALTER TABLE `funcionarios` ADD `deducao_ir` DECIMAL(12,2) DEFAULT 0.00 AFTER `dep_sf`;
ALTER TABLE `funcionarios` ADD `salario_base` DECIMAL(12,2) DEFAULT 0.00 AFTER `deducao_ir`;
ALTER TABLE `funcionarios` ADD `empresa_codigo` VARCHAR(10) DEFAULT '0165' AFTER `salario_base`;
ALTER TABLE `funcionarios` ADD `filial` VARCHAR(10) DEFAULT '0001' AFTER `empresa_codigo`;

-- 2. Expansão da tabela de Empresas (DADOS DA MATRIZ/FILIAL)
ALTER TABLE `empresas` ADD `logradouro` VARCHAR(255) NULL AFTER `razao_social`;
ALTER TABLE `empresas` ADD `numero` VARCHAR(20) NULL AFTER `logradouro`;
ALTER TABLE `empresas` ADD `complemento` VARCHAR(100) NULL AFTER `numero`;
ALTER TABLE `empresas` ADD `bairro` VARCHAR(100) NULL AFTER `complemento`;
ALTER TABLE `empresas` ADD `cep` CHAR(8) NULL AFTER `nome_cidade`;
ALTER TABLE `empresas` ADD `telefone` VARCHAR(20) NULL AFTER `cep`;
ALTER TABLE `empresas` ADD `codigo_empresa_erp` VARCHAR(10) NULL AFTER `telefone`;
ALTER TABLE `empresas` ADD `filial_erp` VARCHAR(10) DEFAULT '0001' AFTER `codigo_empresa_erp`;

-- 3. Atualização de dados da Empresa Matriz (Frimelo ID 1) para o Relatório
UPDATE `empresas` SET 
    `razao_social` = 'FRIGORIFICO FRIMELO LTDA',
    `cnpj` = '19953437000178',
    `logradouro` = 'Rua BRASFRIGO',
    `numero` = '41',
    `bairro` = 'ZONA RURAL',
    `nome_cidade` = 'Luziânia',
    `uf` = 'GO',
    `telefone` = '(61) 3621-4470',
    `codigo_empresa_erp` = '0165',
    `filial_erp` = '0001'
WHERE `id` = 1;

SET FOREIGN_KEY_CHECKS = 1;
