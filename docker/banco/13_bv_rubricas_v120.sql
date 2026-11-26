-- FOLHA BEM VINDO v1.2.0 — rubricas confirmadas pela contabilidade (respostas P1–P30, 25/11/2026)
--   82  Gratificação de função (% do salário-base, P4)  → substitui a 88 da Frimelo (decisão do Valter)
--   37  Horas extras 60% (P1/P15)                       → mesma base da HE 100%, entra no DSR (59)
--   23  Horas faltas (atrasos/saídas antecipadas, P13) → salário ÷ 220 × horas, sem perda de DSR
--   816 Desconto vale-transporte (P10)                  → até 6% do salário proporcional, limitado ao custo do VT
-- Códigos = os do Questor (os que já existiam na Frimelo não mudam).
-- Idempotente e aditiva (pode rodar mais de uma vez). A 88 é só DESATIVADA, não apagada.

ALTER TABLE `funcionarios`
  ADD COLUMN IF NOT EXISTS `gratificacao_funcao_perc` DECIMAL(5,2) NOT NULL DEFAULT 0.00
    COMMENT 'Bem Vindo v1.2.0: % gratificação de função (rubrica 82) sobre o salário',
  ADD COLUMN IF NOT EXISTS `vt_desconto_perc` DECIMAL(4,2) NOT NULL DEFAULT 0.00
    COMMENT 'Bem Vindo v1.2.0: % desconto do vale-transporte (rubrica 816), 0 a 6',
  ADD COLUMN IF NOT EXISTS `vt_custo_mensal` DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Bem Vindo v1.2.0: custo mensal do VT fornecido (teto do desconto 816); 0 = sem teto';

INSERT INTO `eventos_folha`
  (`codigo_evento`, `nome_evento`, `tipo`, `natureza`, `unidade`, `incide_inss`, `incide_fgts`, `incide_irrf`, `obrigatorio`, `ativo`, `ordem_exportacao`)
VALUES
  (82,  'Gratificação de Função', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 1, 1, 1, 1, 1, 2),
  (37,  'Horas Extras 60%',       'CREDITO', 'PROVENTO', 'HORA',       1, 1, 1, 1, 1, 4),
  (23,  'Horas Faltas',           'DEBITO',  'DESCONTO', 'HORA',       0, 0, 0, 1, 1, 9),
  (816, 'Desconto Vale-Transporte','DEBITO', 'DESCONTO', 'PERCENTUAL', 0, 0, 0, 1, 1, 10)
ON DUPLICATE KEY UPDATE `codigo_evento` = `codigo_evento`;

-- Gratificação 88 (Frimelo) fora do Bem Vindo: some do grid e da exportação
UPDATE `eventos_folha` SET `ativo` = 0 WHERE `codigo_evento` = 88;

-- HE 60% entra na base do DSR s/ HE (59), igual à HE 100%
INSERT INTO `dsr_he_config_eventos` (`codigo_evento_fonte`, `descricao`, `ativo`)
VALUES (37, 'Horas Extras 60%', 1)
ON DUPLICATE KEY UPDATE `codigo_evento_fonte` = `codigo_evento_fonte`;
