-- Migration v4.53.10: Adicionar gratificacao em funcionarios
-- A gratificação deixa de ser editada via rubrica 88 no grid e passa a ser um campo
-- do cadastro do funcionário. A rubrica 88 é alimentada automaticamente pela
-- gratificacao em competências ABERTAS. Competências FECHADAS permanecem
-- imutáveis (snapshot histórico).

-- 1. Adiciona a coluna de forma idempotente
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'funcionarios'
      AND COLUMN_NAME = 'gratificacao'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE funcionarios ADD COLUMN gratificacao DECIMAL(10,2) NULL DEFAULT 0.00 COMMENT \'Gratificacao do funcionario. Alimenta rubrica 88 em competencias abertas.\'',
    'SELECT \'gratificacao ja existe\' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Popula gratificacao com o valor_total da rubrica 88 do lançamento mais
-- recente (maior competencia_id) de cada funcionário.
UPDATE funcionarios f
SET f.gratificacao = COALESCE((
    SELECT le.valor_total
    FROM lancamentos_eventos le
    INNER JOIN eventos_folha ef ON ef.id = le.evento_id
    WHERE le.funcionario_id = f.id
      AND le.id_empresa = f.id_empresa
      AND ef.codigo_evento = 88
      AND le.valor_total > 0
    ORDER BY le.competencia_id DESC
    LIMIT 1
), 0.00)
WHERE f.gratificacao IS NULL OR f.gratificacao = 0.00;
