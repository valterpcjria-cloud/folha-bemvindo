-- Migração v4.43.0 - Feriados Customizáveis e Impacto no DSR

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Atualizar tabela de Empresas para suportar localização
-- Adicionando campos necessários para filtrar feriados estaduais e municipais
ALTER TABLE `empresas` 
ADD COLUMN `uf` CHAR(2) NULL AFTER `cnpj`,
ADD COLUMN `nome_cidade` VARCHAR(150) NULL AFTER `uf`;

-- 2. Evoluir a tabela feriados_nacionais para feriados
-- Renomeando e adicionando colunas de segmentação
ALTER TABLE `feriados_nacionais` RENAME TO `feriados`;

ALTER TABLE `feriados`
CHANGE COLUMN `descricao` `nome` VARCHAR(100) NOT NULL,
ADD COLUMN `uf` CHAR(2) NULL AFTER `tipo`,
ADD COLUMN `cidade` VARCHAR(150) NULL AFTER `uf`,
ADD COLUMN `recorrente` TINYINT(1) NOT NULL DEFAULT 1 AFTER `cidade`,
ADD COLUMN `ativo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `recorrente`,
ADD COLUMN `empresa_id` INT UNSIGNED NULL AFTER `ativo`;

-- Remover UNIQUE antigo de data e adicionar novo composto
-- No MySQL, se o nome da constraint UNIQUE não foi definido, ele usa o nome da coluna.
ALTER TABLE `feriados` DROP INDEX `data`;
ALTER TABLE `feriados` ADD UNIQUE KEY `uk_feriado_data_local` (`data`, `tipo`, `uf`, `cidade`, `empresa_id`);

-- Índices para performance de busca no DSR
ALTER TABLE `feriados` ADD INDEX `idx_feriado_empresa` (`empresa_id`);
ALTER TABLE `feriados` ADD INDEX `idx_feriado_busca` (`tipo`, `uf`, `cidade`, `ativo`);

-- 3. Inserir Feriados Móveis 2026 (Exemplos não recorrentes ou que serão tratados via lógica)
-- O sistema RH usa lógica de DSR que depende dessas datas.
-- Data móveis precisam ser re-inseridas como tipo nacional sem recorrência se a lógica automática falhar, 
-- mas o plano prevê algoritmo de Páscoa no Backend.

-- Atualizar feriados nacionais existentes para recorrente = 1
UPDATE `feriados` SET `recorrente` = 1 WHERE `tipo` = 'nacional';

SET FOREIGN_KEY_CHECKS = 1;
