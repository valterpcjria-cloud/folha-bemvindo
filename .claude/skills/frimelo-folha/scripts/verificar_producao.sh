#!/usr/bin/env bash
# Verificação externa SÓ-LEITURA da produção do FOLHA FRIMELO.
# Uso: bash .claude/skills/frimelo-folha/scripts/verificar_producao.sh [https://frimelo.meusistemanaweb.com.br]
#
# Não faz login, não envia dados e só acessa endpoints inofensivos:
#  - /backend/v1/status        → espera 200 (API viva, roteador ok)
#  - /backend/v1/check.php     → espera 403 (script solto bloqueado; check.php só lê — NUNCA trocar
#                                 por scripts que escrevem, ex: create_saas_admin.php, pwd_reset.php)
#  - /backend/v1/funcionarios  → espera 401 (login exigido)
#  - bundle JS publicado       → mostra a versão no ar
set -u
B="${1:-https://frimelo.meusistemanaweb.com.br}"
ok=1

check() {
  local path="$1" esperado="$2" desc="$3"
  local code
  code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$B$path")
  if [ "$code" = "$esperado" ]; then
    printf "✅ %-28s HTTP %s  (%s)\n" "$path" "$code" "$desc"
  else
    printf "❌ %-28s HTTP %s, esperado %s  (%s)\n" "$path" "$code" "$esperado" "$desc"
    ok=0
  fi
}

check /backend/v1/status 200 "API respondendo"
check /backend/v1/check.php 403 "PHP solto bloqueado"
check /backend/v1/funcionarios 401 "login exigido"

js=$(curl -s -m 15 "$B/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
if [ -n "$js" ]; then
  versao=$(curl -s -m 20 "$B/$js" | grep -oE '4\.[0-9]+\.[0-9]+' | sort -V | tail -1)
  echo "ℹ️  Bundle publicado: $js — versão detectada: ${versao:-?}"
else
  echo "⚠️  Não encontrei o bundle no index.html"
  ok=0
fi

[ "$ok" = 1 ] && echo "✅ Produção OK" || { echo "❌ Há verificações falhando"; exit 1; }
