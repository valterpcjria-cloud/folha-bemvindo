-- migration_v4.9.28.sql
-- Rode este comando diretamente no seu phpMyAdmin ou ferramenta de SQL

ALTER TABLE `funcionarios` ADD COLUMN `data_admissao` DATE NULL AFTER `cpf`;
