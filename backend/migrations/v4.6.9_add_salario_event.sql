-- Migration to add Salary event (Code 33)
INSERT IGNORE INTO `eventos_folha` (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao)
VALUES (33, 'Salário Base', 'CREDITO', 'PROVENTO', 'VALOR', 1, 0);

-- Update existing events to shift order if necessary (Salário is now 0)
UPDATE `eventos_folha` SET ordem_exportacao = ordem_exportacao + 1 WHERE codigo_evento != 33;
