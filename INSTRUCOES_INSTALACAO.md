> **Folha Bem Vindo:** este guia é histórico da Frimelo (Hostgator/cPanel) e **não se aplica** ao Bem Vindo, que roda em Docker na VPS. Ver `README.md`, `CLAUDE.md` §2.1 e `docker/vps/LEIA-ME.md`.

# 📁 GUIA DE INSTALAÇÃO (HostGator - cPanel)

Este erro **404** acontece porque a pasta `backend` não está no lugar certo no servidor. O sistema (Frontend) tenta acessar a API, mas não encontra os arquivos.

Siga este passo a passo para corrigir definitivamente:

## 1. O Pacote ZIP
Dentro do arquivo `deploy-frimelo-v4.10.35.zip`, você tem duas pastas principais:
- `dist/` (Site / Frontend)
- `backend/` (API / Banco de Dados)

## 2. Como Instalar no Gerenciador de Arquivos (cPanel)

Acesse a pasta `public_html` (ou a pasta do seu domínio `frimelo.meusistemanaweb.com.br`) e organize **EXATAMENTE** assim:

### A) Pasta `backend`
1. Crie uma pasta chamada `backend` dentro da `public_html`.
2. Abra essa pasta `backend` e carregue todo o conteúdo da pasta `backend` do ZIP.
   - **Resultado Correto:** Você deve ter um arquivo `public_html/backend/v1/index.php`.
   - **Teste:** Acesse `https://frimelo.meusistemanaweb.com.br/backend/v1/` no navegador. Se aparecer uma mensagem JSON (ex: "Sistema RH API ativa"), funcionou!

### B) Pasta `dist` (Frontend)
1. Volte para a raiz `public_html`.
2. Pegue todo o conteúdo de DENTRO da pasta `dist` do ZIP (arquivos `index.html`, pasta `assets`, etc).
3. Solte esses arquivos na raiz `public_html`.
   - **CUIDADO:** Não coloque a pasta `dist` inteira. Coloque o **conteúdo** dela na raiz.
   - **Resultado Correto:** O arquivo `index.html` deve estar em `public_html/index.html`.

## 3. Resumo da Estrutura Final
Seu servidor deve ficar assim:

```text
public_html/
├── assets/          <-- (Pasta do Frontend)
├── backend/         <-- (Pasta da API)
│   └── v1/
│       ├── index.php
│       ├── sys_logs/
│       └── ...
├── index.html       <-- (Arquivo principal do Frontend)
└── vite.svg
```

Se a pasta `backend` não existir ou estiver com outro nome, o erro 404 continuará ocorrendo.
