-- v4.48.10_add_competencia_justificativa.sql
-- Adiciona coluna para justificar alteração/exclusão de status de competência

ALTER TABLE `competencias` ADD COLUMN `justificativa_status` TEXT NULL DEFAULT NULL AFTER `data_fechamento`;
