# Arquitetura

Árvore completa e tabela de endpoints: `SPEC.md` §3 e §6.

## Frontend (React 18 + Vite + TS + Tailwind)
- `routes/AppRoutes.tsx` — rotas lazy; `ProtectedRoute` (perfil + redireciona para `/trocar-senha` se `must_change_password`). `/trocar-senha` fica fora do Layout.
- `components/Layout.tsx` — sidebar, seletor de empresa (ADMIN/SUPERADMIN), Alterar Senha, Encerrar Sessão; monta `UnsavedChangesDialog`. Navegação que desmonta o grid passa por `await confirmarDescarteAlteracoes()` (`utils/unsavedChanges.ts`). App usa `<BrowserRouter>` (sem `useBlocker`).
- `views/PayrollGridView.tsx` — grid de Lançamentos (arquivo grande: extraia sub-componentes em `views/payroll/` em vez de crescê-lo). Usa `hooks/usePayrollData.ts`, que concentra estado, cascata, save, atestados e `temAlteracoesNaoSalvas`.
- `services/mockApi.ts` — **toda chamada à API**: `fetchApi()` com `credentials:'include'` + `authHeaders()` (X-Requested-With, X-Company-Context, Authorization só legado). 401 com sessão local → `/login`. `salvarUsuarioSessao()` grava usuário sem token. Modo `CONFIG.IS_MOCK` = false em produção.
- `components/ConfirmModal.tsx` — modal padrão do sistema (variantes danger/warning/info, 3º botão opcional, isLoading, errorText). Use no lugar de `window.confirm`.
- `types.ts` — interfaces do domínio (mapear tudo que vem do backend).
- **Bem Vindo:** `views/SetoresView.tsx` + `components/setores/` (/setores); `components/employees/{CadastroBemVindoFields,PagamentoFields}.tsx` no modal de funcionário; matriz por setor em `views/payroll/{agruparPorSetor.ts,PayrollGroupedBody.tsx,PayrollPagination.tsx,FuncionarioCell.tsx}`; `hooks/useEmpresaAtual.ts` (cabeçalho do contracheque).
- Versão: `CONFIG.VERSION` injetada pelo Vite do `package.json` — nunca editar à mão.

## Backend (PHP 8.3 puro + PDO)
- `backend/v1/index.php` — `ob_start`, handler global de exceção (JSON), `config.php` (CORS + `$conn` global), `middleware/auth.php` (`requireAuth`), `middleware/security.php` (headers, RateLimiter), depois `Router` com `$router->add('rota', fn () use ($conn, $authUser) { require_once 'routes/x.php'; })`. Rota = 1º segmento da URL; `$route_parts[1]` = ação (ex.: `/dsr/dias_uteis`).
- **Bem Vindo:** `routes/setores.php`, `routes/cargos.php` (reescrita), `routes/empresa_atual.php`, `routes/atestados.php` (com dias). Infra: `docker/Dockerfile`, `docker-compose.yml`, `docker/scripts/criar_superadmin.php` (CLI), `docker/vps/` (backup).
- `routes/*.php` — um arquivo por recurso; padrão: `requireRole($authUser, [...])` (SUPERADMIN sempre passa), `$method = $_SERVER['REQUEST_METHOD']`, `getJsonInput()`, PDO preparado, `try/catch` → `http_response_code()` + `{error}`; `registrarLog($conn, user, entidade, id, ACAO, detalhes, empresa)` para auditoria.
- `services/` — `LancamentoService` (saveBulk/saveSingle, `calculateEventValue`, resolve salários/insalubridade/faltas/gratificação), `DsrService`, `FechamentoService`.
- `lib/` — `Router`, `JWT`, `AuthSession`, `Database` (PDO singleton), `Utils` (`getJsonInput`, `registrarLog`), `PayrollConstants`, PDFs (TCPDF).

## Multi-empresa
- Isolamento por `id_empresa` em toda query (`$authUser['id_empresa']`).
- ADMIN/SUPERADMIN trocam empresa via header `X-Company-Context` (seletor no topo). **Intencional**: a equipe operadora atende todas as empresas. Usuário de cliente = RH (preso à própria empresa).
- Sem empresa no token/contexto → 401 (sem fallback para empresa 1 desde v4.55.0).
- Tenant no Bem Vindo: 1 = Supermercado Bem Vindo (base Frimelo tinha 1 Frimelo, 2 Edvam Melo).

## Perfis
SUPERADMIN (tudo) · ADMIN (operação, todas as empresas) · RH (lançamentos/eventos/competências da própria empresa) · LEITURA · COLABORADOR (`/portal`).
