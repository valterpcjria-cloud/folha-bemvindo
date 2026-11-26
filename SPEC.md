# SPEC.md — Sistema FOLHA BEM VINDO (fork da Folha Frimelo)
## Spec-Driven Development — Documento de Especificação Completa

> **Versão do Documento:** v1.2.0 | **Data:** 2026-11-26
> **Propósito:** Registro permanente do estado arquitetural, regras de negócio, fluxos, banco de dados e decisões técnicas do sistema. Nenhuma IA ou desenvolvedor deve modificar este sistema sem antes ler e compreender este SPEC.
> **Como ler:** a §0 descreve o que é próprio do Bem Vindo. As §1–§20 descrevem a base herdada da Frimelo (v4.58.1), que continua valendo para o código salvo onde a §0 diz o contrário (infraestrutura, deploy, nomes de domínio e empresas da Frimelo são só histórico).

---

## 0. FOLHA BEM VINDO — O QUE É PRÓPRIO DESTE SISTEMA

### 0.1 Identidade
**Nome:** Folha Bem Vindo · **Cliente:** Supermercado Bem Vindo (CNPJ 41.403.240/0001-14, Luziânia-GO, ~70 colaboradores)
**Origem:** fork da Folha Frimelo v4.58.1 em 2026-11-17 (histórico do git recomeçado; numeração recomeça em 1.0.0)
**Versão atual:** 1.2.0 · **Repositório:** `valterpcjria-cloud/folha-bemvindo` (privado)
**Premissa:** a contabilidade (mesmo escritório da Frimelo) é a fonte oficial dos cálculos; o sistema faz a prévia e organiza os lançamentos por setor.

### 0.2 Infraestrutura (substitui §2.3 e §13)
| Item | Bem Vindo |
|------|-----------|
| Servidor | VPS Hostinger da Luzitec (`ssh luzitec-vps`), compartilhada com o CRM da Luzitec em produção |
| Execução | Docker Compose em `/opt/bemvindo` (projeto `bemvindo`): `bemvindo-app` (php:8.3-apache, `127.0.0.1:8090`, 512 MB) + `bemvindo-db` (MariaDB 11.4, sem porta, 512 MB) |
| Imagem | `folha-bemvindo:${IMAGEM_TAG}`; build local (`docker/Dockerfile`, Node 22 → php:8.3-apache com `calendar gd bcmath pdo_mysql`) levado por `docker save \| ssh docker load` (a VPS não tem o código) |
| Segredos | `/opt/bemvindo/.env` (600), gerados na VPS; nunca no git/imagem |
| HTTPS | Caddy compartilhado (`luzitec-proxy`, `/opt/luzitec/proxy/Caddyfile`): bloco `bemvindo.luzitec.cnt.br` → `127.0.0.1:8090`, antes do catch-all |
| Acesso (plano B, sem o domínio) | `ssh -N -L 8090:127.0.0.1:8090 luzitec-vps` → http://localhost:8090 |
| Banco inicial | `docker/banco/01_estrutura_e_config.sql` (estrutura da Frimelo sem dados pessoais), `02_empresa_principal.sql` (empresa + parâmetros 2026), `10_…`, `11_…`, `12_…` (migrations do Bem Vindo) |
| Backup | `bemvindo-backup.timer` 02:30 → `/opt/bemvindo/backup/fazer-backup.sh`: dump conferido + config; 14 dias na VPS, 30 dias no Google Drive criptografado (`luzitec-backup-cripto:bemvindo/`). Restauração testada. Fonte e instruções: `docker/vps/` |
| Deploy | `CLAUDE.md` §2.1 (backup → imagem → migrations → `IMAGEM_TAG` → `up -d --no-build` → conferir app e CRM). `create_zip.py` não é usado |
| Rollback | `IMAGEM_TAG` anterior. Atenção: cron do CRM apaga imagens sem uso há 24h na VPS → reenviar a anterior do PC |

### 0.3 Banco de dados — acréscimos do Bem Vindo
| Migration | Conteúdo |
|-----------|----------|
| `10_bv_setores_cargos_cadastro.sql` (v1.0.0) | Tabela `setores` (id_empresa, nome, ordem, ativo; 8 setores); `cargos` + `id_empresa`, `id_setor`, `ordem_hierarquia` (unique empresa+setor+nome); `funcionarios` + `id_setor`, `id_cargo`, `data_nascimento`, `sexo` (F/M/O), `escolaridade`, `modalidade_pagamento` (BANCO/PIX/LOJA), `banco`, `agencia`, `conta`, `tipo_conta`, `chave_pix` |
| `11_bv_atestado_dias.sql` (v1.1.0) | `competencia_atestados.dias` TINYINT NULL |
| `12_bv_padrao_insalubridade_zero.sql` (v1.1.0) | DEFAULT de `funcionarios.insalubridade_perc` e `assiduidade_perc` = 0.00 |
| `13_bv_rubricas_v120.sql` (v1.2.0) | `funcionarios` + `gratificacao_funcao_perc`, `vt_desconto_perc`, `vt_custo_mensal`; `eventos_folha` + 82, 37, 23, 816; 88 `ativo = 0`; `dsr_he_config_eventos` + 37 |

Todas idempotentes e aditivas. PDO com `EMULATE_PREPARES=false`: parâmetro nomeado não pode se repetir na mesma query (HY093).

### 0.4 API — acréscimos e mudanças
| Rota | Método | Perfil | Descrição |
|------|--------|--------|-----------|
| `setores` | GET / POST / PUT `{id}` / POST `reordenar` | leitura: todos; escrita: ADMIN/RH | Setores da empresa (sem DELETE: desativar) |
| `cargos` | GET / POST / PUT / DELETE | escrita: ADMIN/RH | Reescrita: filtra por empresa, hierarquia por setor; renomear atualiza `funcionarios.cargo` |
| `funcionarios` | GET / POST / PUT | — | + campos do Bem Vindo (gravados só se presentes); pagamento só ADMIN/RH/SUPERADMIN; padrão de insalubridade/assiduidade 0; v1.2.0: `gratificacao_funcao_perc` (0–100), `vt_desconto_perc` (0–6), `vt_custo_mensal` (≥ 0) → 400 fora da faixa |
| `empresa_atual` | GET | autenticado | Razão social, CNPJ, cidade/UF da empresa do usuário (cabeçalho do contracheque) |
| `atestados` | GET | ADMIN/RH | `{data:[funcionario_id], dias:{funcionario_id: dias\|null}}` |
| `atestados` | POST | ADMIN/RH | `{funcionario_id, competencia_id, tem_atestado, dias?}`; `dias` 1..31 (ausente = mantém; vazio/0 = NULL); 404 se não for da empresa; 409 se competência FECHADA |
| `companies` | POST | SUPERADMIN | Empresa nova cria admin com **senha temporária** devolvida em `senha_temporaria` (antes `frimelo123`); parâmetros 2026 (TETO_INSS 8475.55, FAIXA_ISENCAO_IRRF 2428.80) |

### 0.5 Telas e regras do Bem Vindo
- **Setores e Cargos** (`/setores`): ordem dos setores = ordem dos blocos na matriz; hierarquia de cargos por setor (1 = topo).
- **Cadastro do funcionário**: setor, cargo da hierarquia (select), vínculo, nascimento, sexo, escolaridade, pagamento. `departamento` segue sendo o código da exportação contábil (não é setor).
- **Matriz de lançamentos**: visão "Por setor" (padrão) ou "Lista"; blocos por setor, pessoas por `cargo_ordem`, subtotal por rubrica, total geral, recolher/filtrar setor.
- **Etiquetas na linha** (v1.1.0, só informação): nível (escolaridade), aniversariante no mês da competência, admissão no mês com dias do proporcional (cálculo já existente da §7, v4.52.10).
- **Atestado em dias** (v1.1.0): informativo para a contabilidade; a perda de Assiduidade continua dependendo só da existência do atestado.
- **Padrões**: funcionário novo com insalubridade 0% e assiduidade 0% (Frimelo 20%/11%).
- **Marca**: "Folha Bem Vindo"; cookie `bemvindo_session`; contracheque com dados da empresa via `empresa_atual`; PDFs leem `nome_cidade`.

### 0.6 Regras de cálculo do Bem Vindo (v1.2.0, respostas P1–P30 de 25/11/2026)
**Códigos = os do Questor.** Rubrica que já existia na Frimelo mantém o código (INSS 35, IRRF 1920, FGTS 1900...); rubrica só do Bem Vindo usa o código da lista deles.

| Cód | Rubrica | Unidade | Fórmula |
|---|---|---|---|
| 82 | Gratificação de função | % (cadastro, travada) | salário (33) × % ÷ 100. Substitui a 88 (desativada) |
| 37 | HE 60% | HORA | (33 + 82 + 62) ÷ 220 × 1,6 × horas; entra no DSR 59 |
| 49 | HE 100% | HORA | (33 + 82 + 62) ÷ 220 × 2 × horas |
| 23 | Horas faltas | HORA, desconto | 33 ÷ 220 × horas; não desconta DSR; reduz bases INSS/IRRF/FGTS |
| 816 | Desconto VT | % (cadastro, travada) | (33 − 71 − 23) × % ÷ 100, % ≤ 6, teto = `vt_custo_mensal` (0 = sem teto); não mexe nas bases |
| — | Estagiário (`tipo_contrato = ESTAGIO`) | — | INSS 0 e FGTS 0; IRRF normal |

Faltas 71 + 23 reduzem as bases de INSS, IRRF **e FGTS**. Cálculo na tela: `hooks/payrollBemVindo.ts` + `recalcularCascataCompleta()`; ao salvar: `LancamentoService::calculateEventValue` (82, 37, 23). Sem adicional noturno (P16: a empresa não tem).

**Ainda pendente (2ª rodada de perguntas, 26/11/2026):** verbas da base da HE e divisor (E6), insalubridade por função/grau/base (E7), DSR em faltas/suspensão/afastamentos (E8), códigos de DSR por falta, salário-família, atestado, suspensão, convênio, 13º/férias/rescisão (E1), auxílios (E3–E4), bônus aniversário (E2), CCT (E5), encargos do Simples e provisões (E10–E11), data de corte, matrículas, retorno e 13º/férias (E12–E15); ao Bem Vindo: B1–B12. **Não implementar essas regras por suposição.**

---

## 1. VISÃO GERAL DO SISTEMA

**Nome:** FOLHA FRIMELO — Sistema de Folha de Pagamento RH
**Domínio:** `frimelo.meusistema.com.br`
**Modelo:** SaaS Multi-Tenant
**Empresas Cadastradas:** Frigorífico Frimelo Ltda (id=1), Edvam Melo (id=2)
**Stack:** React 18 + Vite 6 + TypeScript / PHP 8 Puro + PDO / MySQL (Hostgator)
**Versão Atual:** 4.58.1

---

## 2. STACK TECNOLÓGICA

### 2.1 Frontend
| Item | Tecnologia |
|------|-----------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 6 |
| Roteamento | React Router DOM v6 (lazy loading) |
| Estilização | TailwindCSS (design Premium SaaS + Glassmorphism leve) |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Exportação | ExcelJS (XLSX), nativo (CSV/TXT) |
| PDF | html2canvas + jsPDF (contracheques), TCPDF (backend) |
| Estado Global | Context API (AuthContext) |
| Hook Principal | `hooks/usePayrollData.ts` |

### 2.2 Backend
| Item | Tecnologia |
|------|-----------|
| Linguagem | PHP 8+ Puro (sem framework) |
| Banco de Dados | MySQL / MariaDB (Hostgator Shared) |
| ORM | PDO puro (sem ORM) |
| Roteamento | Micro-router customizado (`lib/Router.php`) |
| Autenticação | JWT customizado (`lib/JWT.php`) |
| PDF | TCPDF (biblioteca local em `lib/tcpdf/`) |
| Deploy | Upload manual de ZIP no Hostgator |

### 2.3 Infraestrutura
- **Hosting:** Hostgator (Shared Hosting)
- **Domínio:** `frimelo.meusistema.com.br`
- **API Base URL:** `/backend/v1`
- **Frontend:** SPA servida de `dist/` via `.htaccess`
- **Banco:** MySQL compartilhado (Hostgator cPanel)
- **CI/CD:** Manual — `python3 create_zip.py --version X.Y.Z` → upload via cPanel

---

## 3. ESTRUTURA DE ARQUIVOS

```
FOLHA FRIMELO/
├── App.tsx                          # Raiz React, providers
├── index.tsx                        # Entry point
├── config.ts                        # CONFIG: IS_MOCK, API_BASE_URL, VERSION
├── types.ts                         # Interfaces TypeScript do domínio
├── constants.tsx                    # MANDATORY_EVENTS (eventos obrigatórios locais)
├── constants/
│   ├── payroll.ts                   # EVENT_CODES, MONTHLY_WORKING_HOURS, SALARIO_MINIMO
│   └── theme.ts                     # THEME tokens (cores, animações, strings)
├── contexts/
│   └── AuthContext.tsx              # Auth state, selectedCompanyId, setCompanyContext
├── hooks/
│   └── usePayrollData.ts            # Hook principal da folha (estado, cálculos, save)
├── services/
│   ├── mockApi.ts                   # Camada de API (modo mock + real)
│   └── aiService.ts                 # Integração OpenAI para análises
├── routes/
│   └── AppRoutes.tsx                # Definição de rotas (lazy, proteção por perfil)
├── components/
│   ├── Layout.tsx                   # Sidebar + Header + seletor de empresa
│   ├── ProtectedRoute.tsx           # Guard de rota por perfil
│   ├── ConfirmModal.tsx             # Modal de confirmação reutilizável (3º botão opcional, v4.56.0)
│   ├── UnsavedChangesDialog.tsx     # Diálogo global "Alterações não salvas" (v4.56.0, montado no Layout)
│   ├── SenhaTemporariaModal.tsx     # Exibe 1x a senha temporária de usuário novo (v4.57.0)
│   ├── ModalEspelhoFolha.tsx        # Modal de espelho da folha
│   ├── PrintBatchView.tsx           # Impressão em lote de contracheques
│   ├── NotificationCenter.tsx       # Notificações globais
│   ├── AIChatAssistant.tsx          # Chat AI flutuante (OpenAI)
│   └── ErrorBoundary.tsx            # Captura de erros React
├── views/
│   ├── DashboardView.tsx            # KPIs e gráficos
│   ├── EmployeesView.tsx            # CRUD de funcionários
│   ├── EventsView.tsx               # CRUD de eventos de folha
│   ├── CompetenceView.tsx           # Gestão de competências (mês/ano)
│   ├── PayrollGridView.tsx          # Grid principal de lançamentos
│   ├── payroll/
│   │   ├── PayrollHeader.tsx        # Cabeçalho do grid
│   │   ├── PayrollControls.tsx      # Controles (salvar, importar)
│   │   ├── PayrollTableRow.tsx      # Linha do grid por funcionário
│   │   └── DsrModal.tsx             # Modal de detalhes DSR
│   ├── ExportView.tsx               # Exportação XLSX/CSV/TXT
│   ├── ImportView.tsx               # Importação de planilhas
│   ├── ExpressClosingView.tsx       # Fechamento expresso da folha
│   ├── ReportsView.tsx              # Relatórios e gráficos avançados
│   ├── PaystubsManagementView.tsx   # Gestão de contracheques
│   ├── HolidaysView.tsx             # Cadastro de feriados
│   ├── ManualView.tsx               # Manual do sistema
│   ├── AuditLogsView.tsx            # Logs de auditoria (SUPERADMIN)
│   ├── UsersView.tsx                # CRUD de usuários (SUPERADMIN)
│   ├── SettingsView.tsx             # Parâmetros do sistema (SUPERADMIN)
│   ├── SuperAdminView.tsx           # Gestão SaaS: empresas (SUPERADMIN)
│   ├── DeepCleanupView.tsx          # Limpeza crítica de dados (SUPERADMIN)
│   ├── FormulasView.tsx             # Editor de fórmulas (SUPERADMIN)
│   ├── LoginView.tsx                # Tela de login
│   ├── ChangePasswordView.tsx       # /trocar-senha — troca obrigatória ou voluntária (v4.57.0)
│   ├── LandingPageView.tsx          # Landing page pública
│   └── EmployeePortalView.tsx       # Portal do colaborador (perfil COLABORADOR)
├── utils/
│   ├── taxCalculations.ts           # Cálculo de INSS, IRRF, FGTS
│   ├── timeHM.ts                    # Conversão HH:MM ↔ horas decimais (rubricas HORA)
│   ├── unsavedChanges.ts            # Registro global de alterações não salvas (v4.55.0/v4.56.0)
│   ├── exportHelpers.ts             # Helpers de exportação
│   └── dataHelpers.ts               # Helpers de dados
├── public/
│   └── .htaccess                    # SPA routing + cache headers + bloqueio de PHP antigo na raiz (v4.57.1)
├── backend/
│   ├── database_setup.sql           # Schema inicial do banco
│   └── migrations/                  # Migrations versionadas (.sql)
└── backend/v1/
    ├── .htaccess                    # Rewrite p/ index.php + SÓ index.php acessível direto (v4.57.1)
    ├── index.php                    # Entry point do backend (Router dispatch)
    ├── config.php                   # CORS, conexão DB, headers
    ├── middleware/
    │   ├── auth.php                 # JWT validation, requireAuth(), requireRole()
    │   └── security.php             # Security headers, RateLimiter, InputSanitizer
    ├── lib/
    │   ├── Router.php               # Micro-router customizado
    │   ├── JWT.php                  # JWT encode/decode/validate (cookie frimelo_session ou header, v4.58.0)
    │   ├── AuthSession.php          # Emissão c/ jti, revogação, cookie HttpOnly, regras de senha (v4.57.0/v4.58.0)
    │   ├── Database.php             # PDO factory (singleton)
    │   ├── Utils.php                # registrarLog(), getJsonInput()
    │   ├── PayrollConstants.php     # Espelho das constantes do frontend
    │   ├── MigrationSystem.php      # Runner de migrations
    │   ├── ContrachequePDF.php      # Gerador de PDF contracheque
    │   ├── EspelhoFolhaPDF.php      # Gerador de PDF espelho da folha
    │   └── tcpdf/                   # Biblioteca TCPDF local
    ├── middleware/
    ├── routes/                      # Um arquivo PHP por recurso
    │   ├── login.php                # Grava cookie de sessão; força troca se must_change_password/123456
    │   ├── logout.php               # Revoga jti + apaga cookie (v4.57.0/v4.58.0)
    │   ├── change_password.php      # Troca de senha → token/cookie novos (v4.57.0)
    │   ├── atestados.php            # Atestado por competência (v4.54.0)
    │   ├── funcionarios.php
    │   ├── eventos.php
    │   ├── competencias.php
    │   ├── lancamentos.php          # GET + POST (saveSingle/saveBulk)
    │   ├── users.php
    │   ├── companies.php            # Multi-tenant: CRUD empresas
    │   ├── dsr.php
    │   ├── feriados.php
    │   ├── aliquotas.php
    │   ├── parametros.php
    │   ├── reports.php
    │   ├── pdf_contracheque.php
    │   ├── pdf_relatorio.php
    │   ├── fechamento_expresso.php
    │   ├── logs.php
    │   └── stats.php
    └── services/
        ├── LancamentoService.php    # Core da folha: saveBulk, calculateEventValue
        ├── DsrService.php           # Cálculo DSR avançado
        └── FechamentoService.php    # Fechamento de competência
```

---

## 4. BANCO DE DADOS

### 4.1 Diagrama de Entidades

```
empresas (1) ──< funcionarios
empresas (1) ──< competencias
empresas (1) ──< usuarios
empresas (1) ──< lancamentos_eventos
empresas (1) ──< logs_auditoria
empresas (1) ──< parametros_sistema

funcionarios (1) ──< lancamentos_eventos
competencias (1) ──< lancamentos_eventos
eventos_folha (1) ──< lancamentos_eventos
```

### 4.2 Tabelas Principais

#### `empresas` (Multi-Tenant root)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | Auto-increment |
| razao_social | VARCHAR(255) | Nome da empresa |
| cnpj | VARCHAR(20) | |
| slug | VARCHAR(50) UNIQUE | ex: 'frimelo', 'edvam-melo' |
| ativa | TINYINT(1) | |
| data_cadastro | TIMESTAMP | |

#### `funcionarios`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| id_empresa | BIGINT FK | Multi-tenant |
| id_contrato | INT UNIQUE por empresa | Código ERP/externo |
| nome | VARCHAR(255) | |
| cpf | CHAR(11) | |
| cargo | VARCHAR(150) | |
| centro_custo | VARCHAR(100) | |
| tipo_contrato | ENUM(CLT,PJ,ESTAGIO,OUTRO) | |
| status | ENUM(ATIVO,DESLIGADO,AFASTADO) | |
| empresa_codigo | VARCHAR | Código Empresa ERP |
| local | VARCHAR | Local de trabalho |
| departamento | VARCHAR | |
| **salario_base** | **DECIMAL(10,2) NULL** | **v4.52.0: fonte única do salário; alimenta rubrica 33** |
| data_admissao | DATE | Usado para salário proporcional na admissão (v4.52.10) |

#### `eventos_folha` (global, sem id_empresa)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| codigo_evento | INT UNIQUE | Código rubrica (ex: 33, 49, 62) |
| nome_evento | VARCHAR(150) | |
| tipo | ENUM(CREDITO,DEBITO,INFORMATIVO) | |
| natureza | ENUM(PROVENTO,DESCONTO,BASE,OUTRO) | |
| unidade | ENUM(VALOR,HORA,DIA,UNIDADE,PERCENTUAL) | |
| obrigatorio | TINYINT(1) | |
| ordem_exportacao | INT | Ordem na exportação |
| incide_inss | TINYINT(1) | |
| incide_fgts | TINYINT(1) | |
| incide_irrf | TINYINT(1) | |

#### `competencias`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| id_empresa | BIGINT FK | |
| mes | TINYINT | 1–12 |
| ano | SMALLINT | |
| status | ENUM(ABERTA,FECHADA) | |
| justificativa_status | TEXT | Adicionado v4.48.10 |
| UNIQUE KEY | (mes, ano, id_empresa) | |

#### `lancamentos_eventos` ⚠️ TABELA CRÍTICA
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| id_empresa | BIGINT FK | |
| funcionario_id | BIGINT FK | |
| competencia_id | BIGINT FK | |
| evento_id | BIGINT FK | |
| quantidade | DECIMAL(10,2) | Horas, dias, percentual |
| valor_unitario | DECIMAL(10,2) | |
| valor_total | DECIMAL(10,2) | |
| origem | ENUM(MANUAL,CALCULO,IMPORTADO) | |
| UNIQUE KEY | (funcionario_id, competencia_id, evento_id) | **SEM id_empresa na UK** |

> ⚠️ **ATENÇÃO:** A `UNIQUE KEY` de `lancamentos_eventos` **NÃO inclui id_empresa**. O campo `id_empresa` foi adicionado em v4.11.0 via migration, mas está FORA da chave única. O `ON DUPLICATE KEY UPDATE` **DEVE incluir `id_empresa = VALUES(id_empresa)`** para não perder o vínculo.

#### `usuarios`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| id_empresa | BIGINT FK | |
| nome | VARCHAR(150) | |
| email | VARCHAR(150) UNIQUE | |
| senha_hash | VARCHAR(255) | bcrypt |
| perfil | ENUM(SUPERADMIN,ADMIN,RH,LEITURA) | |
| ativo | TINYINT(1) | |
| must_change_password | TINYINT(1) DEFAULT 0 | v4.57.0 — 1 = troca obrigatória no próximo login |

#### `jwt_blacklist` (v4.57.0)
| Coluna | Tipo | Notas |
|--------|------|-------|
| jti | CHAR(32) PK | Identificador único do token revogado (logout/troca de senha) |
| usuario_id | INT NULL | |
| expira_em | INT | `exp` do token; registros vencidos são apagados automaticamente |
| criado_em | TIMESTAMP | |

#### `logs_auditoria`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| id_empresa | BIGINT FK | |
| usuario_id | BIGINT FK nullable | |
| entidade | VARCHAR(100) | ex: 'FOLHA', 'FUNCIONARIO' |
| entidade_id | BIGINT | |
| acao | VARCHAR(50) | ex: 'LOGIN', 'IMPORTACAO' |
| detalhes | TEXT | |
| created_at | TIMESTAMP | |

#### `parametros_sistema`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | BIGINT PK | |
| id_empresa | BIGINT FK | |
| chave | VARCHAR(100) | ex: 'RAZAO_SOCIAL', 'TETO_INSS' |
| valor | TEXT | |
| tipo | ENUM(TEXTO,NUMERO,BOOLEANO) | |
| UNIQUE KEY | (id_empresa, chave) | |

### 4.3 Migrations Aplicadas
| Versão | Arquivo | Descrição |
|--------|---------|-----------|
| v4.6.9 | add_salario_event | Adiciona evento Salário (33) |
| v4.8.0 | add_auxiliares/dependentes/ferias | Tabelas auxiliares |
| v4.10.0 | add_tax_incidences | incide_inss/fgts/irrf em eventos |
| v4.11.0 | create_tenants | **Multi-tenant: adiciona id_empresa em todas as tabelas** |
| v4.11.1 | saas_billing | Campos de faturamento SaaS nas empresas |
| v4.16.2 | add_insalubridade | Evento 62 — Insalubridade |
| v4.16.3 | add_assiduidade | Evento 833 — Assiduidade |
| v4.16.4 | reorder_events | Reordena ordem_exportacao |
| v4.37.3 | fix_assiduidade_unit | Corrige unidade para PERCENTUAL |
| v4.39.0 | dsr_module | Tabelas DSR detalhado |
| v4.41.4 | rubrica59_dsr_he | Rubrica 59 DSR s/ HE |
| v4.43.0 | feriados_customizaveis | Tabela de feriados por empresa |
| v4.44.0 | relacao_calculo_fields | Campos para relação de cálculo |
| v4.48.10 | add_competencia_justificativa | Campo justificativa_status em competencias |
| v4.50.4 | add_adicional_tempo_servico | Insere evento 1000 (Adic. Tempo de Serviço, PERCENTUAL) e reordena rubricas |
| v4.50.5 | reorder_1000_after_833 | Reordena rubrica 1000 para posição 8 (após 833) via UPDATE CASE atômico |
| v4.52.0 | add_salario_base_funcionarios | Adiciona `funcionarios.salario_base` e auto-popula com lançamento mais recente da rubrica 33 |
| v4.52.12 | add_inss_event | Insere evento 35 (INSS) na `eventos_folha` se ausente — necessário para auto-cálculo no grid |
| v4.53.0 | add_irrf_auto | Insere evento 1920 (IRRF) e 1900 (FGTS Visual) em `eventos_folha`; atualiza faixas `aliquotas_irrf` 2026 |
| v4.53.2 | update_inss_teto_2026 | Atualiza teto INSS → R$ 8.475,55 em `parametros_sistema` |
| v4.53.3 | update_irrf_gaps_2026 | Corrige gaps de R$ 0,01 nas faixas IRRF (faixa_inicio tinha +0,01 incorreto) |
| v4.53.9 | update_deducao_dependente | Atualiza `VALOR_DEDUCAO_DEPENDENTE` 203,77 → 189,59 em `parametros_sistema` (Lei 15.270/2025) |
| v4.57.0 | jwt_blacklist_troca_senha | Tabela `jwt_blacklist` (jti revogados no logout) + coluna `usuarios.must_change_password` |
| v4.53.10 | add_gratificacao_funcionarios | Adiciona `funcionarios.gratificacao` (rubrica 88, valor fixo) |
| v4.54.0 | add_competencia_atestados | Tabela `competencia_atestados` — atestado por funcionário/competência que zera a Assiduidade (833). Isolada de `lancamentos_eventos` |

---

## 5. AUTENTICAÇÃO E AUTORIZAÇÃO (RBAC)

### 5.1 Perfis de Acesso

| Perfil | Descrição | Troca de Empresa |
|--------|-----------|-----------------|
| `SUPERADMIN` | Acesso total. Cria/deleta empresas, usuários, limpeza crítica | Qualquer empresa via X-Company-Context |
| `ADMIN` | Acesso operacional completo. Importação, exportação, lançamentos | Qualquer empresa via X-Company-Context (v4.50.3+) — **intencional**: equipe operadora atende todas as empresas. ADMIN próprio de empresa cliente deve ser cadastrado como RH |
| `RH` | Lançamentos, eventos, competências. Sem gestão de usuários | Apenas empresa do token |
| `LEITURA` | Apenas visualização (dashboard, relatórios) | Apenas empresa do token |
| `COLABORADOR` | Acesso exclusivo ao Portal do Colaborador (`/portal`) | Não aplicável |

### 5.2 Fluxo de Autenticação

```
1. POST /login → verifica email/senha no banco (rate limit 5/min por IP, fail-closed)
2. AuthSession::emitirToken → JWT { user_id, email, perfil, id_empresa, jti, exp: +4h [, pwd_change] }
3. Backend grava o JWT no cookie `frimelo_session` (HttpOnly, Secure, SameSite=Strict, path da API)   ← v4.58.0
4. Frontend guarda em sessionStorage SÓ os dados do usuário (sem token)                              ← v4.58.0
5. Toda requisição: cookie automático + `X-Requested-With: XMLHttpRequest` + `X-Company-Context` (authHeaders)
6. auth.php: valida JWT (header válido > cookie) → jti revogado? 401 → cookie sem X-Requested-With em
   POST/PUT/DELETE? 403 → pwd_change fora de change_password/logout? 403 → empresa → expõe $authUser
7. POST /logout → jti em jwt_blacklist + apaga cookie. Resposta 401 com sessão local → frontend volta ao login
```
> Transição v4.58.0: header `Authorization` válido e token no corpo do login ainda aceitos (telas antigas em cache). Remover em versão futura.

### 5.3 Middleware auth.php — Lógica de Empresa

```php
// SUPERADMIN e ADMIN: podem usar X-Company-Context para trocar empresa
if (perfil === 'SUPERADMIN' || perfil === 'ADMIN') {
    if ($contextId presente e numérico) → $payload['id_empresa'] = $contextId
    // v4.55.0 (C4): fallback id_empresa=1 REMOVIDO
}
// Garantia final: sem id_empresa válido → 401 "empresa não identificada"
// RH/LEITURA: sempre usa id_empresa do token JWT
```

### 5.4 Proteção de Rotas (Frontend)

| Rota | Perfis Permitidos |
|------|--------------------|
| `/dashboard` até `/manual` | ADMIN, SUPERADMIN, RH, LEITURA |
| `/importar`, `/exportar` | ADMIN, SUPERADMIN |
| `/parametros`, `/auditoria`, `/usuarios`, `/superadmin`, `/deep-cleanup`, `/formulas`, `/stress` | SUPERADMIN |
| `/portal` | COLABORADOR |
| `/trocar-senha` | Qualquer autenticado. `ProtectedRoute` redireciona para cá enquanto `must_change_password` (v4.57.0) |

### 5.5 Rotas Públicas (Backend — sem autenticação)
`login`, `status`, `health`

> ⚠️ **v4.57.1:** arquivos `.php` soltos em `backend/v1/` (create_saas_admin, pwd_reset, setup_db, repair_schema, fix_*...) **não são acessíveis pela URL** (403 via `.htaccess`). Antes eram executáveis sem login. Todo endpoint novo deve ser rota do `index.php`.

> ⚠️ **v4.51.0:** Endpoints administrativos `fix_password`, `repair_schema`, `fix_indices` foram removidos das rotas públicas. `fix_password` agora exige **SUPERADMIN autenticado + SETUP_KEY** (query param `?key=...` com valor do `.env`).

---

## 6. API — ENDPOINTS

**Base:** `/backend/v1`

| Método | Endpoint | Perfil Mínimo | Descrição |
|--------|----------|--------------|-----------|
| POST | `/login` | Público | Autenticação (grava cookie de sessão) |
| POST | `/logout` | Autenticado | Revoga o token + apaga cookie (v4.57.0) |
| POST | `/change_password` | Autenticado (inclusive `pwd_change`) | `{senha_atual, nova_senha}` → nova sessão (v4.57.0) |
| GET | `/status` | Público | Health check |
| GET | `/funcionarios` | LEITURA | Lista funcionários da empresa |
| POST | `/funcionarios` | RH | Criar/atualizar funcionário |
| DELETE | `/funcionarios?id=X` | ADMIN | Deletar funcionário |
| GET | `/eventos` | LEITURA | Lista todos os eventos de folha |
| POST | `/eventos` | ADMIN, RH | Criar/editar evento |
| GET | `/competencias` | LEITURA | Lista competências da empresa |
| POST | `/competencias` | ADMIN, RH | Criar/fechar competência |
| GET | `/lancamentos?competencia_id=X` | LEITURA | Lançamentos da competência |
| POST | `/lancamentos` | ADMIN, RH | Salvar lançamento único |
| POST | `/lancamentos/import` | ADMIN, RH | Salvar em bulk (toda a folha) |
| GET | `/companies` | ADMIN, SUPERADMIN | Lista todas as empresas |
| POST | `/companies` | SUPERADMIN | Criar/editar empresa |
| DELETE | `/companies?id=X` | SUPERADMIN | Deletar empresa (protege id=1) |
| GET/POST | `/users` | SUPERADMIN | CRUD usuários |
| GET | `/dsr/...` | LEITURA | `dias_uteis`, `dias_dsr`, `base_calculo`, `faltas_dsr`, `eventos_base`, `competencia/{id}` (DSR calculado) |
| POST | `/dsr/...` | ADMIN, RH | `calcular`, `falta`, `recalcular_individual` (DsrModal usa via `api.*` desde v4.56.0) |
| GET | `/stats` | LEITURA | KPIs do dashboard |
| GET | `/reports` | LEITURA | Dados para relatórios |
| GET/POST/PUT/DELETE | `/feriados` | ADMIN, RH, SUPERADMIN | CRUD feriados; PUT com `ativo=0` desliga o feriado do DSR (switcher, v4.53.11). Nacional só SUPERADMIN |
| GET/POST | `/atestados` | ADMIN, RH, SUPERADMIN | Atestado por competência (v4.54.0). GET lista `funcionario_id`; POST liga/desliga → zera Assiduidade |
| GET | `/aliquotas` | LEITURA | Alíquotas e parâmetros |
| POST | `/pdf-relatorio` | LEITURA | Gera PDF espelho/relação de cálculo |
| POST | `/pdf-contracheque` | LEITURA | Gera PDF contracheque (`funcionario_ids` opcional; usado também pelo botão do grid, v4.58.1) |
| POST | `/fechamento_expresso` | ADMIN, RH | Inicia fechamento expresso |
| GET | `/logs` | SUPERADMIN | Logs de auditoria |
| POST | `/deep-cleanup` | SUPERADMIN | Limpeza crítica de dados |

---

## 7. REGRAS DE NEGÓCIO DA FOLHA

### 7.1 Eventos Obrigatórios (Rubricas)

| Código | Nome | Tipo | Unidade | Auto-Calc | Visibilidade no Grid |
|--------|------|------|---------|-----------|----------------------|
| **33** | **Salário** | CREDITO | VALOR | **Travado** (vem do cadastro, com proporcionalidade na admissão) | Sempre |
| **35** | **INSS** | DEBITO | VALOR | **Sim — tabela progressiva 2026** (v4.52.11) | Sempre, travado (amber) |
| ~~36~~ | ~~IRRF (legado)~~ | DEBITO | VALOR | **Depreciado** — substituído pela rubrica 1920 (v4.53.0) | - |
| 48 | Horas Extras 50% | CREDITO | HORA (HH:MM) | Não | Sempre |
| **49** | **Horas Extras 100%** | CREDITO | HORA (HH:MM) | **Sim** | Sempre |
| **59** | **DSR s/ HE Diurnas** | CREDITO | VALOR | **VIRTUAL** | Sempre, read-only |
| **62** | **Insalubridade** | CREDITO | PERCENTUAL | **Sim** | Sempre |
| **71** | **Faltas** | DEBITO | DIA | **Sim** | Sempre |
| **88** | **Gratificação** | CREDITO | VALOR (máscara R$) | Não | Sempre |
| 99 | FGTS | INFORMATIVO | VALOR | Sintético no contracheque | Manual |
| **191** | **Desc Vale** | DEBITO | VALOR (máscara R$) | Não | Sempre |
| 719 | Prêmio Domingo | CREDITO | VALOR | Não | **Oculta** se sem dados (v4.52.8) |
| **833** | **Prêmio Assiduidade** | CREDITO | PERCENTUAL | **Sim — sobre salário do funcionário** (v4.52.5) | Sempre |
| 883 | Pontualidade | CREDITO | VALOR | Não | **Oculta** se sem dados (v4.52.8) |
| **936** | **Mensalidade Sindical** | DEBITO | VALOR (máscara R$) | Não | Sempre |
| **1000** | **Adic. Tempo de Serviço** | CREDITO | PERCENTUAL | **Sim — sobre salário do funcionário** (v4.52.7) | Sempre |
| 1080 | Feriado Trabalhado | CREDITO | DIA | Sim | **Oculta** se sem dados (v4.52.8) |
| **1900** | **FGTS Visual** | INFORMATIVO | VALOR | **Sim — 8% sobre base FGTS** (v4.53.0) | Sempre, travado (indigo). Não entra em bases de INSS/IRRF |
| **1920** | **IRRF** | DEBITO | VALOR | **Sim — Lei 15.270/2025, tabela progressiva 2026** (v4.53.0/v4.53.9) | Sempre, travado (amber) |
| **4004** | **Empréstimo Consignado** | DEBITO | VALOR (máscara R$) | Não | Sempre |

### 7.2 Fórmulas de Cálculo Automático

#### Salário (código 33) ⚠️ TRAVADO — v4.52.0/v4.52.10
```
valor_unitario = funcionario.salario_base
valor_total    = funcionario.salario_base
```
- **Fonte única:** `funcionarios.salario_base` no cadastro (não editável no grid)
- **Proporcionalidade na admissão (v4.52.10):** se `data_admissao` cair dentro do mês/ano da competência:
  ```
  dias_trabalhados = 30 - dia_admissao + 1
  salario          = salario_base × dias_trabalhados / 30
  ```
- Aplicado apenas em **competências ABERTAS**; FECHADAS preservam snapshot histórico

#### HE 100% (código 49) ⚠️ BASE CRÍTICA
```
valor_unitario = (Salário(33) + Gratificação(88) + Insalubridade(62)) / 220 × 2
valor_total    = quantidade_horas × valor_unitario
```
- `220` = MONTHLY_WORKING_HOURS (carga CLT mensal)
- `2` = OVERTIME_100_MULTIPLIER
- **A base de cálculo é Salário + Gratificação + Insalubridade** (Gratificação desde v4.54.1). Adic. Tempo de Serviço (1000) e Assiduidade (833) NÃO entram
- Frontend: helper `calcBaseHE()` em `usePayrollData.ts` — usar sempre ele, nunca repetir a soma
- **Input HH:MM (v4.52.3/v4.52.4):** usuário digita "230" → vira "2:30" automaticamente; armazenamento em decimal

#### Insalubridade (código 62) — REGRA v4.50.4
```
base_insalub   = max(0, Salário_Mínimo - Faltas(71).valor_total)
valor_unitario = base_insalub / 100
valor_total    = quantidade_% × valor_unitario
```
- Quando há faltas, a base da insalubridade é **reduzida pelo valor das faltas**
- Se não há faltas: `base = Salário_Mínimo` (comportamento anterior mantido)
- `max(0, ...)` impede base negativa

#### Prêmio Assiduidade (código 833) — v4.52.5
```
valor_unitario = Salário_do_Funcionário(rubrica 33) / 100
valor_total    = quantidade_% × valor_unitario
```
- **Base mudou em v4.52.5:** deixou de usar Salário Mínimo e passou a usar o salário individual do funcionário
- **Perda de assiduidade (v4.54.0):** `valor_total` é **zerado** na competência aberta quando houver Faltas (rubrica 71 preenchida) **OU** atestado informado. Atestado é registrado por funcionário/competência na tabela isolada `competencia_atestados` (checkbox no grid) — não entra em `lancamentos_eventos`, portanto não afeta exportação/importação. Implementado em `recalcularAssiduidadeTodos(lancamentos, eventos, atestados)`.
- **Exportação:** exporta apenas `quantidade` (%), não `valor_total`

#### Adic. Tempo de Serviço (código 1000) — v4.52.7
```
valor_unitario = Salário_do_Funcionário(rubrica 33) / 100
valor_total    = quantidade_% × valor_unitario
```
- **Base mudou em v4.52.7:** deixou de usar Salário Mínimo e passou a usar o salário individual
- Sem dedução de faltas
- **Exportação:** exporta apenas `quantidade` (%)

#### Faltas (código 71) e Feriado Trabalhado (1080)
```
valor_unitario = Salário(33) / 30
valor_total    = quantidade_dias × valor_unitario
```

#### DSR s/ HE (código 59) — EVENTO VIRTUAL ⚠️
```
DSR = (Σ valor_total das HE fontes / dias_úteis_mês) × dias_DSR_mês
```
- **NUNCA é salvo no banco** — calculado dinamicamente em memória
- `dias_úteis` e `dias_DSR` vêm do backend (`/dsr/dias_uteis`) **considerando feriados** da Gestão de Feriados (v4.52.2)
- Fallback local: `calcDiasComFeriados()` em `usePayrollData.ts` consulta `/feriados` + Páscoa móveis
- Fontes configuradas em `DSR_HE_CONFIG` (atualmente: código 49)
- Função: `recalcularDsrHeTodos()` em `usePayrollData.ts`

#### INSS (código 35) — v4.52.11 (TABELA PROGRESSIVA OFICIAL 2026)
```
base = Σ valor_total dos eventos CREDITO com incide_inss != false  (exclui 1900-FGTS Visual)
INSS = aplicação progressiva por faixa:
  até  1.621,00     → 7,5%
  até  2.902,84     → 9,0%
  até  4.354,27     → 12,0%
  até  8.475,55 (teto) → 14,0%
```
- Cada faixa tributa apenas o valor que cai dentro dela (cálculo progressivo correto)
- **v4.53.5:** Faltas (71) reduzem a base antes do cálculo do INSS
- **Travado** no grid — sempre auto-calculado
- Recalculado em tempo real após qualquer alteração em proventos
- Funções: `recalcularINSSPara()` / `recalcularINSSTodos()` em `usePayrollData.ts`
- Backend (FechamentoService): `calcularInssProgressivo()`
- PDFs (contracheque, espelho, relatórios): inserem **linha sintética** se não houver lançamento real

#### IRRF (código 1920) — v4.53.0 / v4.53.9 (LEI 15.270/2025 — TABELA PROGRESSIVA 2026)
```
RTM = Σ valor_total dos eventos CREDITO com incide_irrf != false  (exclui 1900-FGTS Visual)
      deduzindo Faltas (71) antes do cálculo  (v4.53.5)

BC_legal        = max(0, RTM − INSS − (dependentes × 189,59) − pensão − previdência_privada)
BC_simplificado = max(0, RTM − INSS − 607,20 − pensão − previdência_privada)

Para cada BC:
  RTM ≤ 5.000               → IR = 0 (isento Lei 15.270/2025)
  5.000 < RTM ≤ 7.350       → IR = max(0, IR_tabela − (978,62 − 0,133145 × RTM))  ← redutor sobre RTM
  RTM > 7.350               → IR = IR_tabela (sem redutor)

Tabela progressiva 2026:
  0        – 2.428,80  →  0%      − 0,00
  2.428,80 – 2.826,65  →  7,5%   − 182,16
  2.826,65 – 3.751,05  → 15,0%   − 394,16
  3.751,05 – 4.664,68  → 22,5%   − 675,49
  4.664,68+            → 27,5%   − 908,73

IRRF = MIN(IR_legal, IR_simplificado)  ← método mais vantajoso ao contribuinte
```
- **RTM (Rendimento Tributável Mensal):** base bruta antes de INSS — o redutor usa RTM, não BC
- **DEDUCAO_DEPENDENTE = R$ 189,59** (Lei 15.270/2025)
- **DESCONTO_SIMPLIFICADO = R$ 607,20** — alternativa ao método por dependentes
- **Travado** no grid (amber, igual ao INSS)
- Recalculado em cascata após INSS
- Funções: `recalcularIRRFPara()` / `recalcularIRRFTodos()` em `usePayrollData.ts`; `calcularIRRF(rtm, inss, deps, ...)` em `utils/taxCalculations.ts`
- Backend (FechamentoService): `calcularIrrfProgressivo()` / `_aplicarTabelaIRRF()`
- PDFs e relatórios: mesma lógica inline em `reports.php` e `pdf_relatorio.php`
- **Migration v4.53.9:** atualiza `parametros_sistema.VALOR_DEDUCAO_DEPENDENTE` 203,77 → 189,59

#### FGTS Visual (código 1900) — v4.53.0
```
valor_total = base_fgts × 8%
```
- Apenas **INFORMATIVO** — não entra nas bases de INSS, IRRF ou FGTS
- **Travado** no grid (indigo)
- Recalculado em cascata após qualquer alteração em proventos
- Função: `recalcularFGTSTodos()` em `usePayrollData.ts`

### 7.3 Cascata de Cálculo (Frontend — Tempo Real)

A cadeia completa ao carregar/trocar competência ou após salvar:
```
salario_base (com proporcionalidade na admissão)
  → Assiduidade (833 sobre salário do func)
  → Adic Tempo Servico (1000 sobre salário do func)
  → Insalubridade (max(0, SalMin − Faltas) / 100)
  → HE 100% (Salário + Gratificação + Insalubridade)
  → DSR (Σ HE / dias_úteis × dias_dsr)
  → INSS (progressiva sobre Σ proventos com incide_inss, descontando Faltas)
  → IRRF (Lei 15.270/2025: RTM + INSS + deps, redutor sobre RTM)  ← v4.53.0/v4.53.9
  → FGTS Visual (8% sobre base_fgts)                              ← v4.53.0
```

#### Cascata A: Insalubridade alterada (62)
```
1. Recalcula valor_total da Insalubridade
2. → Recalcula valor_unitario e valor_total do HE 100% (49)
3. → Recalcula valor_total do DSR 59
4. → Recalcula INSS (35) com nova base
```

#### Cascata B: Faltas alterada (71) — v4.50.4
```
1. Recalcula valor_total das Faltas (salário / 30 × qtd)
2. → Recalcula base_insalub = max(0, SalMin - novo valor_faltas)
3. → Recalcula valor_total da Insalubridade (62) com nova base
4. → Recalcula HE 100% (49) com nova insalubridade
5. → Recalcula DSR 59
6. → Recalcula INSS (35)
```

#### Cascata C: Qualquer provento alterado (genérica) — v4.52.11 / v4.53.0
```
1. Após cascadeUpdates específica (A ou B se aplicável)
2. → Recalcula INSS (35) sobre nova base de proventos (deduzindo Faltas — v4.53.5)
3. → Recalcula IRRF (1920) sobre RTM com INSS já conhecido (v4.53.0)
4. → Recalcula FGTS Visual (1900) sobre base_fgts (v4.53.0)
```

Implementadas em `updateLancamento()` via `cascadeUpdates` em `hooks/usePayrollData.ts`. INSS, IRRF e FGTS Visual são sempre re-derivados no fim da função.

### 7.4 Ciclo de Carregamento dos Dados
Ao abrir a folha, trocar de competência ou após salvar:
```
1. api.getLancamentos(competencia_id)
2. mapLancamentos(data)                              → Record<"funcId_eventoId", Lancamento>
3. aplicarSalarioBaseFuncionarios(...)              → Força rubrica 33 com salario_base + proporcionalidade na admissão (só comp ABERTA)
4. recalcularAssiduidadeTodos(...)                  → 833 sobre salário do func (v4.52.5)
5. recalcularAdicionalTempoServicoTodos(...)        → 1000 sobre salário do func (v4.52.7)
6. recalcularInsalubridadeTodos(...)                → 62 com base (SalMin - Faltas)
7. recalcularHETodos(...)                           → 49 com Salário + Gratificação + Insalubridade
8. recalcularDsrHeTodos(...)                        → 59 virtual
9. recalcularINSSTodos(...)                         → 35 progressivo (v4.52.11)
10. recalcularIRRFTodos(...)                         → 1920 Lei 15.270/2025 (v4.53.0/v4.53.9)
11. recalcularFGTSTodos(...)                         → 1900 FGTS Visual 8% (v4.53.0)
12. setLancamentos(final)
```
> ⚠️ A ordem é obrigatória — cada passo depende do anterior.
> ⚠️ Competências FECHADAS pulam o passo 3 (preservam snapshot histórico).
> ⚠️ **v4.54.1:** Competências FECHADAS pulam também os passos 4–7, 9 e 10 (`recalcularCascataCompleta(..., competenciaAberta=false)`) — só as virtuais 59 e 1900 são calculadas; o grid mostra exatamente o valor salvo.

### 7.5 Exportação da Folha

| Rubrica | Campo Exportado |
|---------|----------------|
| HORA ou PERCENTUAL | `quantidade` — inclui 62 (Insalubridade), 833 (Assiduidade), **1000 (Adic. Tempo Serviço)** |
| 71 (Faltas) | `quantidade` (dias) — **não o valor monetário** |
| Demais (VALOR) | `valor_total` |

Formatos disponíveis: **XLSX**, **TXT** (formato ERP), **CSV**.

### 7.6 Regras de Persistência de Lançamentos

- Upsert via `ON DUPLICATE KEY UPDATE` na tabela `lancamentos_eventos`
- Chave de conflito: `(funcionario_id, competencia_id, evento_id)`
- **O campo `id_empresa` DEVE estar no UPDATE** — senão a query de leitura (que filtra por empresa) não retorna o registro
- **Rubrica 59 NUNCA é enviada ao backend** — filtrada no `handleSave`
- O campo `codigo_evento` DEVE ser enviado no payload para o backend identificar auto-calc
- Após salvar, o frontend recarrega do banco para garantir consistência

---

## 8. HOOK PRINCIPAL: `usePayrollData.ts`

Centraliza toda a lógica da Folha. Expõe:

```typescript
{
  // Estado
  competencias, selectedComp, funcionarios, eventos, lancamentos,
  isSaving, lastSaved, isLoading, loadError, diasCalendario,

  // Ações
  handleCompChange(comp),     // Troca de competência
  updateLancamento(funcId, evId, field, value),  // Edição de célula
  handleSave(),               // Salva toda a folha no backend
  getLancamentosForEmployee(empId),

  // Derivados (useMemo)
  totalsByFunc,               // Proventos e descontos por funcionário
  globalTotals,               // Totais globais (proventos, descontos, líquido)
}
```

**Funções Puras Internas:**
- `calcDiasLocalmente(mes, ano)` — calcula dias úteis e DSR sem backend
- `calcDsrHe(funcId, lancamentos, eventos, diasUteis, diasDsr)` — DSR de um funcionário
- `recalcularDsrHeTodos(lancamentos, eventos, diasUteis, diasDsr)` — DSR de todos
- `recalcularHETodos(lancamentos, eventos)` — HE de todos com Salário+Insalubridade
- `recalcularInsalubridadeTodos(lancamentos, eventos)` — ⚠️ NOVO v4.50.4: Insalubridade de todos com (SalMin − Faltas)

---

## 9. BACKEND — SERVIÇOS

### 9.1 LancamentoService.php (Core)

**`saveBulk(data[], empresaId, userId)`**
1. Resolve salários base (`resolveBaseSalaries`) — lê `funcionarios.salario_base` + aplica proporcionalidade na admissão
2. Resolve insalubridade (`resolveEventValues` com código 62) — lote → DB
3. Resolve faltas (`resolveEventValues` com código 71) — lote → DB
4. Valida todos os `evento_id` contra `eventos_folha` (evita FK violation)
5. **v4.52.10:** Bloqueia escrita em competências FECHADAS (cache `competenciaAbertaCache`)
6. Para cada item: `calculateEventValue(item, salary, insalubridade, faltas)`
7. `INSERT ... ON DUPLICATE KEY UPDATE` com `id_empresa = VALUES(id_empresa)`
8. Registra log de auditoria

**`calculateEventValue(item, baseSalary, insalubridade=0, faltas=0)`** — atualizado em várias versões
- Se o evento NÃO está na lista de auto-calc e já tem valor → retorna sem alterar
- Eventos de auto-calc: 33, 49, 1080, 71, 62, 833, 1000
- **Salário (33):** `valor_total = baseSalary` (já com proporcionalidade aplicada em `resolveBaseSalaries`)
- HE 100% (49): `baseHE = baseSalary + gratificacao + insalubridade` (gratificação desde v4.54.1)
- Faltas (71) / Feriado (1080): `salário / 30 × quantidade`
- Insalubridade (62): `base = max(0, salário_mínimo - faltas); valUnit = base / 100`
- **Prêmio Assiduidade (833) — v4.52.5:** `valor_unitario = baseSalary / 100`
- **Adic. Tempo de Serviço (1000) — v4.52.7:** `valor_unitario = baseSalary / 100`

**`resolveBaseSalaries()` — v4.52.0/v4.52.10**
- Fonte primária: `funcionarios.salario_base`
- Aplica `aplicarProporcionalidadeAdmissao()` se `data_admissao` cair dentro do mês/ano da competência
- Fallback legado: lança rubrica 33 do banco (para dados sem `salario_base`)

**`isCompetenciaAberta()` — v4.52.10**
- Helper que retorna true apenas se `competencias.status = 'ABERTA'`
- Usado em `saveBulk` para bloquear escritas em competências fechadas (imutabilidade auditável)

### 9.2 DsrService.php
Cálculo detalhado de DSR com múltiplas fontes (HE, comissões, horistas).
Tabela: `dsr_calculado`.

### 9.3 FechamentoService.php
Gerencia o ciclo de vida do fechamento de competência.
Tabela: `fechamento_snapshot`.

---

## 10. FRONTEND — CAMADA DE API

**`services/mockApi.ts`** — Função `fetchApi()` (v4.58.0):
- `credentials: 'include'` + `authHeaders()`: `X-Requested-With`, `X-Company-Context` (se definido) e `Authorization` **só** para sessão legada
- **Token não fica em storage**: `salvarUsuarioSessao()` remove o token antes de gravar o usuário
- Resposta 401 (fora de login/logout) com sessão local → limpa sessão e redireciona para `/login`
- `fetch` direto em views é proibido sem `credentials: 'include'` + `authHeaders()` — preferir métodos de `api`
- Converte `codigo_evento` para `Number` no `getEventos()`
- Garante que eventos 62 e 833 tenham `unidade: PERCENTUAL`
- Rubrica 59 sempre posicionada imediatamente após a rubrica 49 (ordem dinâmica)

**Modo Mock:** `CONFIG.IS_MOCK = false` em produção. Dados mock definidos em `MANDATORY_EVENTS` (`constants.tsx`).

---

## 11. CONFIGURAÇÕES IMPORTANTES

### 11.1 Frontend (config.ts)
```typescript
CONFIG.SERVER_IP     = 'frimelo.meusistema.com.br'
CONFIG.API_BASE_URL  = '/backend/v1'
CONFIG.IS_MOCK       = false
CONFIG.VERSION       = injetado pelo Vite a partir do package.json
```
> ⚠️ **NUNCA alterar VERSION manualmente.** O Vite injeta via `VITE_APP_VERSION` a partir do `package.json`.

### 11.2 Backend (.env — não versionado)
```
DB_HOST, DB_NAME, DB_USER, DB_PASS   # Credenciais MySQL Hostgator
JWT_SECRET                           # Chave de assinatura JWT
APP_ENV                              # 'production' ou 'dev'
SETUP_KEY                            # Chave para acessar /setup
```

### 11.3 CORS (config.php)
Origens permitidas em produção:
- `https://frimelo.meusistema.com.br`
- `https://app.frimelo.com.br`
- Localhost liberado apenas com `APP_ENV=dev`

### 11.4 Cache (.htaccess em public/)
```apache
index.html    → no-cache, no-store (evita FATAL_BOOT_ERROR pós-deploy)
*.js, *.css   → cache 1 ano, immutable
```
> ⚠️ **SEMPRE editar `public/.htaccess`**, não `dist/.htaccess` (Vite sobrescreve o dist a cada build).

---

## 12. CONSTANTES DE DOMÍNIO

### Frontend (`constants/payroll.ts`)
```typescript
MONTHLY_WORKING_HOURS  = 220
OVERTIME_100_MULTIPLIER = 2
SALARIO_MINIMO_2026    = 1621.00

EVENT_CODES = {
  SALARIO: 33,            INSALUBRIDADE: 62,
  HORAS_EXTRAS_50: 48,   HORAS_EXTRAS_100: 49,
  DSR_HE_DIURNAS: 59,    FALTAS: 71,
  FERIADO_TRABALHADO: 1080,
  INSS: 35,
  IRRF: 1920,             // v4.53.0: código atualizado (legado era 36)
  FGTS_VISUAL: 1900,      // v4.53.0: FGTS informativo no grid
  FGTS: 99,              VT_DESC: 17,
  ASSIDUIDADE: 833,      ADICIONAL_TEMPO_SERVICO: 1000,
}

// utils/taxCalculations.ts — constantes fiscais 2026
DEDUCAO_DEPENDENTE   = 189.59   // Lei 15.270/2025 (era 203.77 até v4.53.8)
DESCONTO_SIMPLIFICADO = 607.20  // v4.53.9: método simplificado IRRF
TETO_INSS            = 8475.55
SALARIO_MINIMO       = 1621.00
ALIQUOTA_FGTS        = 8.0
```

### Backend (`lib/PayrollConstants.php`) — Espelho exato do frontend
```php
MONTHLY_WORKING_HOURS  = 220
OVERTIME_100_MULTIPLIER = 2.0
SALARIO_MINIMO_2026    = 1621.00
EVENT_CODES['SALARIO'] = 33   // ... (mesmos valores)
```

---

## 13. WORKFLOW DE DEPLOY

### Sequência Obrigatória
```bash
# 1. Bump de versão (SEMPRE perguntar ao usuário qual versão)
npm --no-git-tag-version version X.Y.Z

# 2. Build do frontend
npx vite build

# 3. Gerar pacote de deploy
python3 create_zip.py --version X.Y.Z
# → Gera: deploy-frimelo-X.Y.Z.zip (dist/ + backend/)

# 4. Usuário roda migration (se houver) no phpMyAdmin ANTES do zip, sobe o zip e testa em produção
#    (não existe staging — testes só com casos reais, nunca alterando dados reais)

# 5. Após teste OK: CHANGELOG/SPEC/PRD/CLAUDE + commit (código e docs separados) + tag local
git commit -m "feat(vX.Y.Z): ..." ; git commit -m "docs: ..." ; git tag vX.Y.Z

# 6. Push — rodado PELO USUÁRIO no terminal do VSCode (conta gh ativa não tem acesso ao repo;
#    remote local usa valterpcjria-cloud; o token fine-grained é colado na caixa do topo do VSCode)
git push origin main vX.Y.Z

# 7. Release — rodado PELO USUÁRIO (gh fora do PATH do sh → caminho completo)
read -s -p "Token: " GH_TOKEN; export GH_TOKEN; /home/valterpcjria/.local/bin/gh release create vX.Y.Z \
  deploy-frimelo-X.Y.Z.zip --repo valterpcjria-cloud/folha-frimelo --title "..." --notes-file notas.md; unset GH_TOKEN
```
> ⚠️ Nunca gravar token em arquivo/memória. Token fine-grained `frimelo-deploy` (só este repo, Contents RW) vence em 31/12/2027.

### Deploy no Hostgator
Upload manual do ZIP via cPanel → extrair na raiz do domínio (`frimelo.meusistemanaweb.com.br`). Rollback = subir o zip da versão anterior (migrations são aditivas e não quebram a versão anterior).
O `.htaccess` em `public/` é copiado para `dist/` pelo Vite durante o build.

---

## 14. SEGURANÇA

| Camada | Mecanismo |
|--------|-----------|
| Autenticação | JWT HS256 (validação de `alg` e `typ` explícita desde v4.51.0), expira em 4h. **v4.58.0: transportado em cookie HttpOnly `frimelo_session` (SameSite=Strict); mutações via cookie exigem `X-Requested-With` (CSRF); header Authorization aceito só na transição.** Desde v4.57.0: claim `jti` + `jwt_blacklist` (logout revoga na hora) e claim `pwd_change` (token restrito a `change_password`/`logout`) |
| Autorização | `requireRole()` em cada rota |
| Rate Limiting | 5 tentativas/min por IP no login; **fail-closed** (503 se cache não gravável, v4.55.0). IP: `CF-Connecting-IP` só de faixas Cloudflare, senão `REMOTE_ADDR` (anti-spoofing, v4.55.0) |
| Injeção SQL | PDO com prepared statements em 100% das queries |
| XSS | `InputSanitizer::sanitizeString()` no backend; React escaping no frontend |
| CORS | Whitelist de origens em `config.php` |
| Headers | X-XSS-Protection, X-Frame-Options: **DENY** (v4.51.0), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (HTTPS), CSP Report-Only (v4.51.0) |
| Senha | bcrypt via `password_hash()` / `password_verify()`. v4.57.0: mín. 8, letras+números; senha temporária aleatória p/ usuário novo; troca obrigatória (`usuarios.must_change_password` ou login com `123456`) |
| Tenant Isolation | `id_empresa` em todas as queries de leitura/escrita |
| Endpoints Admin | `fix_password` exige SUPERADMIN + SETUP_KEY (v4.51.0) |
| Acesso direto a PHP | v4.57.1: `backend/v1/.htaccess` só permite `index.php`; scripts soltos (manutenção/diagnóstico) retornam 403. Nunca criar endpoint como arquivo `.php` solto — sempre rota no `index.php` |
| Segredos | `.env` não trackado pelo git (v4.51.0) — atualizar manualmente na Hostgator |

> ⚠️ **Nenhum usuário não-SUPERADMIN pode elevar outro usuário a SUPERADMIN** — verificação dupla no `users.php`.

> ⚠️ **Auditoria de segurança (2026-04-17):** Deploy 1 em v4.51.0 (C1 parcial, C2, A4, A6). Deploy 2 em v4.55.0 (C4, A1 + anti-spoofing de IP); CSP enforced pendente. Deploy 3: C3/A5 não se aplicam (ADMIN multi-empresa é regra de negócio); restam C5, A2, A3 — ver `plans/linear-toasting-zephyr.md`.

---

## 15. CONVENÇÕES DE CÓDIGO

### Nomenclatura
- **Domínio (PT-BR):** `Funcionario`, `Lancamento`, `Competencia`, `Evento`, `Empresa`
- **UI/técnico:** pode usar inglês (`handleSave`, `fetchApi`, `mapLancamentos`)
- **Banco:** `snake_case` (ex: `funcionario_id`, `codigo_evento`)
- **Frontend:** `camelCase` para variáveis, `PascalCase` para componentes

### Limites de Arquivo
- Componentes React: máximo 300 linhas. Se ultrapassar, extrair sub-componente.
- Exemplo: `DsrModal.tsx` extraído de `PayrollGridView.tsx`

### Type Safety
- Todo dado vindo do backend DEVE ter interface correspondente em `types.ts`
- Campos numéricos do backend (retornam como string em PHP) devem usar `Number()` na camada de mapeamento

---

## 16. PADRÕES DE ANTI-ERROS (LIÇÕES APRENDIDAS)

| Problema | Causa | Solução |
|----------|-------|---------|
| Dados somem após salvar | `id_empresa` faltando no `ON DUPLICATE KEY UPDATE` | Incluir sempre `id_empresa = VALUES(id_empresa)` |
| Campos zerados após save | `codigo_evento` não enviado no payload | Sempre incluir `codigo_evento` no save |
| HE errado após save | `saveSingle` não recebe insalubridade | Preferir `saveBulk` que resolve insalubridade do lote/DB |
| DSR zerado após save | Rubrica 59 carregada do DB mas não recalculada | Chamar `recalcularDsrHeTodos` em todo load |
| FATAL_BOOT_ERROR pós-deploy | Browser cacheou `index.html` com chunks antigos | `no-cache` no `index.html` via `.htaccess` (editar em `public/`, não `dist/`) |
| HE calculado só com salário | Insalubridade não estava no estado ao digitar HE | Cascata `insalubridade → HE → DSR` em `updateLancamento` + `recalcularHETodos` no load |
| Exportação Faltas em R$ | `unidade === 'DIA'` não estava na lógica `isQty` | Adicionar `|| e.codigo_evento === 71` no `isQty` |
| Insalubridade não reduz quando há faltas | Base estava sempre em SalMin fixo | v4.50.4: `base = max(0, SalMin - Faltas)` + cascata Faltas→Insalubridade→HE→DSR |
| Reordenação de evento com conflito de UK | Migration fazia UPDATEs sequenciais com possível duplicata na `ordem_exportacao` | Usar `UPDATE ... CASE` atômico que atualiza todas as ordens em uma única query |
| IRRF não zera para RTM ≤ 5.000 | Redutor era aplicado sobre BC em vez do RTM — em bases ~4393–5000 gerava IR positivo incorreto | Redutor `978,62 − 0,133145 × RTM` usa RTM bruto; check `RTM ≤ 5.000` antes de calcular (v4.53.9) |
| Valor antigo persiste ao zerar quantidade | `if (qty <= 0) return` em recalcularHETodos/recalcularPercentualSobreSalarioTodos saía sem zerar `valor_total` | Remover o guard de retorno antecipado; sempre setar `valor_total = 0` quando `qty <= 0` (v4.53.7/v4.53.8) |
| Assiduidade/ATS não reflete em outra empresa | Mesmo bug do guard acima + valor NULL no DB para funcionários sem lançamento prévio | Fix v4.53.8 garante recalculo completo em todas as empresas |
| "Valor da HE volta errado após F5" | Edição só fica no estado até clicar Salvar | v4.55.0/v4.56.0: aviso de alterações não salvas + "Salvar e continuar" |
| Competência fechada mostrando valor diferente do pago | Cascata recalculava tudo na tela também em comp FECHADA | v4.54.1: `recalcularCascataCompleta(..., competenciaAberta)` — fechada só calcula virtuais 59/1900 |
| Modal DSR / Fórmulas vazios sem erro | `fetch` direto lia `sessionStorage('token')`, chave que nunca existiu → 401 silencioso | Usar métodos de `api` / `authHeaders()` (v4.56.0/v4.58.0) |
| Scripts de manutenção executáveis sem login | `.htaccess` só encaminhava ao `index.php` arquivos inexistentes; `.php` reais rodavam direto | v4.57.1: `.htaccess` só libera `index.php`; nunca criar endpoint como `.php` solto |
| Botão "Imprimir / PDF" sem ação | Componente aberto sem passar o callback `onPrint` | Conferir props opcionais de callback ao reutilizar componente (v4.58.1) |
| Zip com arquivos duplicados | `create_zip.py` adicionava ferramentas PHP 2x | Corrigido v4.57.1; validar zip (`testzip`, duplicados, `.env` ausente) antes de entregar |
| Login burlando limite de tentativas | IP lido de `X-Forwarded-For` (forjável) | v4.55.0: `CF-Connecting-IP` só de faixas Cloudflare; senão `REMOTE_ADDR` |
| **BV** DSR dias úteis 500 no Docker | Imagem oficial do PHP sem a extensão `calendar` (também faltavam `gd`/`bcmath` para PDFs) | Dockerfile instala `calendar gd bcmath pdo_mysql`; conferir `php -m` a cada imagem (v1.0.0) |
| **BV** Tela caía no cálculo reserva de feriados | `:uf` repetido na mesma query → HY093 com `EMULATE_PREPARES=false` | Nomes distintos (`:uf2`); varrer parâmetros repetidos ao mexer em SQL (v1.0.0). A Frimelo tem o mesmo bug (avisado, não mexido) |
| **BV** PDF com "- -GO" | Código lia `cidade`, coluna é `nome_cidade` | `$e['cidade'] ?? $e['nome_cidade']` (v1.0.0) |
| **BV** Funcionário novo com insalubridade indevida | Padrão herdado da Frimelo (20% / 11%) | Padrão 0% em formulário, API, cálculo e DEFAULT (v1.1.0) |
| **BV** Proposta de trocar código de rubrica pela resposta do escritório | Escritório escreveu "INSS 1950"; o código do Questor é o mesmo da outra folha | Código existente nunca muda (importação no Questor dá erro); só rubrica nova usa código novo (v1.2.0) |
| **BV** Versão anterior sumiu da VPS para rollback | Cron do CRM `docker image prune -af --filter until=24h` | Guardar a imagem anterior no PC e reenviar; não mexer no cron do CRM |
| **BV** localhost:8090 "conexão recusada" | Túnel SSH não estava aberto | `ssh -N -L 8090:127.0.0.1:8090 luzitec-vps` e deixar o terminal aberto |

---

## 17. MÓDULOS DO SISTEMA (Views)

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/dashboard` | KPIs: total funcionários, custo, competência ativa, gráficos |
| Funcionários | `/funcionarios` | CRUD de funcionários com filtros e importação |
| Lançamentos | `/lancamentos` | Grid principal da folha — edição de rubricas por funcionário |
| Eventos | `/eventos` | Cadastro e configuração de rubricas/eventos de folha |
| Competências | `/competencias` | Gestão de períodos mensais (abrir/fechar) |
| Feriados | `/feriados` | Cadastro de feriados personalizados por empresa |
| Fechamento Expresso | `/fechamento-expresso` | Snapshot e fechamento rápido da folha |
| Contracheques | `/contracheques` | Visualização e impressão de holerites |
| Exportação | `/exportar` | Exportar folha em XLSX, TXT (ERP), CSV |
| Importação | `/importar` | Importar planilha de lançamentos |
| Relatórios | `/relatorios` | Gráficos e análises da folha |
| Parâmetros | `/parametros` | Configurações do sistema (SUPERADMIN) |
| Fórmulas | `/formulas` | Editor de fórmulas (SUPERADMIN) |
| Auditoria | `/auditoria` | Log de todas as ações do sistema (SUPERADMIN) |
| Usuários | `/usuarios` | CRUD de usuários (SUPERADMIN) |
| Gestão SaaS | `/superadmin` | Gerenciar empresas do sistema (SUPERADMIN) |
| Limpeza Crítica | `/deep-cleanup` | Deletar dados (SUPERADMIN) |
| Manual | `/manual` | Manual do sistema integrado |
| Portal | `/portal` | Portal do colaborador (perfil COLABORADOR) |
| Troca de senha | `/trocar-senha` | Obrigatória (1º acesso/reset/123456) ou via botão "Alterar Senha" do menu (v4.57.0) |

---

## 18. MULTI-TENANCY

O sistema é multi-tenant com isolamento por `id_empresa`:

- **Token JWT** carrega `id_empresa` do usuário no login
- **Todas as queries** filtram por `id_empresa = $authUser['id_empresa']`
- **ADMIN e SUPERADMIN** podem trocar de empresa via header `X-Company-Context`
- **RH e LEITURA** ficam restritos à empresa do token
- O frontend envia `X-Company-Context` automaticamente quando `selectedCompanyId` está definido
- Empresas ID=1 (Frimelo) e ID=2 (Edvam Melo) são os tenants ativos
- **Regra de negócio (confirmada 2026-10-01):** todo ADMIN vê todas as empresas de propósito (a equipe operadora atende todas). Usuário de empresa cliente deve ser **RH**, nunca ADMIN. Sem fallback para empresa 1 desde v4.55.0

---

---

## 19. HISTÓRICO DE VERSÕES RECENTES

| Versão | Data | Principais Mudanças |
|--------|------|---------------------|
| **BV 1.2.0** | 2026-11-26 | Grat. de função 82 (%) no lugar da 88; HE 60% (37) com DSR; horas faltas (23); desconto VT 816 com teto; estagiário sem INSS/FGTS; faltas reduzem base do FGTS; cascata completa na edição |
| **BV 1.1.0** | 2026-11-18 | Etiquetas nível/aniversário/admissão na matriz; atestado em dias; insalubridade/assiduidade padrão 0%; `POST /atestados` valida empresa e recusa competência fechada; backup diário do banco na VPS |
| **BV 1.0.0** | 2026-11-18 | Fork Bem Vindo: Docker na VPS, setores/cargos/hierarquia, cadastro ampliado, matriz por setor, marca, senha temporária em empresa nova; fixes: extensões PHP da imagem, HY093 no DsrService, `nome_cidade` no PDF |
| v4.50.3 | 2026-04-03 | ADMIN passa a acessar múltiplas empresas via `X-Company-Context` (antes era só SUPERADMIN) |
| v4.50.4 | 2026-04-16 | Nova rubrica 1000 (Adic. Tempo de Serviço, PERCENTUAL, SalMin/100). Insalubridade: base = max(0, SalMin − Faltas). Cascata Faltas→Insalubridade→HE→DSR no frontend e backend |
| v4.50.5 | 2026-04-16 | Reordenação da rubrica 1000 para posição 8 (após 833) via migration atômica |
| v4.51.0 | 2026-04-17 | **Security Hardening Deploy 1:** endpoints admin removidos de rotas públicas; `fix_password` agora exige SUPERADMIN + SETUP_KEY; JWT valida `alg=HS256` e `typ=JWT`; headers CSP/HSTS/Permissions-Policy; X-Frame-Options=DENY; `.env` untracked + credenciais rotacionadas |
| v4.52.0 | 2026-04-24 | **Salário no cadastro:** `funcionarios.salario_base` (DECIMAL 10,2) vira fonte única; rubrica 33 fica travada no grid; alteração só via cadastro; competências FECHADAS preservam snapshot |
| v4.52.1 | 2026-04-24 | Fix `formatBRL` interpretava string decimal como BR (100x maior); migration v4.52.0 reescrita com PREPARE/EXECUTE compatível com MariaDB |
| v4.52.2 | 2026-04-24 | DSR consulta feriados de Gestão de Feriados; helper `calcDiasComFeriados` + algoritmo Meeus/Jones/Butcher para feriados móveis (Páscoa/Carnaval/Sexta-Santa/Corpus) |
| v4.52.3 | 2026-04-24 | Input HH:MM para rubricas HORA (HE 50% e 100%); novo componente `HoursInput` com estado local de edição |
| v4.52.4 | 2026-04-24 | Máscara automática HH:MM — usuário digita "230" e vira "2:30" sozinho |
| v4.52.5 | 2026-04-27 | **Prêmio Assiduidade (833) sobre salário do funcionário** (não mais Salário Mínimo); helper genérico `recalcularPercentualSobreSalario` no backend e frontend |
| v4.52.6 | 2026-05-06 | Máscara R$ automática nas rubricas 191 (Desc Vale), 936 (Mensalidade Sindical), 4004 (Empréstimo Consignado) |
| v4.52.7 | 2026-05-06 | **Adic. Tempo de Serviço (1000) sobre salário do funcionário** (mesma regra da 833) |
| v4.52.8 | 2026-05-06 | Rubricas descontinuadas (719/883/1080) ocultas no grid quando competência não tem lançamento — preserva histórico |
| v4.52.9 | 2026-05-06 | Máscara R$ também na Gratificação (88) |
| v4.52.10 | 2026-05-06 | **Salário proporcional aos dias trabalhados na admissão** (CLT 30 dias); helper `calcSalarioProporcional` (frontend) e `aplicarProporcionalidadeAdmissao` (backend); `saveBulk` bloqueia escrita em comp FECHADA |
| v4.52.11 | 2026-05-06 | **INSS auto-calculado no grid** pela tabela progressiva oficial 2026; rubrica 35 travada (igual ao Salário); `recalcularINSSPara/Todos` no `usePayrollData` |
| v4.52.12 | 2026-05-06 | Migration `add_inss_event` insere o evento 35 em `eventos_folha` se ausente — necessário para auto-cálculo no grid funcionar |
| v4.52.13 | 2026-05-06 | Fix duplicação de INSS no contracheque (PaystubView/PrintBatchView) — linha sintética só aparece se não houver lançamento real |
| v4.52.14 | 2026-05-06 | INSS sintético no PDF do contracheque backend (`pdf_contracheque.php`) para competências antigas sem lançamento |
| v4.52.15 | 2026-05-06 | INSS sintético em todos os relatórios (RESUMO_FOLHA, FICHA_FINANCEIRA, EVENTOS, RELACAO_CALCULO); helper `fmtBRL` defensivo evita crash no Resumo Mensal |
| v4.52.16 | 2026-05-06 | Fix crash ao trocar entre relatórios com shapes diferentes — `setReportData([])` antes do fetch + `.filter()` defensivo |
| v4.52.17 | 2026-05-06 | INSS sintético no Espelho da Folha (PDF `pdf_relatorio.php`) |
| v4.53.0 | 2026-05-20 | **IRRF auto-calculado no grid** (rubrica 1920, Lei 15.270/2025); **FGTS Visual** (rubrica 1900, informativo 8%); ambos travados no grid. Cascata completa: INSS → IRRF → FGTS Visual. Linha sintética IRRF em todos os PDFs e relatórios |
| v4.53.1 | 2026-05-20 | Fix isenção R$ 5.000: `return 0` direto para `base ≤ 5000`; transição linear 5k–7.35k corrigida |
| v4.53.4 | 2026-05-21 | Fix modal cadastro funcionários: botões Cancelar/Salvar ocultos abaixo do fold — `max-h-[90vh] flex flex-col`, form com `id="employee-form"`, botões fora do form com `form=` attr e `flex-shrink-0` |
| v4.53.5 | 2026-05-21 | INSS e IRRF deduzem Faltas (rubrica 71) da base antes de calcular — dias não trabalhados reduzem RTM |
| v4.53.6 | 2026-05-22 | Força recálculo completo da cascata antes de salvar — evita persistir valores HE obsoletos |
| v4.53.7 | 2026-05-22 | Fix `recalcularHETodos`: `if (heQtd <= 0) return` deixava `valor_total` antigo no estado — removido guard, sempre recalcula `valor_unitario` e zera `valor_total` quando `qty=0` |
| v4.53.8 | 2026-05-22 | Fix `recalcularPercentualSobreSalarioTodos` (Assiduidade/ATS): mesmo bug do guard acima — `qty=0` agora zera `valor_total` explicitamente em vez de retornar sem alterar |
| v4.58.1 | 2026-10-01 | Fix botão Imprimir/PDF do contracheque no grid (sem `onPrint`) → PDF oficial do servidor do funcionário |
| v4.58.0 | 2026-10-01 | **Sessão em cookie HttpOnly** + proteção CSRF; frontend sem token em storage (`authHeaders()`); 401 → login; fix Fórmulas (token inexistente); editar a própria senha não força troca |
| v4.57.1 | 2026-10-01 | **HOTFIX segurança**: `.htaccess` bloqueia acesso direto a todo `.php` exceto `index.php` (scripts como `create_saas_admin.php` eram executáveis sem login); removidos botões que abriam `fix_holidays.php` |
| v4.57.0 | 2026-10-01 | **Logout revoga token** (jti + `jwt_blacklist`); **troca de senha obrigatória** (1º acesso, reset, senha `123456`, admin de empresa nova); senha temporária aleatória; tela `/trocar-senha` + botão Alterar Senha |
| v4.56.0 | 2026-10-01 | Modal visual de alterações não salvas (Salvar e continuar / Sair sem salvar / Continuar editando) via `UnsavedChangesDialog` + ConfirmModal com ação extra; fix DsrModal (token inexistente → API autenticada) |
| v4.55.0 | 2026-10-01 | **Aviso de alterações não salvas** no grid (menu, competência, empresa, logout, beforeunload); **C4** sem fallback `id_empresa=1`; **A1** rate limit login fail-closed; IP anti-spoofing (Cloudflare ranges) |
| v4.54.1 | 2026-09-30 | **Gratificação (88) na base da HE 100%**; helper `calcBaseHE()`; competência FECHADA exibe snapshot salvo (só 59/1900 calculados) |
| v4.53.9 | 2026-06-09 | **IRRF completo Lei 15.270/2025:** redutor `978,62 − 0,133145 × RTM` aplicado sobre RTM (não BC); `DEDUCAO_DEPENDENTE` 203,77 → **189,59**; `DESCONTO_SIMPLIFICADO = 607,20` (MIN entre legal/simplificado); assinatura `calcularIRRF(rtm, inss, deps, ...)` atualizada em TS e PHP (FechamentoService, reports, pdf_relatorio); migration atualiza `VALOR_DEDUCAO_DEPENDENTE` no banco |

---

## 20. PENDÊNCIAS E BACKLOG (atualizado 2026-11-26 — Folha Bem Vindo v1.2.0)

| Item | Tipo | Observação |
|------|------|-----------|
| Rubricas e regras ainda pendentes (§0.6) | Cálculo | 2ª rodada enviada em 26/11/2026 (escritório E1–E15, Bem Vindo B1–B12) |
| Fechamento Expresso (`FechamentoService`) | Cálculo | Herdado; não deduz faltas nem trata estagiário — alinhar se for usado |
| Fase B: adiantamentos (vale dia 21, convênios compras/farmácia), saldo a pagar, pagamento banco/Pix/loja + conferência | Funcionalidade | Depende da P24 (contracheque × controle interno) |
| Status da competência em 6 etapas + perfis DP/contabilidade/diretor | Funcionalidade | Do documento de requisitos |
| Relatórios: resumo por setor, prestação ao diretor, pagamentos, relatório para contabilidade (HE em horas, faltas/atestados em dias) | Funcionalidade | Fases A–C |
| Retorno oficial da contabilidade e divergências | Funcionalidade | Depende da P26 |
| DNS `bemvindo.luzitec.cnt.br` | Infra | ✅ No ar desde 2026-11-26 (HTTPS Let's Encrypt OK) |
| client_id próprio do Google Drive no rclone | Infra | O compartilhado será desativado em 2026 (afeta backup do Bem Vindo e do CRM) |
| CEP da empresa; feriados municipais de Luziânia | Cadastro | Pendentes |
| Remover transição v4.58.0 (`Authorization` legado + token no corpo do login) | Segurança | Herdado |
| Apagar scripts `.php` soltos de `backend/v1/` | Segurança/limpeza | Já bloqueados (403); `setup_db.php` e `fix_password.php` são usados por rotas — revisar |
| CSP de Report-Only para enforced | Segurança | Herdado |
| Erro TS pré-existente em `FormulasView.tsx` | Tipagem | Não quebra o build |

---

*Este documento foi atualizado em 2026-11-26. Versão atual: FOLHA BEM VINDO v1.2.0 (base Frimelo v4.58.1).*
