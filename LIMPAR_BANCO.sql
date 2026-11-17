-- ARQUIVO PARA ZERAR O BANCO DE DADOS (LIMPEZA TOTAL)
-- CUIDADO: Isso apagará todos os dados permanentemente!

-- Desativar verificações de chave estrangeira
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Remover tabelas filhas primeiro (evita erros de restrição)
DROP TABLE IF EXISTS `lancamentos_eventos`;
DROP TABLE IF EXISTS `logs_auditoria`;
DROP TABLE IF EXISTS `parametros_sistema`;

-- 2. Remover tabelas pai
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `funcionarios`;
DROP TABLE IF EXISTS `eventos_folha`;
DROP TABLE IF EXISTS `competencias`;
DROP TABLE IF EXISTS `empresas`;

-- Reativar verificações
SET FOREIGN_KEY_CHECKS = 1;

-- INSTRUÇÕES IMPORTANTES:
-- 1. Selecione TODO o texto acima e execute de UMA VEZ SÓ no phpMyAdmin.
-- 2. Se o erro persistir, tente executar apenas a linha "SET FOREIGN_KEY_CHECKS = 0;" 
--    seguida das outras, mas geralmente rodar o bloco todo resolve.
-- 3. Após limpar, acesse: https://frimelo.meusistemanaweb.com.br/backend/v1/setup_db.php
