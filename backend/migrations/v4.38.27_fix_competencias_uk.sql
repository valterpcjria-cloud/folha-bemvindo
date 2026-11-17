-- MIGRATION: v4.38.27_fix_competencias_uk.sql
-- Objetivo: Permitir que diferentes empresas tenham o mesmo período de competência (mês/ano).
-- Remove a restrição única global e adiciona uma restrição única combinada com o id_empresa.

-- 1. Remove o índice único antigo que travava o Calendário por mês/ano globalmente.
-- Nota: Usamos DROP INDEX caso o nome seja conhecido (conforme database_setup.sql).
ALTER TABLE `competencias` DROP INDEX IF EXISTS `uk_mes_ano`;

-- 2. Adiciona o novo índice único composto que agora inclui o id_empresa.
-- Isso garante que uma empresa não possa ter o mesmo mês/ano duplicado, mas empresas diferentes sim.
ALTER TABLE `competencias` ADD UNIQUE KEY `uk_mes_ano_empresa` (`mes`, `ano`, `id_empresa`);

-- 3. Log de Migração
-- (Opcional: registrar que a migração foi executada se houver tabela de controle)
