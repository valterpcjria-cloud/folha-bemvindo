# FOLHA FRIMELO — Sistema de Folha de Pagamento RH

Plataforma SaaS multi-empresa de lançamentos e cálculo da folha de pagamento (Frigorífico Frimelo, Edvam Melo).
Produção: `https://frimelo.meusistemanaweb.com.br` (Hostgator). Versão atual: **v4.58.1**.

## Stack
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS (`views/`, `components/`, `hooks/usePayrollData.ts`)
- **Backend:** PHP 8.3 puro + PDO, micro-router em `backend/v1/index.php` (rotas em `backend/v1/routes/`)
- **Banco:** MySQL/MariaDB (Hostgator). Migrations em `backend/migrations/` (rodadas manualmente no phpMyAdmin)

## Documentação (leia antes de alterar o sistema)
| Arquivo | Conteúdo |
|---------|----------|
| [SPEC.md](SPEC.md) | Especificação técnica completa: banco, API, regras de cálculo, segurança, lições aprendidas e **pendências (§20)** |
| [PRD.md](PRD.md) | Requisitos de produto, módulos e roadmap |
| [CHANGELOG.md](CHANGELOG.md) | Histórico detalhado por versão |
| [CLAUDE.md](CLAUDE.md) | Regras para agentes de IA: arquitetura, fluxo de release e regras recentes |

## Desenvolvimento
```bash
npm install
npm run dev                      # frontend em http://localhost:3000
php -S localhost:8000 -t backend/v1   # backend local (requer .env em backend/v1)
npx vite build                   # build de produção
```

## Release / Deploy
```bash
npm --no-git-tag-version version X.Y.Z
npx vite build
python3 create_zip.py --version X.Y.Z   # → deploy-frimelo-X.Y.Z.zip (dist/ + backend/, sem .env)
```
1. Rodar a migration da versão (se houver) no phpMyAdmin **antes** de subir o zip.
2. Subir e extrair o zip na raiz do domínio (cPanel) → Ctrl+F5 → testar.
3. Rollback: subir o zip da versão anterior.

Detalhes do fluxo completo (commits, tag, push e release no GitHub): `SPEC.md` §13 e `CLAUDE.md` §2.1.

## Segurança (resumo)
- Sessão em cookie HttpOnly + SameSite=Strict, proteção CSRF, logout que revoga o token.
- Troca de senha obrigatória quando aplicável; sem senha padrão fixa.
- Só `backend/v1/index.php` é acessível diretamente — **nunca** criar endpoint como arquivo `.php` solto.
- `.env` nunca vai para o git nem para o zip.
