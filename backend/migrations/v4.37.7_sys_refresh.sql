-- Migration v4.37.6
-- Refreshes transactional data only

DELETE FROM lancamentos_eventos;
ALTER TABLE lancamentos_eventos AUTO_INCREMENT = 1;
