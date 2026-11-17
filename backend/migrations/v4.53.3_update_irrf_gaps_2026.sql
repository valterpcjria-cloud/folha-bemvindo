-- Migration v4.53.3: Remove gaps de R$ 0,01 centavo nas faixas de IRRF 2026
-- Idempotente

UPDATE aliquotas_irrf SET faixa_inicio = 2428.80 WHERE faixa_inicio = 2428.81 AND vigencia_inicio = '2026-01-01';
UPDATE aliquotas_irrf SET faixa_inicio = 2826.65 WHERE faixa_inicio = 2826.66 AND vigencia_inicio = '2026-01-01';
UPDATE aliquotas_irrf SET faixa_inicio = 3751.05 WHERE faixa_inicio = 3751.06 AND vigencia_inicio = '2026-01-01';
UPDATE aliquotas_irrf SET faixa_inicio = 4664.68 WHERE faixa_inicio = 4664.69 AND vigencia_inicio = '2026-01-01';
