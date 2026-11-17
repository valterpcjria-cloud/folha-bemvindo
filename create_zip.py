import zipfile
import os
import sys
import argparse
import json
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--version', required=True)
parser.add_argument('--unified', action='store_true')
args = parser.parse_args()

version = args.version

# 1. Atualiza a versão no package.json automaticamente
try:
    if os.path.exists('package.json'):
        with open('package.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if data.get('version') != version:
            print(f"Atualizando versão no package.json: {data.get('version')} -> {version}")
            data['version'] = version
            with open('package.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
                f.write('\n')
except Exception as e:
    print(f"Aviso: Não foi possível atualizar a versão no package.json: {e}")

# 2. Executa a compilação do frontend antes de gerar o pacote
print("Executando npm run build...")
res = subprocess.run('npm run build', shell=True)
if res.returncode != 0:
    print("Erro: A compilação do frontend (npm run build) falhou!")
    sys.exit(1)

filename = f'deploy-frimelo-{version}.zip'

with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add dist contents to root of zip
    if os.path.exists('dist'):
        print(f"Adding dist/ to {filename}...")
        for root, dirs, files in os.walk('dist'):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, 'dist')
                zipf.write(file_path, rel_path)
    
    # Add backend folder to zip
    if os.path.exists('backend'):
        print(f"Adding backend/ to {filename} (excluding internal logs)...")
        for root, dirs, files in os.walk('backend'):
            # Skips internal log directories
            if 'logs' in root or 'sys_logs' in root:
                continue
            for file in files:
                # Skip .env to never overwrite server credentials
                if file == '.env':
                    continue
                # Include all other files including hidden ones (like .htaccess)
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, '.') 
                zipf.write(file_path, rel_path)

    # v4.57.1: ferramentas PHP soltas NÃO são mais copiadas para a raiz do site
    # (eram executáveis sem login). Manutenção deve passar por rotas autenticadas do index.php.

print(f"Successfully created {filename}")

