#!/bin/sh
# FOLHA BEM VINDO: cópia de segurança diária do banco + configuração (VPS, /opt/bemvindo/backup).
# Mesmo desenho do backup do CRM, mas SEPARADO dele (outro horário, outra pasta, outra pasta no Drive):
#   - 14 dias em /opt/bemvindo/backup/copias
#   - 30 dias no Google Drive do Valter, em LUZITEC (remote criptografado) /bemvindo/
# Rodado pelo bemvindo-backup.timer (02:30). Resultado em /opt/bemvindo/backup/backup.log.
# Restaurar: ver docker/vps/LEIA-ME.md no repositório.
set -u
umask 077
BASE=/opt/bemvindo
DESTINO=$BASE/backup/copias
QUANDO=$(date +%Y%m%d-%H%M)
ARQ="$DESTINO/bemvindo-$QUANDO.tar"
mkdir -p "$DESTINO"
TMP=$(mktemp -d "$BASE/backup/.trabalho-XXXX")
trap 'rm -rf "$TMP"' EXIT

falhou() {
  echo "$(date "+%F %T") FALHA: $1"
  exit 1
}

# 1) Banco inteiro (transação única: não trava a folha enquanto copia)
docker exec bemvindo-db sh -c 'exec mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers --events --default-character-set=utf8mb4 "$MARIADB_DATABASE"' \
  | gzip -6 > "$TMP/banco.sql.gz" || falhou "cópia do banco"
# Conferência: gzip íntegro e o dump chegou até o fim
gzip -t "$TMP/banco.sql.gz" || falhou "conferência do gzip"
gzip -dc "$TMP/banco.sql.gz" | tail -1 | grep -q "Dump completed" || falhou "dump incompleto"

# 2) Configuração (senhas internas e chave das sessões: sem o .env o banco não volta igual)
tar -C "$BASE" -czf "$TMP/configuracao.tar.gz" .env docker-compose.yml docker/banco || falhou "cópia da configuração"
tar -C "$TMP" -cf "$ARQ" banco.sql.gz configuracao.tar.gz || falhou "montagem do pacote"
find "$DESTINO" -name "bemvindo-*.tar" -mtime +13 -delete
echo "$(date "+%F %T") OK $(du -h "$ARQ" | cut -f1) $(basename "$ARQ")"

# 3) Cópia externa: Google Drive, pasta própria bemvindo/ dentro do remote criptografado.
#    O apagar dos 30 dias vale SÓ para bemvindo/bemvindo-*.tar (nunca toca nos arquivos do CRM).
if rclone copy "$ARQ" luzitec-backup-cripto:bemvindo --retries 5 -q \
   && rclone delete luzitec-backup-cripto:bemvindo --min-age 30d --include "/bemvindo-*.tar" -q; then
  echo "$(date "+%F %T") OK enviado ao Google Drive (criptografado)"
else
  falhou "envio ao Google Drive"
fi
