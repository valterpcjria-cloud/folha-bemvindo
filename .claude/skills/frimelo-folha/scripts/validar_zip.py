#!/usr/bin/env python3
"""
Valida o pacote de deploy do FOLHA FRIMELO antes de entregar ao usuário.

Uso:
    python3 .claude/skills/frimelo-folha/scripts/validar_zip.py deploy-frimelo-X.Y.Z.zip [--versao X.Y.Z]

Checa: integridade (testzip), arquivos duplicados, ausência de .env, arquivos obrigatórios,
bloqueio de PHP solto no .htaccess da API, ausência de .php na raiz do site e (opcional)
se a versão aparece no bundle JS. Sai com código 1 se algo crítico falhar.
"""
import argparse
import re
import sys
import zipfile

OBRIGATORIOS = [
    "index.html",
    ".htaccess",
    "backend/v1/index.php",
    "backend/v1/config.php",
    "backend/v1/.htaccess",
    "backend/v1/middleware/auth.php",
    "backend/v1/lib/JWT.php",
    "backend/v1/lib/AuthSession.php",
    "backend/v1/services/LancamentoService.php",
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("zip")
    parser.add_argument("--versao", help="versão esperada no bundle (ex: 4.58.1)")
    args = parser.parse_args()

    falhas, avisos = [], []
    try:
        z = zipfile.ZipFile(args.zip)
    except (FileNotFoundError, zipfile.BadZipFile) as e:
        print(f"❌ Não foi possível abrir {args.zip}: {e}")
        return 1

    nomes = z.namelist()
    corrompido = z.testzip()
    if corrompido:
        falhas.append(f"arquivo corrompido no zip: {corrompido}")

    duplicados = len(nomes) - len(set(nomes))
    if duplicados:
        falhas.append(f"{duplicados} entradas duplicadas")

    envs = [n for n in nomes if n == ".env" or n.endswith("/.env")]
    if envs:
        falhas.append(f".env dentro do zip (credenciais!): {envs}")

    faltando = [f for f in OBRIGATORIOS if f not in nomes]
    if faltando:
        falhas.append(f"arquivos obrigatórios ausentes: {faltando}")

    if "backend/v1/.htaccess" in nomes:
        ht = z.read("backend/v1/.htaccess").decode("utf-8", "replace")
        if not re.search(r'<FilesMatch "\^index\\\.php\$">', ht):
            falhas.append("backend/v1/.htaccess sem a liberação exclusiva do index.php (bloqueio de PHP solto)")

    php_raiz = [n for n in nomes if "/" not in n and n.endswith(".php")]
    if php_raiz:
        falhas.append(f".php soltos na raiz do site: {php_raiz}")

    if args.versao:
        bundles = [n for n in nomes if re.match(r"assets/index-[^/]+\.js$", n)]
        if not bundles:
            avisos.append("bundle assets/index-*.js não encontrado para checar a versão")
        elif not any(args.versao.encode() in z.read(b) for b in bundles):
            falhas.append(f"versão {args.versao} não encontrada no bundle (rodou npm version + vite build?)")

    print(f"📦 {args.zip}: {len(nomes)} arquivos")
    for a in avisos:
        print(f"⚠️  {a}")
    for f in falhas:
        print(f"❌ {f}")
    if not falhas:
        print("✅ Zip OK: íntegro, sem duplicados, sem .env, obrigatórios presentes, PHP solto bloqueado"
              + (f", versão {args.versao} no bundle" if args.versao else ""))
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
