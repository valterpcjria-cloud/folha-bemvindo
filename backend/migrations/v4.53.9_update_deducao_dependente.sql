-- Migration v4.53.9: Atualiza dedução por dependente IRRF — Lei 15.270/2025
-- Valor oficial 2026: R$ 189,59 (era R$ 203,77)
-- Idempotente

UPDATE parametros_sistema
SET valor = '189.59'
WHERE chave = 'VALOR_DEDUCAO_DEPENDENTE'
  AND valor = '203.77';
