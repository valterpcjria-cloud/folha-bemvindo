# CHANGELOG - Folha Bem Vindo

Fork da Folha Frimelo (base v4.58.1) para o Supermercado Bem Vindo. A numeração recomeça em 1.0.0.
O histórico da Frimelo continua abaixo, a partir de [4.58.1].

## [1.0.0] - 2026-11-18

### Adicionado
- **Docker na VPS** (Hostinger, junto do CRM sem interferir): aplicação em `127.0.0.1:8090`, MariaDB 11.4 próprio em rede interna, Caddy com `bemvindo.luzitec.cnt.br`. Banco inicial em `docker/banco/` (estrutura + empresa + parâmetros 2026). Usuário SUPERADMIN criado por linha de comando (`docker/scripts/criar_superadmin.php`) com senha temporária.
- **Setores e Cargos**: tela nova com os 8 setores da planilha, ordem dos blocos e hierarquia de cargos por setor (desativar em vez de excluir).
- **Cadastro do funcionário**: setor/cargo da hierarquia, vínculo, nascimento, sexo, escolaridade e pagamento (banco/Pix/loja, visível só ADMIN e RH).
- **Matriz de lançamentos por setor**: blocos na ordem dos setores, pessoas na ordem da hierarquia, subtotal por rubrica, total geral, recolher e filtrar setor; visão "Lista" mantida.
- Rota `GET empresa_atual` (dados da empresa para cabeçalhos).

### Alterado
- Marca Frimelo → **Folha Bem Vindo** (login, menu, título, contracheque, exportação, manual). Contracheque lê razão social/CNPJ/cidade do cadastro da empresa.
- Cookie de sessão `bemvindo_session`; CORS sem domínios da Frimelo.

### Segurança
- Rota de cargos exige ADMIN/RH e filtra por empresa (antes qualquer usuário criava/excluía, de qualquer empresa).
- Empresa nova: senha temporária aleatória (antes a fixa `frimelo123`). Setup do banco não cria mais `admin123`.

### Corrigido
- Imagem Docker sem as extensões `calendar`, `gd` e `bcmath` (DSR dias úteis dava 500).
- Consulta de feriados repetia o parâmetro `:uf` (HY093 com prepares nativos) — a tela caía no cálculo reserva.
- PDF do contracheque saía "- -GO" (lia `cidade` em vez de `nome_cidade`).
- Nome do cargo único no banco inteiro → único por empresa + setor.

### Banco de Dados
- `docker/banco/10_bv_setores_cargos_cadastro.sql` (idempotente; num banco novo roda sozinho).

---


## [4.58.1] - 2026-10-01

### Corrigido
- **Contracheque no grid de Lançamentos**: botão "Imprimir / PDF" da pré-visualização não fazia nada (o `PaystubView` era aberto sem `onPrint` desde a v4.38.29). Agora gera o PDF oficial do servidor (mesmo da tela Contracheques) apenas do funcionário exibido. Com alterações não salvas, avisa para salvar antes (o PDF usa valores salvos).

### Banco de Dados
- Nenhuma migration.

---

## [4.58.0] - 2026-10-01

### Segurança
- **A3 — Sessão em cookie HttpOnly**: login e troca de senha gravam o token no cookie `frimelo_session` (HttpOnly, Secure em HTTPS, SameSite=Strict, path da API, cookie de sessão). O frontend **não armazena mais o token** (`sessionStorage` guarda só nome/perfil) — script malicioso não consegue roubá-lo.
- **Proteção CSRF**: com sessão via cookie, `POST/PUT/PATCH/DELETE` exigem o header `X-Requested-With: XMLHttpRequest` (403 `REQUISICAO_BLOQUEADA`), somado ao SameSite=Strict.
- **Transição**: o servidor aceita header `Authorization` válido (telas antigas em cache / sessões abertas antes do deploy) ou o cookie; o login ainda devolve o token no corpo. Remover numa versão futura.
- Logout apaga o cookie (além de revogar o token).

### Alterado
- `authHeaders()` (mockApi) centraliza cabeçalhos de toda chamada direta à API; removido `Bearer` manual de DeepCleanup, SuperAdmin, Fórmulas, Relatórios e PDFs.
- Resposta 401 com sessão local → limpa a sessão e volta ao login.
- **Usuários**: alterar a **própria** senha na tela de Usuários não força nova troca no próximo acesso (só senha definida para outra pessoa).
- Tela de troca obrigatória: texto neutro ("defina uma nova senha"), sem mencionar "senha temporária".

### Corrigido
- **Fórmulas**: lia o token de `sessionStorage('token')` (chave inexistente) — carga de eventos ia sem autenticação.

### Banco de Dados
- Nenhuma migration.

---

## [4.57.1] - 2026-10-01 — HOTFIX DE SEGURANÇA

### Segurança (crítico)
- **Scripts de manutenção acessíveis sem login**: ~30 arquivos `.php` soltos em `backend/v1/` (ex: `create_saas_admin.php`, que redefinia a senha do SUPERADMIN e a exibia na tela; `pwd_reset.php`, `fix_password.php`, `setup_db.php`, `repair_schema.php`, `fix_saas_db.php`, `fix_holidays.php`) eram executáveis diretamente pela URL — o `.htaccess` só encaminhava ao `index.php` (autenticado) arquivos inexistentes. Agora `backend/v1/.htaccess` permite acesso direto **apenas ao `index.php`**; demais `.php` retornam 403 (continuam funcionando via `include`, ex: rotas `setup`/`fix_password`).
- `.htaccess` da raiz bloqueia por nome ferramentas antigas que versões anteriores copiavam para a raiz do site (`repair_schema`, `probe_paths`, `fix_indices`, `fix_holidays`, `test_db`).

### Alterado
- **Feriados**: removidos os botões "Sincronizar" e "Sincronizar Feriados Originais" (abriam `fix_holidays.php` sem autenticação, que apagava e recriava os feriados nacionais — desfazendo o liga/desliga do DSR).
- **`create_zip.py`**: não copia mais ferramentas PHP para a raiz do site e deixa de duplicar arquivos dentro do zip.

### Banco de Dados
- Nenhuma migration.

---

## [4.57.0] - 2026-10-01

### Segurança
- **A2 — Logout invalida o token na hora**: todo JWT emitido passa a ter `jti` único. `POST /logout` grava o `jti` em `jwt_blacklist` e `requireAuth()` rejeita tokens revogados (401 `SESSAO_ENCERRADA`). O frontend chama o logout no servidor em "Encerrar Sessão" e na saída por inatividade. Registros vencidos são limpos automaticamente. Consulta à blacklist é fail-open (loga erro) se a tabela não existir.
- **C5 — Troca de senha obrigatória**: coluna `usuarios.must_change_password`. Token com claim `pwd_change` só acessa `change_password` e `logout` (403 `TROCA_SENHA_OBRIGATORIA` nas demais rotas). A troca é forçada quando: usuário novo; senha redefinida pelo superadmin; login com a senha padrão legada `123456`; admin criado junto com empresa nova (`frimelo123`).
- **Fim da senha padrão `123456`**: usuário criado sem senha recebe senha temporária aleatória (10 caracteres, sem ambíguos), exibida uma única vez ao superadmin (`SenhaTemporariaModal`, botão Copiar).
- **Regra de senha**: mínimo 8 caracteres, letras e números, diferente da atual e da padrão.

### Adicionado
- `backend/v1/lib/AuthSession.php` (emissão/revogação de token, regras de senha), rotas `logout.php` e `change_password.php`.
- `views/ChangePasswordView.tsx` em `/trocar-senha` (fora do Layout): modo obrigatório (bloqueia o sistema via `ProtectedRoute`) e voluntário (botão **Alterar Senha** no menu lateral). Checklist visual das regras.
- `api.changePassword()`; `User.must_change_password`.

### Banco de Dados
- Migration `v4.57.0_jwt_blacklist_troca_senha.sql` (rodar ANTES do zip): tabela `jwt_blacklist` + coluna `usuarios.must_change_password`. Idempotente.

---

## [4.56.0] - 2026-10-01

### Alterado
- **Modal "Alterações não salvas"** no padrão visual do sistema (substitui o `window.confirm` nativo): botões **Salvar e continuar**, **Sair sem salvar** e **Continuar editando**; informa a competência (ex: 09/2026). Em caso de erro ao salvar, exibe a mensagem e mantém o usuário na tela. F5/fechar aba seguem com o aviso nativo do navegador.
- **ConfirmModal**: 3º botão opcional (`extraText`/`onExtra`), estado `isLoading`, `errorText` e camada `z-[100]` (fica acima do menu lateral). Telas existentes inalteradas.
- **`utils/unsavedChanges.ts`**: fluxo assíncrono (`confirmarDescarteAlteracoes(): Promise<boolean>`), `registrarDialogo`/`registrarSalvamento`. Novo `components/UnsavedChangesDialog.tsx` montado no Layout.

### Corrigido
- **Modal de DSR** (`DsrModal.tsx`): lia o token de `sessionStorage('token')`, chave inexistente → requisições sem autenticação (401) e detalhe vazio sem erro. Agora usa `api.getDsrCompetencia`, `api.registrarFaltaDsr` e `api.recalcularDsrIndividual` (token + empresa selecionada). "Recalcular" passa a recarregar o valor exibido.

### Banco de Dados
- Nenhuma migration.

---

## [4.55.0] - 2026-10-01

### Adicionado
- **Aviso de alterações não salvas (Lançamentos)**: ao editar o grid e tentar trocar de competência, clicar no menu lateral, trocar de empresa ou encerrar sessão, o sistema pede confirmação. Atualizar/fechar a aba dispara o aviso nativo do navegador (`beforeunload`). Só marca pendência quando um valor muda de fato e apenas em competência ABERTA.
- **Indicador visual**: botão "Salvar Alterações" ganha contorno âmbar pulsante + selo "Alterações não salvas" enquanto houver pendência.
- **`utils/unsavedChanges.ts`**: registro global de pendências (o app usa `BrowserRouter`, sem `useBlocker`).

### Segurança
- **C4 — fim do fallback `id_empresa=1`** (`auth.php`): ADMIN/SUPERADMIN sem `X-Company-Context` e sem empresa no token agora é rejeitado (401) em vez de cair silenciosamente na empresa 1. Pré-checado em produção: 0 usuários ativos sem empresa.
- **A1 — Rate limit do login fail-closed** (`security.php`, `login.php`): cache em `sys_logs/rate_limit/` com fallback para o temp do sistema; se nenhum for gravável, login responde 503 em vez de ficar sem limite. Demais rotas seguem fail-open.
- **IP à prova de spoofing** (`RateLimiter::getClientIP`): `CF-Connecting-IP` só é aceito quando a conexão vem das faixas oficiais do Cloudflare; caso contrário usa `REMOTE_ADDR`. `X-Forwarded-For`/`X-Real-IP` deixaram de ser confiados (permitiam burlar o limite de 5 tentativas/min).

### Banco de Dados
- Nenhuma migration.

---

## [4.54.1] - 2026-09-30

### Alterado
- **HE 100% (49) — Gratificação na base**: A Gratificação (rubrica 88) passa a compor a base de cálculo das Horas Extras 100%. Nova fórmula: `(Salário 33 + Gratificação 88 + Insalubridade 62) / 220 × 2 × horas`. DSR s/ HE (59), INSS, IRRF e FGTS acompanham via cascata.
- **usePayrollData.ts**: novo helper `calcBaseHE()` centraliza a base da HE nos 4 pontos de cálculo (carga, edição da quantidade, cascata Faltas→Insalub→HE e cascata Insalub→HE).
- **LancamentoService.php**: `calculateEventValue()` soma `$gratificacao` à base da HE (saveBulk e saveSingle).

### Corrigido
- **Competência FECHADA exibe snapshot salvo**: `recalcularCascataCompleta()` recebe `competenciaAberta`; em competência fechada só as rubricas virtuais (DSR 59 e FGTS Visual 1900) são calculadas — HE, INSS, IRRF e demais mostram exatamente o valor pago.

### Banco de Dados
- Nenhuma migration. Usa `funcionarios.gratificacao` (v4.53.10).

---

## [4.54.0] - 2026-07-03

### Adicionado
- **Perda de Assiduidade (833)**: O funcionário perde a assiduidade (valor zerado) na competência aberta quando há Faltas (rubrica 71) preenchidas **OU** atestado informado.
- **Atestado por Competência**: Checkbox "Atestado" por funcionário no grid de Lançamentos (apenas competência aberta). Ao marcar, a Assiduidade zera e recalcula INSS/IRRF/FGTS em tempo real.
- **Tabela isolada `competencia_atestados`**: Migration `v4.54.0_add_competencia_atestados.sql`. Armazenamento fora de `lancamentos_eventos` — **não afeta exportação/importação**.
- **Rota `atestados.php`**: `GET /atestados?competencia_id=X` (lista ids) e `POST /atestados` (liga/desliga). Registrada em `index.php`.
- **Ocultar Funcionário Desligado**: Funcionário com status `DESLIGADO` some de Lançamentos e Relatórios em competências **ABERTAS**. Competências **FECHADAS** preservam o histórico (snapshot legal da folha já paga).

### Alterado
- **usePayrollData.ts**: `recalcularAssiduidadeTodos()` agora recebe `atestados: Set<number>` e aplica a regra de perda; cascata Faltas→Assiduidade em `updateLancamento`; novo helper `recalcularCascataCompleta()` centraliza a cadeia antes duplicada em init/handleCompChange/handleSave; `filtrarVisiveis()` oculta DESLIGADO em competência aberta (grid + totais).
- **PayrollTableRow.tsx**: Checkbox de Atestado adicionado à célula de informação do funcionário.
- **ReportsView.tsx**: Dropdown de colaborador oculta funcionários DESLIGADOS (histórico preservado via lançamentos salvos).
- **mockApi.ts**: Métodos `getAtestados` e `setAtestado`.

---

## [4.53.11] - 2026-07-03

### Adicionado
- **Switcher de Feriado no DSR**: Superadmin pode ligar/desligar um feriado em Gestão de Feriados. Feriado desligado (`ativo=0`) sai do cálculo do DSR (o dia vira dia útil). Religar reverte.

### Alterado
- **Feriados móveis** (Carnaval, Sexta-feira Santa, Corpus Christi, Páscoa) agora respeitam o toggle — corrigido nos dois caminhos de cálculo: backend `DsrService::getDatasFeriadosDesligados()` e fallback frontend `calcDiasComFeriados()`.
- **GET /feriados**: passa a listar feriados inativos também, permitindo religar.
- **HolidaysView.tsx**: switcher DSR On/Off por card, update otimista, card desligado com dim + badge "Desligado". Guard: feriado nacional só Superadmin alterna.

### Corrigido
- Badge "0" fantasma em cards de feriados não-recorrentes.

---

## [4.53.10] - 2026-06-15

### Adicionado
- **Campo Gratificação (88) no Cadastro**: Nova rubrica de valor fixo adicionada ao formulário de cadastro/edição de funcionários.
- **Auto-preenchimento em Lançamentos**: Rubrica 88 agora é preenchida automaticamente em lançamentos de competências abertas, com valor proveniente do cadastro do funcionário.
- **Coluna Read-only em Lançamentos**: Rubrica 88 é travada no grid de folha de pagamento (junto com 62, 833, 1000, 936, 4004), permitindo edição apenas via cadastro do funcionário.
- **Migration de Compatibilidade**: Script `v4.53.10_add_gratificacao_funcionarios.sql` popula valores existentes de lançamentos históricos para estabelecer valores nativos.

### Alterado
- **PayrollTableRow.tsx**: Adicionado código 88 à lista de rúbricas travadas (`isCadastroLocked`).
- **EmployeesView.tsx**: Campo de Gratificação adicionado à seção "Rúbricas do Cadastro" com máscara BRL.
- **usePayrollData.ts**: Rubrica 88 integrada à função `aplicarRubricasCadastroFuncionarios()` para sincronização automática.

### Técnico
- **Tipo de rubrica**: Valor fixo em R$ (como Mensalidade Sindical e Empréstimo Consignado)
- **Ordem de aplicação**: Aplicada após carregamento do cadastro, antes de cascata de cálculos (INSS, IRRF, DSR)
- **Persistência**: Valores salvos apenas em competências abertas; competências fechadas preservam snapshot histórico

---

## [4.48.10] - 2026-03-29

### Adicionado
- **Exclusão de Competência**: Novo botão para excluir competências com status `ABERTA`. Ação protegida por justificativa obrigatória e exclusão em cascata de lançamentos.
- **Reabertura de Competência**: Novo fluxo para reabrir competências `FECHADAS`, permitindo novos lançamentos após justificativa.
- **Justificativa de Status**: Campo `justificativa_status` na tabela `competencias` para auditoria de alterações críticas de ciclo.
- **Modal de Justificativa**: Interface de usuário para coleta obrigatória de motivos antes de exclusão ou reabertura.

### Alterado
- **API de Competências**: Endpoints atualizados para suportar `DELETE` e `POST /reopen` com validação de justificativa e logs de auditoria.


## [4.41.3] - 2026-03-26

### Adicionado
- **Lançamento Automático do DSR**: `DsrService::calcularDSR()` agora persiste o evento DSR (código 9999) em `lancamentos_eventos` via `lancarEventoDSR()`.
- **Pipeline Real de Fechamento**: `FechamentoService` implementa os 10 passos de cálculo por funcionário (Salário Base → Eventos Variáveis → Base DSR → DSR → INSS → FGTS → IRRF → Líquido → Persistência).
- **Integração DSR no Fechamento Expresso**: `PROCESS_BATCH` substituído: valores de `RAND()` removidos, cálculo real chamado para cada funcionário do lote.

### Alterado
- `PayrollConstants::EVENT_CODES` — adicionado código `DSR = 9999`.
- `setup_db.php` — evento DSR (ID 20) incluído no seed de eventos obrigatórios.
- `DsrService::calcularDSR()` — novo parâmetro `$empresaId` (default 1).
- `routes/dsr.php` — repassa `id_empresa` do token JWT para `calcularDSR()`.

## [4.41.2] - 2026-03-26

### Corrigido
- **Exportação Prêmio Assiduidade e Insalubridade**: Eventos com unidade **PERCENTUAL** agora exportam a **porcentagem informada** (ex: 5%) e não o valor monetário calculado.

## [4.41.1] - 2026-03-26

### Corrigido
- **Exportação Horas Extras 100%**: Na exportação (XLSX, CSV e TXT), rubricas com unidade **HORA** agora exportam a **quantidade de horas** informadas, e não o valor monetário a pagar.

## [4.41.0] - 2026-03-25

### Adicionado
- **Relatório de Relação de Cálculo**: Novo módulo para visualização agrupada de proventos e descontos por funcionário.
- **Componente de Impressão**: Suporte para impressão formatada e geração de PDF do relatório de cálculo.
- **Integração com API**: Consumo de dados reais do endpoint `/get_folhapagamento.php` para o relatório.

### Alterado
- **Versão do Sistema**: Sincronização global para a versão `4.41.0`.
- **Navegação**: Adicionado link para "Relação de Cálculo" no menu lateral.
- **PaystubsManagementView**: Melhorias na interface de gestão de contracheques.

### Corrigido
- **Cálculos de Totais**: Ajuste na lógica de somatório de Base INSS e Base FGTS exibidos na tela.

### Removido
- **Assistente IA**: Ocultação temporária do chat assistente (`AIChatAssistant`) para otimização da interface de usuário.
