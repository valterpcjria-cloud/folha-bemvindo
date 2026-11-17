-- migration_v4.9.30.sql
-- Rode este comando diretamente no seu phpMyAdmin ou ferramenta de SQL

ALTER TABLE `funcionarios` 
ADD COLUMN `cbo` VARCHAR(20) NULL AFTER `data_admissao`,
ADD COLUMN `empresa_codigo` VARCHAR(20) NULL AFTER `cbo`,
ADD COLUMN `local` VARCHAR(20) NULL AFTER `empresa_codigo`,
ADD COLUMN `departamento` VARCHAR(50) NULL AFTER `local`;
