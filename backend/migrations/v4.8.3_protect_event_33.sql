-- Migration v4.8.3: Protect Event 33 (Salário) by setting obrigatorio = 1
UPDATE `eventos_folha`
SET `obrigatorio` = 1, `nome_evento` = 'Salário'
WHERE `codigo_evento` = 33;
