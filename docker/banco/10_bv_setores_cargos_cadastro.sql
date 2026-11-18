-- Bem Vindo — Fase A.1: setores com hierarquia de cargos + campos novos do cadastro
-- Idempotente e aditivo. Sem DELIMITER.
-- Banco novo: roda sozinho na primeira subida (docker-entrypoint-initdb.d).
-- Banco já existente: docker compose exec -T db sh -c 'mariadb -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < docker/banco/10_bv_setores_cargos_cadastro.sql

-- 1. Setores (ordem = ordem dos blocos na matriz; desativar em vez de excluir, preservando histórico)
CREATE TABLE IF NOT EXISTS `setores` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `id_empresa` INT UNSIGNED NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `ordem` INT NOT NULL DEFAULT 0,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_setor_empresa_nome` (`id_empresa`, `nome`),
  INDEX `idx_setores_empresa_ordem` (`id_empresa`, `ordem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cargos passam a pertencer à empresa e a um setor, com posição na hierarquia (1 = topo)
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos' AND COLUMN_NAME = 'id_empresa');
SET @s := IF(@c = 0, 'ALTER TABLE cargos ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos' AND COLUMN_NAME = 'id_setor');
SET @s := IF(@c = 0, 'ALTER TABLE cargos ADD COLUMN id_setor INT UNSIGNED NULL AFTER id_empresa', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos' AND COLUMN_NAME = 'ordem_hierarquia');
SET @s := IF(@c = 0, 'ALTER TABLE cargos ADD COLUMN ordem_hierarquia INT NOT NULL DEFAULT 99 COMMENT \'1 = topo da hierarquia do setor\' AFTER piso_salarial', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- O nome era único no banco inteiro: impedia "Auxiliar" na Padaria e no Açougue. Passa a ser único por empresa + setor.
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos' AND INDEX_NAME = 'nome');
SET @s := IF(@c > 0, 'ALTER TABLE cargos DROP INDEX nome', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos' AND INDEX_NAME = 'uk_cargo_empresa_setor_nome');
SET @s := IF(@c = 0, 'ALTER TABLE cargos ADD UNIQUE KEY uk_cargo_empresa_setor_nome (id_empresa, id_setor, nome)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos' AND INDEX_NAME = 'idx_cargos_empresa_setor');
SET @s := IF(@c = 0, 'ALTER TABLE cargos ADD INDEX idx_cargos_empresa_setor (id_empresa, id_setor, ordem_hierarquia)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 3. Funcionário: setor, cargo da hierarquia, dados pessoais pedidos e dados de pagamento
--    (departamento continua sendo o código usado na exportação para a contabilidade)
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND COLUMN_NAME = 'id_setor');
SET @s := IF(@c = 0, 'ALTER TABLE funcionarios ADD COLUMN id_setor INT UNSIGNED NULL, ADD COLUMN id_cargo BIGINT UNSIGNED NULL, ADD INDEX idx_func_setor (id_empresa, id_setor)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND COLUMN_NAME = 'data_nascimento');
SET @s := IF(@c = 0, 'ALTER TABLE funcionarios ADD COLUMN data_nascimento DATE NULL, ADD COLUMN sexo ENUM(\'F\',\'M\',\'O\') NULL COMMENT \'F, M ou O (outro/não informado)\', ADD COLUMN escolaridade VARCHAR(40) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funcionarios' AND COLUMN_NAME = 'modalidade_pagamento');
SET @s := IF(@c = 0, 'ALTER TABLE funcionarios ADD COLUMN modalidade_pagamento ENUM(\'BANCO\',\'PIX\',\'LOJA\') NULL DEFAULT \'BANCO\', ADD COLUMN banco VARCHAR(80) NULL, ADD COLUMN agencia VARCHAR(20) NULL, ADD COLUMN conta VARCHAR(30) NULL, ADD COLUMN tipo_conta ENUM(\'CORRENTE\',\'POUPANCA\',\'SALARIO\') NULL, ADD COLUMN chave_pix VARCHAR(140) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 4. Setores atuais da planilha do Bem Vindo (empresa 1). Editáveis depois na tela "Setores e Cargos".
INSERT IGNORE INTO `setores` (`id_empresa`, `nome`, `ordem`) VALUES
(1, 'Administrativo', 1),
(1, 'Açougue', 2),
(1, 'Padaria', 3),
(1, 'FLV', 4),
(1, 'PGC', 5),
(1, 'Frente de Loja', 6),
(1, 'Vendas Online / Escolas', 7),
(1, 'Entregas', 8);

-- Conferência:
-- SELECT id, nome, ordem FROM setores ORDER BY ordem;
-- SHOW COLUMNS FROM cargos; SHOW COLUMNS FROM funcionarios LIKE '%pagamento%';
