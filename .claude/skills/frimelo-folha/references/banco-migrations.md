# Banco de Dados e Migrations

Banco do Bem Vindo: **MariaDB 11.4 em container** (`bemvindo-db`, sem porta exposta) na VPS. Console: `ssh luzitec-vps 'cd /opt/bemvindo && docker compose exec db sh -c "mariadb -u root -p\"\$MARIADB_ROOT_PASSWORD\" \"\$MARIADB_DATABASE\""'`. Tabelas: `SPEC.md` §4 (base) + §0.3 (Bem Vindo). PDO com `EMULATE_PREPARES=false` → parâmetro nomeado não pode repetir (HY093).

## Tabelas que mais importam
- `lancamentos_eventos` — `UNIQUE (funcionario_id, competencia_id, evento_id)` **sem** `id_empresa`. Upsert deve ter `id_empresa = VALUES(id_empresa)` no `ON DUPLICATE KEY UPDATE` (senão "salva mas some no refresh").
- `funcionarios` — cadastro + rubricas do cadastro (`salario_base`, `gratificacao`, `*_perc`, ...), `status` (DESLIGADO).
- `competencias` — `status` ABERTA/FECHADA.
- `competencia_atestados` — atestado por funcionário/competência (isolada; não afeta export/import); `dias` desde BV v1.1.0.
- BV v1.2.0 (`13_bv_rubricas_v120.sql`): `funcionarios.gratificacao_funcao_perc`, `vt_desconto_perc`, `vt_custo_mensal`; eventos 82/37/23/816; 88 `ativo = 0`; 37 em `dsr_he_config_eventos`. `eventos_folha` é global (sem `id_empresa`), unique em `codigo_evento`.
- **Bem Vindo:** `setores`; `cargos` (`id_setor`, `ordem_hierarquia`); `funcionarios` + `id_setor`, `id_cargo`, `data_nascimento`, `sexo`, `escolaridade`, pagamento (`modalidade_pagamento`, `banco`, `agencia`, `conta`, `tipo_conta`, `chave_pix`). `departamento` = código da exportação contábil, não é setor.
- `usuarios` (+ `must_change_password`), `jwt_blacklist` (jti revogados), `logs_auditoria` (`registrarLog`), `feriados` (`ativo`), `eventos_folha`, `parametros_sistema`, `empresas`.

## Persistência de lançamentos
- Payload de save sempre com `codigo_evento` (backend usa para auto-cálculo).
- **Nunca salvar** rubrica 59 (DSR) nem 1900 (FGTS Visual) — são virtuais.
- `saveBulk` valida `evento_id` contra `eventos_folha`, resolve insalubridade/salário/faltas/gratificação do lote, ignora competência fechada.
- Após salvar: recarregar do banco e rodar a cascata completa.

## Migrations (Bem Vindo)
- Arquivo `docker/banco/NN_bv_descricao.sql` (10, 11, 12…; num banco novo o initdb roda todos em ordem). **Idempotente** e **aditiva** (rollback = imagem anterior sem desfazer SQL). `backend/migrations/` é histórico da Frimelo.
- Sem `DELIMITER`. Coluna nova: `ALTER TABLE t ADD COLUMN IF NOT EXISTS ...` (MariaDB) ou o padrão INFORMATION_SCHEMA + `PREPARE` de `assets/migration_template.sql`.
- Testar no Docker local: banco criado SEM a migration → rodar 2× → conferir em `information_schema`.
- Tabela nova: `CREATE TABLE IF NOT EXISTS ... ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- Na VPS, o agente roda (scp + `docker compose exec -T db mariadb`) **antes** de trocar a imagem, depois do backup na hora; confere em `information_schema`.
- Código PHP que depende da migration deve degradar com segurança se ela não rodou quando possível (ex.: `tokenRevogado` é fail-open com `error_log`).
- Registre a migration em `SPEC.md` §4.3.

## Consultas úteis (só leitura) para pedir ao Valter
- Quem mexeu em usuários hoje: `SELECT l.created_at, u.nome, l.acao, l.detalhes FROM logs_auditoria l LEFT JOIN usuarios u ON u.id=l.usuario_id WHERE l.entidade='USUARIO' AND l.created_at >= CURDATE() ORDER BY l.created_at DESC;`
- Usuários sem empresa: `SELECT id,nome,email,perfil FROM usuarios WHERE ativo=1 AND (id_empresa IS NULL OR id_empresa<=0);`
- Logout funcionando: `SELECT COUNT(*) FROM jwt_blacklist;`
