-- FOLHA BEM VINDO — funcionário novo começa SEM insalubridade e SEM assiduidade (v1.1.0)
-- Na Frimelo o padrão era 20% / 11%. No Bem Vindo só algumas funções têm insalubridade
-- (a confirmar com a contabilidade, P17) e assiduidade não está na lista de rubricas.
-- Muda só o VALOR PADRÃO da coluna: quem já está cadastrado continua com o que tem.
-- Idempotente (pode rodar mais de uma vez).

ALTER TABLE `funcionarios`
  ALTER COLUMN `insalubridade_perc` SET DEFAULT 0.00,
  ALTER COLUMN `assiduidade_perc` SET DEFAULT 0.00;
