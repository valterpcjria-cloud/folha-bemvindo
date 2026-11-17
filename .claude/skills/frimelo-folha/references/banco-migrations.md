# Banco de Dados e Migrations

Banco: MySQL/MariaDB na Hostgator (`meusis41_frimelo_db`), acessado pelo Valter via phpMyAdmin. Tabelas e colunas: `SPEC.md` §4.

## Tabelas que mais importam
- `lancamentos_eventos` — `UNIQUE (funcionario_id, competencia_id, evento_id)` **sem** `id_empresa`. Upsert deve ter `id_empresa = VALUES(id_empresa)` no `ON DUPLICATE KEY UPDATE` (senão "salva mas some no refresh").
- `funcionarios` — cadastro + rubricas do cadastro (`salario_base`, `gratificacao`, `*_perc`, ...), `status` (DESLIGADO).
- `competencias` — `status` ABERTA/FECHADA.
- `competencia_atestados` — atestado por funcionário/competência (isolada; não afeta export/import).
- `usuarios` (+ `must_change_password`), `jwt_blacklist` (jti revogados), `logs_auditoria` (`registrarLog`), `feriados` (`ativo`), `eventos_folha`, `parametros_sistema`, `empresas`.

## Persistência de lançamentos
- Payload de save sempre com `codigo_evento` (backend usa para auto-cálculo).
- **Nunca salvar** rubrica 59 (DSR) nem 1900 (FGTS Visual) — são virtuais.
- `saveBulk` valida `evento_id` contra `eventos_folha`, resolve insalubridade/salário/faltas/gratificação do lote, ignora competência fechada.
- Após salvar: recarregar do banco e rodar a cascata completa.

## Migrations
- Arquivo `backend/migrations/vX.Y.Z_descricao.sql`, **idempotente** e **aditiva** (rollback do código = zip anterior sem desfazer SQL).
- Sem `DELIMITER` (phpMyAdmin/PDO). Coluna nova via INFORMATION_SCHEMA + `PREPARE` — use `assets/migration_template.sql`.
- Tabela nova: `CREATE TABLE IF NOT EXISTS ... ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- O Valter roda **antes** de subir o zip. Entregue o SQL pronto para colar + uma consulta de conferência (`SHOW TABLES LIKE ...`, `SHOW COLUMNS ... LIKE ...`).
- Código PHP que depende da migration deve degradar com segurança se ela não rodou quando possível (ex.: `tokenRevogado` é fail-open com `error_log`).
- Registre a migration em `SPEC.md` §4.3.

## Consultas úteis (só leitura) para pedir ao Valter
- Quem mexeu em usuários hoje: `SELECT l.created_at, u.nome, l.acao, l.detalhes FROM logs_auditoria l LEFT JOIN usuarios u ON u.id=l.usuario_id WHERE l.entidade='USUARIO' AND l.created_at >= CURDATE() ORDER BY l.created_at DESC;`
- Usuários sem empresa: `SELECT id,nome,email,perfil FROM usuarios WHERE ativo=1 AND (id_empresa IS NULL OR id_empresa<=0);`
- Logout funcionando: `SELECT COUNT(*) FROM jwt_blacklist;`
