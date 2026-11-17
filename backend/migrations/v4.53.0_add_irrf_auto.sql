-- Migration v4.53.0: IRRF Automático (Rubrica 1920)
-- Idempotente — pode ser executado várias vezes

-- 1. Inserir evento 1920 (IRRF) se não existir
INSERT IGNORE INTO eventos_folha 
    (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao, incide_inss, incide_fgts, incide_irrf)
VALUES 
    (1920, 'IRRF', 'DEBITO', 'DESCONTO', 'VALOR', 1, 99, 0, 0, 0);

-- 2. Desativar faixas IRRF antigas
UPDATE aliquotas_irrf SET ativo = 0;

-- 3. Inserir faixas IRRF corretas 2026 (Lei 15.270/2025)
INSERT INTO aliquotas_irrf 
    (faixa_inicio, faixa_fim, aliquota, parcela_deduzir, vigencia_inicio) 
VALUES
    (0.00, 2428.80, 0.00, 0.00, '2026-01-01'),
    (2428.81, 2826.65, 7.50, 182.16, '2026-01-01'),
    (2826.66, 3751.05, 15.00, 394.16, '2026-01-01'),
    (3751.06, 4664.68, 22.50, 675.49, '2026-01-01'),
    (4664.69, 999999.99, 27.50, 908.73, '2026-01-01');
