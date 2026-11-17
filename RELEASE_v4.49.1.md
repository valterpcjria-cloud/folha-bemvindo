# Release v4.49.1

## 🔒 Segurança & Autenticação
- **Migração para sessionStorage**: A persistência de sessão de usuário foi migrada de `localStorage` para `sessionStorage`. Isso garante que as sessões dos usuários sejam encerradas automaticamente ao fecharem o navegador ou a aba, aprimorando significativamente a segurança da aplicação.

## ✨ Melhorias & Correções
- Modificações no `mockApi.ts` para refletir o uso do `sessionStorage`.
- Atualizações em componentes essenciais como Relatórios, Gerenciamento de Holerites e Assistente IA para compatibilidade com o novo modelo de armazenamento.
- Correção e aprimoramento no modal DSR (`DsrModal.tsx`).
- Inclusão do novo `ManualView.tsx`

## 🛠 Alterações Técnicas
- **Versão:** 4.49.1
- **Gerenciamento de Estado:** Adaptação os hooks base (`usePayrollData.ts`) e rotas (`AppRoutes.tsx`) para o funcionamento estrito em memória da aba atual.
