-- Migration v4.53.2: Correção do Teto e Gaps do INSS 2026
-- Idempotente — pode ser executado várias vezes

-- 1. Atualizar teto INSS 2026 para R$ 8.475,55 nos parâmetros do sistema
UPDATE `parametros_sistema` SET `valor` = '8475.55' WHERE `chave` = 'TETO_INSS';

-- 2. Desativar faixas INSS antigas de 2026
UPDATE `aliquotas_inss` SET `ativo` = 0 WHERE `vigencia_inicio` = '2026-01-01';

-- 3. Inserir faixas INSS corretas contínuas (sem gaps) e com o novo teto
INSERT INTO `aliquotas_inss` (`faixa_inicio`, `faixa_fim`, `aliquota`, `vigencia_inicio`, `ativo`) VALUES
(0.00, 1621.00, 7.50, '2026-01-01', 1),
(1621.00, 2902.84, 9.00, '2026-01-01', 1),
(2902.84, 4354.27, 12.00, '2026-01-01', 1),
(4354.27, 8475.55, 14.00, '2026-01-01', 1);
