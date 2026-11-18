# Versão, Imagem Docker, Deploy na VPS, Backup, Push (Folha Bem Vindo)

Validado em v1.0.0 e v1.1.0 (2026-11-18). O zip/Hostgator da Frimelo (`create_zip.py`) **não é usado**.

## Sequência
1. **Confirme o número da versão com o Valter** (patch = correção; minor = funcionalidade).
2. Código testado no Docker local → commit do código → `npm --no-git-tag-version version X.Y.Z` → commit `chore(release): vX.Y.Z`.
3. Imagem e conferência:
   ```bash
   docker build -q -f docker/Dockerfile -t folha-bemvindo:X.Y.Z .
   docker run --rm --entrypoint sh folha-bemvindo:X.Y.Z -c 'ls /var/www/html/backend/v1/.env; grep -o "X\.Y\.Z" /var/www/html/assets/index-*.js | head -1; php -m | grep -cE "^(calendar|gd|bcmath|pdo_mysql)$"; php -l /var/www/html/backend/v1/routes/<alterado>.php'
   ```
   Esperado: `.env` não existe · versão aparece · `4` · sem erro de sintaxe.
4. VPS (`ssh luzitec-vps`, tudo em `/opt/bemvindo`):
   1. Backup na hora: `systemctl start bemvindo-backup.service; tail -2 /opt/bemvindo/backup/backup.log`.
   2. Enviar: `docker save folha-bemvindo:X.Y.Z | gzip -1 | ssh luzitec-vps 'gunzip | docker load'` (a VPS não tem código nem credencial do GitHub).
   3. Migrations novas **antes** da troca: `scp docker/banco/NN_x.sql luzitec-vps:/opt/bemvindo/docker/banco/` e `ssh luzitec-vps 'cd /opt/bemvindo && docker compose exec -T db sh -c "mariadb -u root -p\"\$MARIADB_ROOT_PASSWORD\" \"\$MARIADB_DATABASE\"" < docker/banco/NN_x.sql'`. Para consultas de conferência, mande o SQL pelo stdin (`echo "SELECT ..." | ssh ... mariadb`) — aspas aninhadas quebram.
   4. Se mudou `docker-compose.yml`: `scp` antes.
   5. Trocar: `sed -i "s/^IMAGEM_TAG=.*/IMAGEM_TAG=X.Y.Z/" .env && docker compose up -d --no-build` (sempre `--no-build`).
5. Conferir: `curl -s http://127.0.0.1:8090/backend/v1/status` (online + connected), versão no bundle, `.php` solto → 403 (o log `AH01797 client denied` é esse teste), `docker logs --since 2m bemvindo-app` sem `EXCEPTION`, **CRM `https://crm.luzitec.cnt.br/` → 307**.
6. Valter testa na tela (http://localhost:8090 com túnel, ou o domínio quando houver DNS).
7. Após OK: `CHANGELOG.md` (Adicionado/Alterado/Corrigido/Segurança/Banco de Dados) + SPEC/PRD/CLAUDE/skill se mudou regra → `docs(vX.Y.Z): ...` → `git tag vX.Y.Z`.
8. Comandos para o Valter (o `git push` do agente é bloqueado; o remote usa a conta `valterpcjria-cloud`, push funciona direto):
   ```
   git push origin main
   git push origin vX.Y.Z
   ```
   Conferir: `git ls-remote origin HEAD 'refs/tags/*'` = `git rev-parse HEAD` e só tags v1.x no remoto.

## Rollback
`IMAGEM_TAG` da versão anterior + `docker compose up -d --no-build`. O cron do CRM (`/etc/cron.d/docker-image-prune`, 05:25, `prune -af --filter until=24h`) apaga imagens sem uso → a anterior provavelmente não está mais na VPS: reenviar do PC (`docker images folha-bemvindo`). Migrations são aditivas e compatíveis com a versão anterior. Restaurar banco: `docker/vps/LEIA-ME.md`.

## Armadilhas
- **Nunca `git push --tags`/`--all`** nem a branch `frimelo-historico`: 42 tags v4.x locais apontam para histórico com senhas.
- Porta 8090 local costuma estar ocupada pelo túnel → teste local em 8091 (`APP_PORTA` e `APP_ORIGIN` no env de teste).
- Disco do PC do Valter é pequeno (240 GB): imagens de 733 MB acumulam; limpeza só com autorização dele.
- Nunca exibir o `.env` da VPS (`sed "s/=.*/=***/" .env` para ver chaves).
- Senha temporária do SUPERADMIN: o Valter roda `criar_superadmin.php` no terminal dele.
