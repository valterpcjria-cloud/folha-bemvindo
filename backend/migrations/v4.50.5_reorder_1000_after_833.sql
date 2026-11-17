-- Migration: Reordenar rubrica 1000 para logo após a 833 (Prêmio Assiduidade)
-- v4.50.5
-- Ordem final: 833(7) → 1000(8) → 71(9) → 191(10) → 936(11) → 4004(12)

UPDATE eventos_folha
SET ordem_exportacao = CASE codigo_evento
    WHEN 1000 THEN 8
    WHEN 71   THEN 9
    WHEN 191  THEN 10
    WHEN 936  THEN 11
    WHEN 4004 THEN 12
    ELSE ordem_exportacao
END
WHERE codigo_evento IN (1000, 71, 191, 936, 4004);
