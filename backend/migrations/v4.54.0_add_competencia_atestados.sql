-- Migração v4.54.0 - Atestados por Competência (perda de Assiduidade)
-- Registra que um funcionário apresentou atestado numa competência.
-- A presença de um registro aqui zera a Assiduidade (833) daquele funcionário
-- na competência, junto com a condição de Faltas (71) preenchida.
-- Tabela isolada: NÃO entra em lancamentos_eventos, portanto não afeta exportação/importação.

CREATE TABLE IF NOT EXISTS `competencia_atestados` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `funcionario_id` INT UNSIGNED NOT NULL,
  `competencia_id` INT UNSIGNED NOT NULL,
  `id_empresa` INT UNSIGNED NOT NULL DEFAULT 1,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_atestado_func_comp` (`funcionario_id`, `competencia_id`),
  INDEX `idx_atestado_comp` (`competencia_id`),
  INDEX `idx_atestado_empresa` (`id_empresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
