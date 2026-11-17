-- Migração v4.41.4 — Rubrica 59: DSR s/ Horas Extras Diurnas (Multi-Percentual)
--
-- OBJETIVO: Cadastrar a rubrica 59 no banco e configurar a rubrica 49 (HE 100%) 
-- como fonte de cálculo do DSR de horas extras diurnas.
-- A arquitetura é multi-percentual: novas rubricas de HE podem ser adicionadas
-- na tabela dsr_he_config_eventos sem nenhuma alteração de código.
--
-- Compatível com MySQL 5.7 / 8.0 (HostGator)
-- Ordem: 5.5 — entre a rubrica 49 (ordem 5) e 1080 (ordem 6)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Abrir espaço para o evento 59 logo após o 49 (ordem 5 no banco)
--    Eventos com ordem >= 6 sobem 1 para que 59 fique na posição 6
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE `eventos_folha`
SET `ordem_exportacao` = `ordem_exportacao` + 1
WHERE `ordem_exportacao` >= 6
  AND `codigo_evento` != 59;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Cadastrar a Rubrica 59 em eventos_folha (posição 6 = logo após 49)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `eventos_folha`
    (codigo_evento, nome_evento, tipo, natureza, unidade, formula, obrigatorio, ativo, ordem_exportacao)
VALUES
    (59, 'DSR s/ Horas Extras Diurnas', 'CREDITO', 'PROVENTO', 'VALOR',
     'Calculado: (SUM(rubricas_he_ativas) / dias_uteis) * (domingos + feriados)',
     1, 1, 6);
-- ordem_exportacao = 6 → imediatamente após HE 100% (ordem 5)

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela de configuração de rubricas-fonte do DSR de HE Diurnas (Rubrica 59)
--    Permite adicionar novas rubricas de HE (50%, 70%, 80%, etc.) sem alterar código.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `dsr_he_config_eventos` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `codigo_evento_fonte` INT UNSIGNED NOT NULL COMMENT 'Código do evento de HE que entra na base (ex: 49, 48)',
    `descricao`   VARCHAR(100) NOT NULL COMMENT 'Descrição para log/UI (ex: HE 100%)',
    `ativo`       TINYINT(1)   NOT NULL DEFAULT 1,
    `criado_em`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_codigo_evento_fonte` (`codigo_evento_fonte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rubricas de HE diurnas que compõem a base da Rubrica 59 (DSR s/ HE). Adicione novas rubricas aqui sem alterar código.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Configuração inicial: Rubrica 49 (HE 100%) como única fonte ativa
--    Para adicionar HE 50%, HE 70%, etc., basta inserir novas linhas aqui.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `dsr_he_config_eventos` (codigo_evento_fonte, descricao, ativo)
VALUES
    (49, 'Horas Extras 100%', 1);
-- Exemplos de rubricas futuras (descomentar e ajustar quando existirem):
-- (48, 'Horas Extras 50%',  1),
-- (XX, 'Horas Extras 60%',  1),
-- (XX, 'Horas Extras 70%',  1),
-- (XX, 'Horas Extras 80%',  1),
