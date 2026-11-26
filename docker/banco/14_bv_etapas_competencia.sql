-- Folha Bem Vindo v1.4.0 — competência em 6 etapas + perfis CONTABILIDADE e DIRETOR
-- Idempotente e aditiva. Na VPS: rodar ANTES de trocar a imagem.
--
-- etapa: ABERTA → EM_CONFERENCIA → VALIDADA → AUTORIZADA → PAGA → ENCERRADA
-- status (ABERTA/FECHADA) continua sendo a trava do cálculo: etapa ABERTA = status ABERTA;
-- qualquer outra etapa = status FECHADA (lançamentos travados, snapshot).

ALTER TABLE `competencias`
  ADD COLUMN IF NOT EXISTS `etapa` ENUM('ABERTA','EM_CONFERENCIA','VALIDADA','AUTORIZADA','PAGA','ENCERRADA')
    NOT NULL DEFAULT 'ABERTA' COMMENT 'Bem Vindo v1.4.0: etapa do fluxo da competência' AFTER `status`;

-- Competências já fechadas antes da v1.4.0 viram ENCERRADA (só as que ainda estão no padrão).
UPDATE `competencias` SET `etapa` = 'ENCERRADA' WHERE `status` = 'FECHADA' AND `etapa` = 'ABERTA';

CREATE TABLE IF NOT EXISTS `competencia_etapas_historico` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `competencia_id` BIGINT NOT NULL,
  `id_empresa` INT UNSIGNED NOT NULL,
  `etapa_de` VARCHAR(20) NOT NULL,
  `etapa_para` VARCHAR(20) NOT NULL,
  `usuario_id` BIGINT UNSIGNED NULL,
  `usuario_nome` VARCHAR(150) NULL,
  `usuario_perfil` VARCHAR(20) NULL,
  `observacao` TEXT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comp_etapas` (`competencia_id`, `criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `usuarios`
  MODIFY `perfil` ENUM('ADMIN','RH','GESTOR','LEITURA','SUPERADMIN','CONTABILIDADE','DIRETOR')
    COLLATE utf8mb4_unicode_ci DEFAULT 'RH';

-- Correção (herdada da Frimelo): abrir competência copia as rubricas 33/82 da última fechada com
-- origem 'COPIA_COMPETENCIA', valor que não existia no ENUM → erro 1265 (500) com STRICT_TRANS_TABLES.
ALTER TABLE `lancamentos_eventos`
  MODIFY `origem` ENUM('MANUAL','CALCULO','IMPORTADO','COPIA_COMPETENCIA')
    COLLATE utf8mb4_unicode_ci DEFAULT 'MANUAL';
