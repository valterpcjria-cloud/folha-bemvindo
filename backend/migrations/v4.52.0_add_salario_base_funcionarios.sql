-- Migration v4.52.0: Adicionar salario_base em funcionarios
-- O salário deixa de ser editado via rubrica 33 no grid e passa a ser um campo
-- do cadastro do funcionário. A rubrica 33 é alimentada automaticamente pelo
-- salario_base em competências ABERTAS. Competências FECHADAS permanecem
-- imutáveis (snapshot histórico).

-- 1. Adiciona a coluna de forma idempotente (checando INFORMATION_SCHEMA)
-- Esta abordagem funciona em MySQL 5.x/8.x e MariaDB sem depender de "IF NOT EXISTS".
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'funcionarios'
      AND COLUMN_NAME = 'salario_base'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE funcionarios ADD COLUMN salario_base DECIMAL(10,2) NULL DEFAULT NULL COMMENT ''Salario base do funcionario. Alimenta rubrica 33 em competencias abertas.''',
    'SELECT ''salario_base ja existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Popula salario_base com o valor_total da rubrica 33 do lançamento mais
-- recente (maior competencia_id) de cada funcionário.
UPDATE funcionarios f
SET f.salario_base = (
    SELECT le.valor_total
    FROM lancamentos_eventos le
    INNER JOIN eventos_folha ef ON ef.id = le.evento_id
    WHERE le.funcionario_id = f.id
      AND le.id_empresa = f.id_empresa
      AND ef.codigo_evento = 33
      AND le.valor_total > 0
    ORDER BY le.competencia_id DESC
    LIMIT 1
)
WHERE f.salario_base IS NULL;
