# FOLHA BEM VINDO — Folha de Pagamento do Supermercado Bem Vindo

Sistema de lançamentos e prévia da folha de pagamento do **Supermercado Bem Vindo** (Luziânia-GO), organizado por setor e hierarquia.
Fork da Folha Frimelo (base v4.58.1); numeração própria a partir de 1.0.0. Versão atual: **v1.1.0** (2026-11-18).
Produção: VPS Hostinger (Docker) → `https://bemvindo.luzitec.cnt.br` (aguardando DNS; até lá, túnel SSH para a porta 8090).

> A contabilidade é a fonte oficial dos cálculos. O sistema faz a prévia, organiza os lançamentos e envia ao escritório.

## Stack
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS (`views/`, `components/`, `hooks/usePayrollData.ts`)
- **Backend:** PHP 8.3 puro + PDO, micro-router em `backend/v1/index.php` (rotas em `backend/v1/routes/`)
- **Banco:** MariaDB 11.4 em container. Estrutura inicial e migrations em `docker/banco/` (rodam sozinhas num banco novo)
- **Infra:** `docker/Dockerfile` (php:8.3-apache) + `docker-compose.yml` (app em `127.0.0.1:8090` + banco sem porta). Caddy da VPS faz o HTTPS.

## Documentação (leia antes de alterar o sistema)
| Arquivo | Conteúdo |
|---------|----------|
| [CLAUDE.md](CLAUDE.md) | Regras para agentes de IA: o que é o projeto, fluxo de versão/deploy, regras do Bem Vindo e pendências |
| [SPEC.md](SPEC.md) | Especificação técnica (§0 = diferenças do Bem Vindo; demais seções = base herdada da Frimelo) |
| [PRD.md](PRD.md) | Requisitos de produto (§0 = requisitos do Bem Vindo e fases) |
| [CHANGELOG.md](CHANGELOG.md) | Histórico por versão (Bem Vindo no topo, Frimelo abaixo) |
| [docker/vps/LEIA-ME.md](docker/vps/LEIA-ME.md) | Backup diário do banco na VPS e como restaurar |

## Desenvolvimento e teste local (dados fictícios)
```bash
npm install
npx tsc --noEmit -p .        # único erro aceito: FormulasView.tsx (pré-existente)
npx vite build
docker build -f docker/Dockerfile -t folha-bemvindo:teste .
# subir com um env de teste (chaves de docker/env.exemplo) numa porta livre e derrubar com "down -v" no fim
```

## Deploy na VPS (resumo — detalhes em CLAUDE.md §2.1)
1. `docker build -f docker/Dockerfile -t folha-bemvindo:X.Y.Z .`
2. Backup na hora: `ssh luzitec-vps 'systemctl start bemvindo-backup.service'`
3. `docker save folha-bemvindo:X.Y.Z | gzip -1 | ssh luzitec-vps 'gunzip | docker load'`
4. Migrations novas de `docker/banco/` **antes** de trocar a imagem.
5. Em `/opt/bemvindo`: `IMAGEM_TAG=X.Y.Z` no `.env` → `docker compose up -d --no-build`.
6. Conferir `/backend/v1/status` e que o CRM da mesma VPS continua respondendo.
- Rollback: `IMAGEM_TAG` anterior + `docker compose up -d --no-build` (migrations são aditivas).

## Git
- Push só de `main` e da tag da versão: `git push origin main` e `git push origin vX.Y.Z`.
- **Nunca** `git push --tags` nem `--all` (tags/branch antigas da Frimelo locais contêm histórico com senhas).

## Segurança (resumo)
- Sessão em cookie HttpOnly (`bemvindo_session`) + SameSite=Strict, proteção CSRF, logout que revoga o token.
- Troca de senha obrigatória no primeiro acesso; senhas temporárias aleatórias, nunca senha fixa.
- Só `backend/v1/index.php` é acessível — **nunca** criar endpoint como `.php` solto.
- Dados bancários/Pix visíveis só para ADMIN/RH. `.env` só na VPS (600), nunca no git nem na imagem.
