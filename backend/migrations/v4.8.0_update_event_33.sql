-- Migration v4.8.0: Update Event 33 to "Salário" and ensure order 0
-- This ensures consistency between Frontend (constants.tsx) and Backend

-- 1. Ensure Event 33 exists and is named "Salário"
INSERT INTO `eventos_folha` (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao)
VALUES (33, 'Salário', 'CREDITO', 'PROVENTO', 'VALOR', 1, 0)
ON DUPLICATE KEY UPDATE 
    nome_evento = 'Salário',
    ordem_exportacao = 0;

-- 2. Shift other events if necessary to avoid collision at 0 (though 0 should be reserved for Salário)
-- Pontualidade (883) usually comes second (index 1)
UPDATE `eventos_folha` SET ordem_exportacao = 1 WHERE codigo_evento = 883;

-- 3. Ensure no other event has order 0
UPDATE `eventos_folha` SET ordem_exportacao = ordem_exportacao + 1 WHERE codigo_evento != 33 AND ordem_exportacao = 0;
