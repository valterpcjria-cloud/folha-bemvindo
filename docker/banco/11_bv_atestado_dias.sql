-- FOLHA BEM VINDO — atestado em dias (v1.1.0)
-- O atestado continua sendo "tem / não tem" na competência (zera a Assiduidade como antes).
-- Agora guarda também a quantidade de dias, que o DP informa à contabilidade (sem valor em R$).
-- Idempotente e aditiva: pode rodar mais de uma vez; NULL = dias não informados.
-- Rodar ANTES de trocar a imagem da aplicação.

ALTER TABLE `competencia_atestados`
  ADD COLUMN IF NOT EXISTS `dias` TINYINT UNSIGNED NULL DEFAULT NULL AFTER `id_empresa`;
