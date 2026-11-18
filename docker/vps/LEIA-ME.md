# Backup da Folha Bem Vindo na VPS

Instalado em 18/11/2026. Separado do backup do CRM (que roda às 03:00 em `/opt/luzitec/backup`).

| O quê | Onde |
|---|---|
| Script | `/opt/bemvindo/backup/fazer-backup.sh` (cópia deste `fazer-backup.sh`) |
| Agendamento | `bemvindo-backup.timer` → todo dia 02:30 (systemd, em `/etc/systemd/system/`) |
| Cópias locais (14 dias) | `/opt/bemvindo/backup/copias/bemvindo-AAAAMMDD-HHMM.tar` |
| Cópias externas (30 dias) | Google Drive, remote criptografado `luzitec-backup-cripto:bemvindo/` |
| Registro | `/opt/bemvindo/backup/backup.log` |

Cada pacote `.tar` tem `banco.sql.gz` (dump completo, conferido até "Dump completed") e
`configuracao.tar.gz` (`.env`, `docker-compose.yml`, `docker/banco/`). O `.env` tem as senhas:
o pacote é sigiloso (fica `600` na VPS e criptografado no Drive).

## Conferir

```
ssh luzitec-vps 'tail -4 /opt/bemvindo/backup/backup.log; systemctl list-timers --no-pager | grep bemvindo'
```

Rodar uma cópia agora (ex.: antes de uma atualização): `ssh luzitec-vps 'systemctl start bemvindo-backup.service; tail -2 /opt/bemvindo/backup/backup.log'`

## Restaurar o banco (só em caso de perda — sobrescreve os dados atuais)

1. Fazer uma cópia do estado atual antes (comando acima).
2. Escolher o pacote: `ssh luzitec-vps 'ls /opt/bemvindo/backup/copias'`
   (do Drive: `rclone copy luzitec-backup-cripto:bemvindo/bemvindo-AAAAMMDD-HHMM.tar /opt/bemvindo/backup/copias/`).
3. Restaurar:
   ```
   ssh luzitec-vps 'cd /opt/bemvindo && tar -xOf backup/copias/bemvindo-AAAAMMDD-HHMM.tar banco.sql.gz | gunzip | docker compose exec -T db sh -c "mariadb -u root -p\"\$MARIADB_ROOT_PASSWORD\" \"\$MARIADB_DATABASE\""'
   ```
4. Conferir: `ssh luzitec-vps 'curl -s http://127.0.0.1:8090/backend/v1/status'` e entrar no sistema.

Restauração testada em 18/11/2026 num MariaDB descartável: 26 tabelas, usuários, setores e empresa voltaram.

## Aviso

O rclone avisa que o client_id compartilhado do Google Drive será desativado em 2026. Quando parar,
o envio ao Drive falha (o do CRM também) — criar client_id próprio: https://rclone.org/drive/#making-your-own-client-id
