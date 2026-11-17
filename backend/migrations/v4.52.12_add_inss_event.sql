-- Migration v4.52.12: Garante que o evento 35 (INSS) exista em eventos_folha
-- Necessario para que o auto-calculo de INSS no grid (v4.52.11) funcione.
-- Sem o registro, o grid nao renderiza a coluna 35 e o recalcularINSSTodos
-- falha silenciosamente (eventos.find retorna undefined).

-- 1. Insere o evento se ainda nao existe (idempotente via PREPARE/EXECUTE).
SET @existe := (SELECT COUNT(*) FROM eventos_folha WHERE codigo_evento = 35);

SET @sql := IF(
    @existe = 0,
    'INSERT INTO eventos_folha (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao, incide_inss, incide_fgts, incide_irrf) VALUES (35, ''INSS'', ''DEBITO'', ''DESCONTO'', ''VALOR'', 1, 50, 0, 0, 0)',
    'SELECT ''Evento 35 INSS ja existe — sem alteracoes'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Garante atributos corretos caso o evento ja exista mas esteja mal configurado.
UPDATE eventos_folha
SET tipo = 'DEBITO',
    natureza = 'DESCONTO',
    unidade = 'VALOR',
    obrigatorio = 1
WHERE codigo_evento = 35;

-- 3. INSS nao incide sobre si mesmo nem sobre FGTS/IRRF
UPDATE eventos_folha
SET incide_inss = 0, incide_fgts = 0, incide_irrf = 0
WHERE codigo_evento = 35;
