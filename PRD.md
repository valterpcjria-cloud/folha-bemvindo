# PRD — Product Requirements Document
## Sistema FOLHA BEM VINDO — Folha de Pagamento do Supermercado Bem Vindo (fork da Folha Frimelo)

> **Versão:** 3.0 | **Data:** 2026-11-18 | **Status:** Em implantação — v1.1.0 no ar na VPS (aguardando DNS e respostas da contabilidade)
> **Proprietário do Produto:** Valter (operador/implantador) · **Cliente:** Supermercado Bem Vindo (Luziânia-GO)
> **Responsável Técnico:** Claude Code / Antigravity
> **Como ler:** a §0 é o produto Bem Vindo. As §1–§13 descrevem a base herdada da Frimelo, que o Bem Vindo aproveita ("não fugir da base do sistema existente; acrescentar o que eles pediram").

---

## 0. PRODUTO BEM VINDO

### 0.1 Fonte dos requisitos
- Documento "REQUISITOS-FOLHA-BEM-VINDO" (versão inicial, out/2026), lista de rubricas (`RUBRICAS-BEM-VINDO.xlsx`, 19 rubricas com códigos) e modelo da planilha de fechamento (8 blocos de setor). Arquivos do cliente ficam fora do repositório.
- **Premissa:** a contabilidade valida rubricas, incidências e cálculos e faz o fechamento oficial. Valores do sistema são prévia interna; o sistema deve importar o retorno oficial e apontar divergências.
- 30 perguntas enviadas ao escritório (P1–P30, 17/11/2026); respostas em preparação. Protótipo da Matriz do DP entregue para aprovação do DP/diretoria (usado como referência visual).

### 0.2 Saídas pedidas (a partir de uma base única de lançamentos)
1. **Matriz do DP** por setor e hierarquia, com subtotal por setor e custo por pessoa.
2. **Resumo mensal** por setor e geral (bruto, descontos, líquido, extras, adiantamentos, saldo, 13º/férias/rescisão, total por rubrica).
3. **Prestação de contas ao diretor** (saldo decomposto, por setor, quanto vai para banco/Pix/loja).
4. **Relação de pagamentos** alfabética por modalidade, planejado × autorizado × pago.
5. **Relatório para a contabilidade** alfabético (HE em horas, faltas/DSR e atestados em dias, R$ para gratificações/auxílios/descontos), em Excel/CSV/PDF.

### 0.3 Fases e andamento
| Fase | Escopo | Situação |
|------|--------|----------|
| A.1 | Setores, cargos com hierarquia, cadastro ampliado (nascimento, sexo, escolaridade, pagamento) | ✅ v1.0.0 |
| A.2 | Matriz de lançamentos por setor com subtotais | ✅ v1.0.0 |
| — | Marca Bem Vindo, Docker na VPS, backup diário | ✅ v1.0.0 / v1.1.0 |
| A.3 | Etiquetas do protótipo (nível, aniversário, admissão) e atestado em dias; padrão de insalubridade 0% | ✅ v1.1.0 |
| A.4 | Rubricas do Bem Vindo (HE 60%, adicional noturno, quebra de caixa, produtividade, VT, suspensão...) + relatório para contabilidade | ⏳ aguardando contabilidade |
| B | Adiantamentos (vale dia 21, convênios), saldo, pagamentos banco/Pix/loja, prestação ao diretor, status em 6 etapas, perfis DP/contabilidade/diretor | ⏳ depende da P24 |
| C | Retorno oficial da contabilidade e conciliação; 13º/férias/rescisão | ⏳ depende de P26/P29 |
| D | Indicadores (quadro H/M, absenteísmo, custo por setor, custo ÷ receita) | 🔜 |

### 0.4 Decisões já tomadas
- Mesmo escritório de contabilidade da Frimelo → reaproveitar códigos e layout de exportação onde o escritório confirmar.
- MariaDB em Docker na VPS da Luzitec (não Hostgator); o CRM da mesma VPS não pode ser afetado.
- Numeração própria a partir de 1.0.0. Funcionário novo começa com insalubridade/assiduidade 0% (v1.1.0).
- Dados bancários, filhos e informações médicas são restritos (LGPD): pagamento visível só para ADMIN/RH.
- Regras de cálculo novas só com resposta da contabilidade — nada por suposição.

---

## 1. VISÃO DO PRODUTO

### 1.1 Declaração de Visão

O **FOLHA FRIMELO** é uma plataforma SaaS de gestão de folha de pagamento desenvolvida especificamente para atender empresas do segmento industrial e comercial brasileiro, com conformidade à legislação CLT. O produto permite que departamentos de RH processem, calculem, fechem e exportem a folha de pagamento de seus colaboradores de forma rápida, segura e auditável — sem depender de sistemas ERP pesados ou contratar bureaux externos.

### 1.2 Missão

> _"Dar ao time de RH controle total sobre a folha de pagamento, com cálculos automáticos corretos, rastreabilidade completa e uma interface que qualquer analista consegue operar no primeiro dia."_

### 1.3 Posicionamento

| Dimensão | Posição |
|----------|---------|
| **Mercado-alvo** | Pequenas e médias empresas brasileiras (10–200 funcionários) |
| **Diferencial** | SaaS próprio, customizável, sem mensalidade de bureau, cálculos auditáveis |
| **Modelo** | Multi-tenant SaaS hospedado em domínio próprio |
| **Acesso** | Web — qualquer navegador, sem instalação |

---

## 2. CONTEXTO E PROBLEMA

### 2.1 Contexto

O Frigorífico Frimelo Ltda e a empresa Edvam Melo possuem processos de folha de pagamento com eventos específicos da categoria (insalubridade, horas extras, gratificações, prêmios), que exigem cálculos em cascata e exportação para sistema ERP externo. Antes do FOLHA FRIMELO, esses processos eram manuais ou dependiam de planilhas Excel suscetíveis a erro humano.

### 2.2 Problemas Resolvidos

| # | Problema | Impacto Antes |
|---|----------|--------------|
| P1 | Cálculo manual de HE, insalubridade e DSR propenso a erro | Erros trabalhistas, pagamentos incorretos |
| P2 | Planilhas sem controle de versão e sem auditoria | Impossível rastrear quem alterou o quê |
| P3 | Exportação manual para ERP com formatação inconsistente | Retrabalho, rejeição de arquivos pelo ERP |
| P4 | Falta de visibilidade gerencial dos custos de folha | Decisões sem dados confiáveis |
| P5 | Múltiplas empresas gerenciadas em sistemas separados | Esforço duplicado, inconsistência |
| P6 | Geração de contracheques em Word/Excel | Processo lento, visual não profissional |

### 2.3 Oportunidade

O RH das empresas precisa de uma ferramenta que automatize os cálculos legais brasileiros (CLT), permita lançamento ágil de eventos mensais, garanta auditabilidade e gere os arquivos de exportação no padrão exato do ERP utilizado — tudo numa interface web moderna e de fácil operação.

---

## 3. USUÁRIOS E PERSONAS

### 3.1 Mapa de Usuários

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIOS DO SISTEMA                   │
├────────────┬───────────┬──────────┬─────────┬───────────┤
│ SUPERADMIN │   ADMIN   │    RH    │ LEITURA │COLABORADOR│
├────────────┼───────────┼──────────┼─────────┼───────────┤
│ TI / Dono  │  Gerente  │ Analista │ Gestor  │Funcionário│
│ do sistema │ de RH /   │  de RH   │ /Diret. │  ativo    │
│            │ Contador  │          │         │           │
└────────────┴───────────┴──────────┴─────────┴───────────┘
```

### 3.2 Personas Detalhadas

---

**Persona 1 — Ana, Analista de RH (perfil: RH)**
- **Cargo:** Analista de Departamento Pessoal
- **Experiência:** 4 anos em RH, conhece CLT, usa planilhas no dia a dia
- **Frequência de uso:** Diária — especialmente no fechamento mensal
- **Tarefas principais:** Lançar eventos mensais (HE, faltas, gratificações), verificar cálculos, gerar contracheques
- **Frustrações:** Erros em fórmulas de planilha, ter que recalcular manualmente insalubridade e DSR
- **O que espera do sistema:** "Eu digito as horas e o sistema calcula tudo certo automaticamente"

---

**Persona 2 — Carlos, Gerente de RH / Contador (perfil: ADMIN)**
- **Cargo:** Gerente de RH ou Contador responsável pela folha
- **Experiência:** 10 anos, conhece legislação trabalhista e contabilidade
- **Frequência de uso:** Semanal — revisão e fechamento da folha
- **Tarefas principais:** Revisar lançamentos, fechar competência, exportar para ERP, acessar múltiplas empresas
- **Frustrações:** Ter que gerenciar duas empresas em sistemas diferentes, sem visibilidade consolidada
- **O que espera do sistema:** "Quero poder alternar entre Frimelo e Edvam Melo no mesmo sistema e exportar a folha pronta para o ERP"

---

**Persona 3 — Roberto, Diretor (perfil: LEITURA)**
- **Cargo:** Sócio-diretor ou gestor financeiro
- **Experiência:** Não é especialista em RH, mas precisa acompanhar custos
- **Frequência de uso:** Mensal — consulta de relatórios
- **Tarefas principais:** Ver dashboard de custos, total de folha, comparativos mensais
- **Frustrações:** Receber relatórios em Excel sem contexto visual
- **O que espera do sistema:** "Quero ver um gráfico claro de quanto custou a folha este mês comparado ao mês passado"

---

**Persona 4 — João, Colaborador (perfil: COLABORADOR)**
- **Cargo:** Funcionário da empresa
- **Experiência:** Uso básico de celular/computador
- **Frequência de uso:** Mensal — consulta do contracheque
- **Tarefas principais:** Visualizar e baixar seu contracheque
- **O que espera:** "Quero ver meu holerite sem precisar ir até o RH"

---

**Persona 5 — Valter, SaaS Admin (perfil: SUPERADMIN)**
- **Cargo:** Dono/administrador do sistema
- **Experiência:** Técnico — gerencia a plataforma inteira
- **Frequência de uso:** Quando necessário — configuração e manutenção
- **Tarefas principais:** Criar/gerenciar empresas, usuários, parâmetros, auditoria, limpeza de dados
- **O que espera:** "Quero controle total sobre tudo, ver logs de quem fez o quê e conseguir corrigir problemas de banco sem entrar no servidor"

---

## 4. OBJETIVOS E MÉTRICAS DE SUCESSO

### 4.1 Objetivos do Produto (OKRs)

**Objetivo 1: Eliminar erros de cálculo na folha de pagamento**
- KR1: 0% de divergências entre cálculo do sistema e conferência manual em HE, insalubridade e DSR
- KR2: 100% dos eventos de auto-cálculo aplicados corretamente no backend E no frontend

**Objetivo 2: Reduzir o tempo de fechamento mensal**
- KR1: Tempo de lançamento + exportação < 2 horas por competência
- KR2: Exportação para ERP gera arquivo aceito sem rejeições

**Objetivo 3: Garantir auditabilidade total**
- KR1: 100% das alterações de folha registradas em `logs_auditoria`
- KR2: Qualquer alteração pode ser rastreada até o usuário e timestamp

**Objetivo 4: Suportar crescimento multi-empresa**
- KR1: Um único ADMIN consegue operar Frimelo e Edvam Melo sem logout
- KR2: Dados de empresas diferentes nunca se cruzam

### 4.2 Indicadores de Saúde do Produto

| Métrica | Meta |
|---------|------|
| Uptime da aplicação | > 99% |
| Tempo de resposta da API | < 1s para lançamentos |
| Zero erros FATAL_BOOT_ERROR em produção | ✅ |
| Cobertura de eventos obrigatórios CLT | 100% |

---

## 5. ESCOPO DO PRODUTO — FUNCIONALIDADES

### 5.1 Módulo: Autenticação e Acesso

**REQ-AUTH-01** — Login por email e senha com JWT (4h de sessão)
**REQ-AUTH-02** — Logout automático por inatividade (60 minutos)
**REQ-AUTH-03** — Rate limiting no login: máximo 5 tentativas por minuto por IP
**REQ-AUTH-04** — RBAC com 5 perfis: SUPERADMIN, ADMIN, RH, LEITURA, COLABORADOR
**REQ-AUTH-05** — Usuários ADMIN e SUPERADMIN podem trocar contexto de empresa sem fazer novo login
**REQ-AUTH-06** — Sessão em cookie HttpOnly + SameSite=Strict (v4.58.0); o navegador guarda só nome/perfil em `sessionStorage`. Cookie de sessão: encerra ao fechar o navegador
**REQ-AUTH-07** — Logout invalida a sessão no servidor imediatamente (v4.57.0)
**REQ-AUTH-08** — Troca de senha obrigatória antes de usar o sistema: usuário novo, senha definida por outra pessoa, senha `123456`, admin de empresa nova (v4.57.0)
**REQ-AUTH-09** — Qualquer usuário pode alterar a própria senha ("Alterar Senha" no menu). Regra: mín. 8 caracteres, letras e números, diferente da atual

---

### 5.2 Módulo: Funcionários

**REQ-FUNC-01** — Cadastro de funcionários com: nome, CPF, cargo, data de admissão, centro de custo, departamento, local, empresa_codigo, id_contrato, **salário_base** (v4.52.0)
**REQ-FUNC-02** — Status de funcionário: ATIVO, DESLIGADO, AFASTADO
**REQ-FUNC-03** — Tipo de contrato: CLT, PJ, Estágio, Outro
**REQ-FUNC-04** — Listagem com filtros por status e busca por nome
**REQ-FUNC-05** — Importação de funcionários via planilha
**REQ-FUNC-06** — Isolamento por empresa: funcionários de empresas diferentes nunca aparecem juntos
**REQ-FUNC-07** — Unique key `(id_contrato, id_empresa)` — mesmo contrato pode existir em empresas diferentes
**REQ-FUNC-08** — **Salário Base obrigatório** (v4.52.0): campo do tipo monetário com máscara R$, alimenta automaticamente a rubrica 33 nas competências ABERTAS. Backend valida `> 0`. Salário só pode ser alterado pelo cadastro — rubrica 33 é travada no grid de lançamentos.
**REQ-FUNC-09** — **Salário proporcional na admissão** (v4.52.10): se a `data_admissao` cair dentro do mês/ano da competência aberta, o salário pago é calculado proporcionalmente aos dias trabalhados (CLT mês comercial 30 dias): `(30 - dia_admissao + 1) / 30 × salario_base`

---

### 5.3 Módulo: Eventos de Folha (Rubricas)

**REQ-EVT-01** — Eventos com atributos: código, nome, tipo (CRÉDITO/DÉBITO/INFORMATIVO), natureza (PROVENTO/DESCONTO/BASE), unidade (VALOR/HORA/DIA/PERCENTUAL), obrigatoriedade
**REQ-EVT-02** — Flags de incidência: incide_inss, incide_fgts, incide_irrf
**REQ-EVT-03** — Ordem de exportação configurável (define sequência nas planilhas exportadas)
**REQ-EVT-04** — Eventos são globais (não por empresa) — compartilhados entre todos os tenants
**REQ-EVT-05** — Criação e edição restrita a ADMIN e RH
**REQ-EVT-06** — Eventos obrigatórios protegidos contra exclusão

**Eventos Obrigatórios Mínimos:**
33 (Salário), 35 (INSS), 48 (HE 50%), 49 (HE 100%), 59 (DSR), 62 (Insalubridade), 71 (Faltas), 99 (FGTS), 833 (Assiduidade), 1000 (Adic. Tempo de Serviço), 1080 (Feriado Trabalhado), **1900 (FGTS Visual)**, **1920 (IRRF)**

> Rubrica 36 (IRRF legado) foi substituída pela 1920 em v4.53.0 e está depreciada.

---

### 5.4 Módulo: Competências

**REQ-COMP-01** — Competência = período mensal de referência da folha (mês + ano)
**REQ-COMP-02** — Status: ABERTA ou FECHADA
**REQ-COMP-03** — Apenas competências ABERTAS aceitam lançamentos
**REQ-COMP-04** — Fechamento de competência exige justificativa (campo `justificativa_status`)
**REQ-COMP-05** — Unique key `(mes, ano, id_empresa)` — cada empresa tem sua própria competência
**REQ-COMP-06** — Ao trocar de competência no grid, todos os cálculos são recalculados para o novo período

---

### 5.5 Módulo: Lançamentos (Grid Principal) ⭐ Core do Produto

**REQ-LANC-01** — Grid tabular: funcionários nas linhas × eventos nas colunas
**REQ-LANC-02** — Células editáveis: quantidade, valor_unitário ou valor_total (dependendo da unidade do evento)
**REQ-LANC-03** — Auto-cálculo em tempo real ao digitar:

| Evento | Trigger | Cálculo |
|--------|---------|---------|
| **Salário (33)** | (travado — vem do cadastro) | `salario_base × dias_trabalhados/30` se admissão no mês, senão integral |
| HE 100% (49) | quantidade (HH:MM) | `(Salário 33 + Gratificação 88 + Insalubridade 62) / 220 × 2 × qtd` (Gratificação desde v4.54.1) |
| Insalubridade (62) | quantidade(%) | `max(0, SalMín − Faltas) / 100 × qtd` |
| **Prêmio Assiduidade (833)** | quantidade(%) | `Salário do funcionário / 100 × qtd` ⚠️ v4.52.5 (mudou) |
| **Adic. Tempo de Serviço (1000)** | quantidade(%) | `Salário do funcionário / 100 × qtd` ⚠️ v4.52.7 (mudou) |
| Faltas (71) | quantidade | `Salário / 30 × qtd` |
| Feriado (1080) | quantidade | `Salário / 30 × qtd` |
| DSR 59 | cascata automática | `(ΣHE / dias_úteis) × dias_DSR` (considerando feriados, v4.52.2) |
| **INSS (35)** | (travado — auto sempre) | Tabela progressiva oficial 2026 sobre proventos com `incide_inss`, deduzindo Faltas ⚠️ v4.52.11/v4.53.5 |
| **IRRF (1920)** | (travado — auto sempre) | Lei 15.270/2025: tabela progressiva 2026, redutor sobre RTM, MIN(legal, simplificado) ⚠️ v4.53.0/v4.53.9 |
| **FGTS Visual (1900)** | (travado — auto sempre) | 8% sobre base FGTS — informativo ⚠️ v4.53.0 |

**REQ-LANC-04** — Cascatas em tempo real:
- Alterar **Insalubridade (62)** → recalcula HE 100% (49) → DSR (59) → INSS (35) → IRRF (1920) → FGTS Visual (1900)
- Alterar **Faltas (71)** → recalcula Insalubridade (62) → HE 100% (49) → DSR (59) → INSS (35) → IRRF (1920) → FGTS Visual (1900)
- Alterar **qualquer provento** → recalcula INSS (35) → IRRF (1920) → FGTS Visual (1900) automaticamente (v4.52.11/v4.53.0)

**REQ-LANC-05** — DSR (rubrica 59) é um campo virtual — exibido na grade mas NUNCA persistido no banco
**REQ-LANC-06** — Totais por funcionário: proventos, descontos, líquido — calculados em tempo real (incluindo INSS deduzido a partir de v4.52.11)
**REQ-LANC-07** — Total global da folha visível no rodapé do grid
**REQ-LANC-08** — Botão "Salvar" envia TODA a folha em bulk para o backend
**REQ-LANC-09** — Após salvar, a grade recarrega do banco (confirma persistência) e recalcula a cadeia inteira
**REQ-LANC-10** — Feedback visual: loading spinner, mensagem de sucesso/erro, timestamp da última gravação
**REQ-LANC-11** — Competência fechada = grade somente leitura; backend bloqueia escrita em `saveBulk` (v4.52.10)
**REQ-LANC-12** — **Células travadas (read-only)** com ícone de cadeado:
  - Rubrica 33 (Salário) — alimentada pelo cadastro do funcionário
  - Rubrica 35 (INSS) — calculada pela tabela progressiva 2026 (amber)
  - Rubrica 59 (DSR) — calculada virtualmente
  - Rubrica 1920 (IRRF) — calculada automaticamente Lei 15.270/2025 (amber) ⚠️ v4.53.0
  - Rubrica 1900 (FGTS Visual) — informativo 8% (indigo) ⚠️ v4.53.0
**REQ-LANC-13** — **Inputs especializados:**
  - Unidade HORA (HE 50%, HE 100%): formato HH:MM, máscara automática (v4.52.3/4)
  - Rubricas 88, 191, 936, 4004 (valores monetários): máscara R$ automática (v4.52.6/9)
**REQ-LANC-14** — **Rubricas descontinuadas** (v4.52.8): 719 (Prêmio Domingo), 883 (Pontualidade), 1080 (Feriado Trabalhado) — colunas ocultas em competências sem lançamento. Visíveis somente quando há dados históricos para preservar auditoria.

---

### 5.6 Módulo: Exportação

**REQ-EXP-01** — Exportação em 3 formatos: **XLSX**, **TXT** (padrão ERP), **CSV**
**REQ-EXP-02** — Seleção de competência e empresa antes de exportar
**REQ-EXP-03** — Ordenação dos eventos por `ordem_exportacao`
**REQ-EXP-04** — Lógica de quantidade vs. valor por tipo de evento:
  - Unidade HORA ou PERCENTUAL → exporta `quantidade`
  - Rubrica 71 (Faltas) → exporta `quantidade` (dias), não valor monetário
  - Demais → exporta `valor_total`
**REQ-EXP-05** — Formato TXT: campos fixos, vírgula como separador decimal, codificação compatível com ERP
**REQ-EXP-06** — Arquivo gerado com nome padrão: `folha_EMPRESA_MES_ANO.ext`

---

### 5.7 Módulo: Importação

**REQ-IMP-01** — Importação de planilha XLSX com lançamentos em bulk
**REQ-IMP-02** — Mapeamento de colunas: funcionario_id, evento_id/codigo_evento, quantidade, valor_total
**REQ-IMP-03** — Backend recalcula automaticamente eventos de auto-cálculo na importação (HE, Faltas, Insalubridade)
**REQ-IMP-04** — Relatório de erros/ignorados após importação
**REQ-IMP-05** — Operação transacional: falha reverte tudo (sem importação parcial)

---

### 5.8 Módulo: Contracheques (Holerites)

**REQ-HOLERITE-01** — Visualização de contracheque individual por funcionário e competência
**REQ-HOLERITE-02** — Layout visual profissional com: cabeçalho empresa, dados funcionário, tabela proventos/descontos, totais, líquido
**REQ-HOLERITE-03** — Impressão/download em PDF (gerado via html2canvas + jsPDF no frontend, ou TCPDF no backend)
**REQ-HOLERITE-04** — Impressão em lote de todos os contracheques de uma competência
**REQ-HOLERITE-06** — Pré-visualização no grid de Lançamentos com botão "Imprimir / PDF" gerando o PDF oficial do funcionário (v4.58.1); exige folha salva
**REQ-HOLERITE-05** — Portal do Colaborador: funcionário acessa apenas o próprio contracheque via login com perfil COLABORADOR

---

### 5.9 Módulo: Fechamento Expresso

**REQ-FECH-01** — Snapshot da folha ao fechar competência (snapshot imutável para auditoria)
**REQ-FECH-02** — Processo de fechamento: PENDENTE → PROCESSANDO → CONCLUÍDO ou ERRO
**REQ-FECH-03** — Fechamento bloqueia novos lançamentos na competência
**REQ-FECH-04** — Reabertura de competência exige ADMIN e justificativa

---

### 5.10 Módulo: Feriados

**REQ-FER-01** — Cadastro de feriados nacionais, estaduais e municipais
**REQ-FER-02** — Feriados são por empresa (cada tenant tem sua lista)
**REQ-FER-03** — Feriados influenciam o cálculo de dias úteis e dias DSR da competência
**REQ-FER-04** — Pré-carga de feriados nacionais obrigatórios

---

### 5.11 Módulo: Relatórios e Dashboard

**REQ-REL-01** — Dashboard com KPIs: total de funcionários ativos, custo total da folha, competência atual, total de lançamentos
**REQ-REL-02** — Gráfico de evolução de custo mensal (série histórica)
**REQ-REL-03** — Gráfico de custo por centro de custo/departamento
**REQ-REL-04** — Comparativo entre competências
**REQ-REL-05** — Filtro por empresa (ADMIN/SUPERADMIN)
**REQ-REL-06** — Espelho da folha em PDF (relatório gerencial completo)
**REQ-REL-07** — Análise via IA (OpenAI) com insights automáticos sobre a folha

---

### 5.12 Módulo: Parâmetros do Sistema

**REQ-PARAM-01** — Parâmetros por empresa: RAZAO_SOCIAL, CNPJ, TETO_INSS, ALIQUOTA_FGTS, FAIXA_ISENCAO_IRRF, VALOR_DEDUCAO_DEPENDENTE
**REQ-PARAM-02** — Edição restrita a SUPERADMIN
**REQ-PARAM-03** — Parâmetros usados nos cálculos de INSS e IRRF

---

### 5.13 Módulo: Usuários (Gestão de Acesso)

**REQ-USR-01** — CRUD completo de usuários (SUPERADMIN)
**REQ-USR-02** — Perfis: SUPERADMIN, ADMIN, RH, LEITURA, COLABORADOR
**REQ-USR-03** — Um usuário pertence a uma empresa (id_empresa)
**REQ-USR-04** — Nenhum usuário não-SUPERADMIN pode criar ou promover outro usuário a SUPERADMIN
**REQ-USR-05** — Usuário pode ser desativado (ativo=0) sem ser deletado
**REQ-USR-06** — Senha com bcrypt, alteração de senha disponível
**REQ-USR-07** — Usuário criado sem senha recebe senha temporária aleatória, exibida uma única vez ao superadmin (v4.57.0). Sem senha padrão fixa
**REQ-USR-08** — Usuário de empresa cliente deve ter perfil RH (ADMIN enxerga todas as empresas por regra de negócio)

---

### 5.14 Módulo: Gestão SaaS (Empresas)

**REQ-SAAS-01** — Cadastro de novas empresas com: razão social, CNPJ, slug, UF, cidade, plano, limite de funcionários
**REQ-SAAS-02** — Ao criar empresa, o sistema faz seeding automático de parâmetros padrão e usuário ADMIN inicial
**REQ-SAAS-03** — Listagem de empresas com estatísticas (nº funcionários, nº usuários)
**REQ-SAAS-04** — Proteção: empresa ID=1 (Frimelo) não pode ser deletada
**REQ-SAAS-05** — Exclusão de empresa remove todos os dados associados em cascata

---

### 5.15 Módulo: Auditoria

**REQ-AUDIT-01** — Toda ação relevante gera log: LOGIN, IMPORTAÇÃO, LANÇAMENTO, ALTERAÇÃO, EXCLUSÃO, FECHAMENTO
**REQ-AUDIT-02** — Log inclui: usuário, empresa, entidade, entidade_id, ação, detalhes, timestamp
**REQ-AUDIT-03** — Visualização de logs com filtros por data, usuário, ação (SUPERADMIN)
**REQ-AUDIT-04** — Logs são imutáveis (sem edição ou exclusão via interface)

---

### 5.16 Módulo: DSR Avançado

**REQ-DSR-01** — Cálculo DSR simples (Rubrica 59 virtual): `(ΣHE / dias_úteis) × dias_DSR`
**REQ-DSR-02** — Cálculo DSR detalhado: considera HE, comissões, valores variáveis e faltas que reduzem o DSR
**REQ-DSR-03** — Dias úteis e dias DSR calculados por competência (considerando feriados cadastrados)
**REQ-DSR-04** — Rubrica 59 sempre recalculada no carregamento — nunca lida do banco
**REQ-DSR-05** — Configuração de rubricas-fonte DSR extensível (`DSR_HE_CONFIG`)

---

## 6. REQUISITOS NÃO-FUNCIONAIS

### 6.1 Performance
| Requisito | Meta |
|-----------|------|
| Carregamento inicial da folha | < 3 segundos |
| Save bulk (folha completa) | < 5 segundos |
| Exportação XLSX | < 10 segundos |
| API response time (queries simples) | < 500ms |

### 6.2 Segurança
| Requisito | Implementação |
|-----------|--------------|
| Autenticação | JWT HS256 (header `alg`/`typ` validados desde v4.51.0), expira em 4h, `jti` revogável no logout (v4.57.0), transportado em cookie HttpOnly (v4.58.0) |
| Senhas | bcrypt; política mín. 8 + letras + números; troca obrigatória quando aplicável (v4.57.0) |
| SQL Injection | PDO prepared statements em 100% das queries |
| XSS | Sanitização no backend (InputSanitizer), escaping React no frontend |
| CSRF | Cookie SameSite=Strict + header `X-Requested-With` obrigatório em alterações via cookie (v4.58.0) |
| CORS | Whitelist de origens em produção |
| Rate Limiting | 5 tentativas/min por IP no login, fail-closed; IP à prova de falsificação (v4.55.0) |
| Tenant Isolation | id_empresa em todas as queries — sem vazamento de dados entre empresas |
| Headers HTTP | X-Frame-Options: **DENY** (v4.51.0), X-XSS-Protection, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (HTTPS), CSP Report-Only (v4.51.0) |
| Endpoints Administrativos | `fix_password` exige SUPERADMIN + SETUP_KEY (v4.51.0). **v4.57.1:** nenhum `.php` solto é acessível pela URL — só o roteador autenticado |
| Segredos | `.env` não versionado no git; rotação periódica via painel da Hostgator (v4.51.0) |

### 6.3 Usabilidade
- Interface "Premium SaaS" com design consistente (TailwindCSS)
- Feedback visual imediato em todas as ações (loading, sucesso, erro)
- Componentes responsivos — funciona em desktop e tablet
- Ícones Lucide para affordance visual
- Mensagens de erro em português, claras e acionáveis

### 6.4 Confiabilidade
- Transações atômicas: importações em bulk são transacionais (tudo ou nada)
- Fallback local: dias úteis calculados localmente se o backend não responder
- ErrorBoundary: erros React não quebram toda a aplicação
- FATAL_BOOT_ERROR prevenido: `index.html` com `no-cache` via `.htaccess`

### 6.5 Compatibilidade
- Browsers: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- Backend: PHP 8.0+, MySQL 5.7+ / MariaDB 10.3+
- Hosting: Shared hosting (Hostgator) — sem Docker, sem SSH, sem CLI

### 6.6 Manutenibilidade
- Migrações de banco versionadas em `backend/migrations/`
- Constantes espelhadas entre frontend (`constants/payroll.ts`) e backend (`PayrollConstants.php`)
- Código com máximo 300 linhas por componente React
- SPEC.md e PRD.md atualizados a cada versão major

---

## 7. ARQUITETURA DE ALTO NÍVEL

```
┌─────────────────────────────────────────────────────────────┐
│                     USUÁRIO (Browser)                        │
│           React 18 SPA — dist/ servido pelo Apache           │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS + JWT + X-Company-Context
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND PHP 8 (Hostgator Shared)                │
│  index.php → Router → auth.php → routes/*.php → services/   │
│                         ▼                                    │
│              LancamentoService (core da folha)               │
│              DsrService | FechamentoService                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ PDO
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              MySQL / MariaDB (Hostgator)                     │
│   empresas → funcionarios → lancamentos_eventos              │
│            → competencias → eventos_folha                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. FLUXOS PRINCIPAIS DE USUÁRIO

### 8.1 Fluxo: Processamento Mensal da Folha

```
1. Analista de RH acessa /lancamentos
2. Seleciona a competência do mês (ex: Março/2026)
3. Sistema carrega funcionários e lançamentos do banco
4. Sistema recalcula HE (com insalubridade) e DSR automaticamente
5. Analista digita as quantidades dos eventos variáveis:
   - Horas extras trabalhadas
   - Dias de falta
   - Percentual de insalubridade
   - Gratificações, prêmios, descontos
6. Sistema recalcula valores em tempo real enquanto digita
7. Analista revisa totais por funcionário
8. Clica em "Salvar"
9. Backend recalcula e persiste todos os lançamentos
10. Frontend recarrega e confirma os valores gravados
11. Analista acessa /exportar
12. Seleciona formato (XLSX/TXT/CSV) e exporta
13. Arquivo exportado para o ERP
```

### 8.2 Fluxo: Fechamento de Competência

```
1. ADMIN acessa /competencias
2. Seleciona a competência ABERTA
3. Clica em "Fechar Competência"
4. Digita justificativa obrigatória
5. Sistema gera snapshot imutável (fechamento_expresso)
6. Competência muda status para FECHADA
7. Grid de lançamentos passa a ser somente leitura
```

### 8.3 Fluxo: Colaborador Consultando Holerite

```
1. Colaborador acessa /login com suas credenciais
2. Sistema identifica perfil COLABORADOR
3. Redireciona para /portal
4. Portal exibe contracheques disponíveis do colaborador
5. Colaborador seleciona competência e visualiza/baixa PDF
```

### 8.4 Fluxo: ADMIN Gerenciando Múltiplas Empresas

```
1. ADMIN faz login (token gerado para empresa padrão)
2. No header, seleciona "Edvam Melo" no seletor de empresa
3. Frontend armazena id=2 em companyContextId
4. Todas as requisições passam X-Company-Context: 2
5. Backend valida e usa id_empresa=2 em todas as queries
6. ADMIN vê funcionários, lançamentos e dados da Edvam Melo
7. Para voltar à Frimelo, seleciona "Minha Empresa (Padrão)"
8. Frontend para de enviar X-Company-Context
9. Backend usa id_empresa do token (Frimelo)
```

---

## 9. DECISÕES DE PRODUTO (RATIONALE)

### Por que PHP Puro (sem Laravel/Symfony)?
O sistema roda em Hostgator shared hosting, que tem restrições de memória, tempo de execução e não suporta instalação de dependências via Composer facilmente. PHP puro com PDO garante compatibilidade total e performance adequada sem overhead de framework.

### Por que a Rubrica 59 (DSR) não é salva no banco?
O DSR é um valor derivado matematicamente das HE e dos dias do calendário. Salvá-lo criaria duplicidade e risco de inconsistência (DSR salvo desatualizado em relação às HE). A abordagem de recalcular sempre garante que o valor exibido seja sempre o correto.

### Por que o `id_empresa` NÃO faz parte da UNIQUE KEY de `lancamentos_eventos`?
A estrutura de negócio garante que um funcionário pertence a uma única empresa. Portanto, `(funcionario_id, competencia_id, evento_id)` é suficiente para unicidade. Incluir `id_empresa` na UK seria redundante e poderia permitir duplicatas de um funcionário em duas empresas (que é impossível dado que `funcionarios.id_empresa` já isola).

### Por que `X-Company-Context` em header e não no JWT?
O JWT expira em 4h. Trocar de empresa implicaria gerar um novo token a cada troca, forçando re-autenticação. O header de contexto permite a troca instantânea sem invalidar a sessão, com segurança garantida pelo RBAC (apenas ADMIN/SUPERADMIN podem usar o header).

### Por que `codigo_evento` deve ser enviado no payload de save?
O backend precisa saber qual é o evento para aplicar a regra de auto-cálculo correta. O `evento_id` é a PK do banco (número sequencial), mas o `codigo_evento` é o identificador de negócio (ex: 49 = HE 100%). Enviar ambos garante que o backend calcule corretamente independente de como os IDs do banco estão configurados.

---

## 10. RESTRIÇÕES E PREMISSAS

### 10.1 Restrições Técnicas
- **Hosting compartilhado:** Sem acesso SSH em produção, sem Docker, sem Redis, sem WebSockets
- **PHP Shared:** Sem Composer em produção — bibliotecas são vendored localmente (TCPDF em `lib/tcpdf/`)
- **Deploy manual:** Upload de ZIP via cPanel — sem CI/CD automatizado
- **MySQL compartilhado:** Sem stored procedures com DELIMITER (PDO não suporta). Migrations usam Single-Statement
- **Memória:** Operações pesadas (importação bulk) devem ser otimizadas para não ultrapassar limite de memória do hosting

### 10.2 Premissas de Negócio
- Funcionários são exclusivamente CLT (regime principal)
- Salário Mínimo de referência: R$ 1.621,00 (2026) — constante hardcoded, atualizado por versão
- Carga horária padrão CLT: 220 horas/mês
- Insalubridade calculada sobre `max(0, Salário Mínimo − Faltas)` — se não houver faltas, usa SalMin cheio (v4.50.4)
- HE 100% sempre calculada sobre `Salário + Insalubridade` (conforme categoria)
- Cada empresa tem suas próprias competências — não há folha consolidada entre empresas

### 10.3 Premissas de Usuário
- Usuários têm acesso confiável à internet
- Operação feita em computador desktop/notebook (tela mínima ~1280px)
- Analista de RH conhece as rubricas da folha — o sistema não faz tutoriais interativos

---

## 11. FORA DO ESCOPO (OUT OF SCOPE)

Os seguintes itens estão fora do escopo atual do produto:

| Item | Motivo |
|------|--------|
| ~~Cálculo automático de INSS/IRRF~~ | ✅ **Implementado:** INSS (v4.52.11) e IRRF (v4.53.0/v4.53.9) são auto-calculados no grid |
| e-Social / eSocial integration | Complexidade regulatória — roadmap futuro |
| App mobile nativo | Web responsiva atende a necessidade atual |
| Folha de Férias automatizada | Tabela `ferias` existe, mas cálculo não implementado |
| Módulo de ponto eletrônico | Integração externa |
| Cálculo de 13º salário automático | Roadmap futuro |
| Múltiplos usuários editando simultaneamente (Real-time sync) | Sem WebSockets no hosting compartilhado |
| Integração bancária para pagamentos | Fora do escopo do produto |

---

## 12. ROADMAP SUGERIDO

### Fase Atual (Produção — v4.58.x)
- ✅ Grid de lançamentos com auto-cálculo
- ✅ Exportação XLSX/TXT/CSV
- ✅ Multi-tenant com troca de empresa para ADMIN e SUPERADMIN (v4.50.3)
- ✅ Contracheques em PDF
- ✅ Auditoria completa
- ✅ DSR calculado virtualmente, considerando **feriados** da Gestão de Feriados (v4.52.2)
- ✅ Cascata completa: Salário → Assiduidade → AdicTempoServico → Insalub → HE → DSR → INSS
- ✅ Rubrica 1000 — Adicional de Tempo de Serviço (v4.50.4 + v4.52.7)
- ✅ Security Hardening Deploy 1 (v4.51.0): endpoints admin protegidos, JWT endurecido, CSP/HSTS
- ✅ **Salário no cadastro do funcionário** — fonte única, rubrica 33 travada (v4.52.0)
- ✅ **Salário proporcional na admissão** — CLT mês comercial 30 dias (v4.52.10)
- ✅ **INSS auto-calculado pela tabela progressiva 2026** em todos os pontos (grid, contracheque, PDFs, relatórios) — v4.52.11–17
- ✅ **Inputs especializados:** HH:MM para horas (v4.52.3/4), máscara R$ para valores (v4.52.6/9)
- ✅ Rubricas descontinuadas com hide condicional (v4.52.8)
- ✅ **IRRF auto-calculado no grid** (rubrica 1920) — Lei 15.270/2025 com isenção R$ 5k, redutor sobre RTM, MIN(legal/simplificado) — v4.53.0/v4.53.9
- ✅ **FGTS Visual (1900)** — rubrica informativa 8% travada no grid — v4.53.0
- ✅ **DEDUCAO_DEPENDENTE = R$ 189,59** + **DESCONTO_SIMPLIFICADO = R$ 607,20** — v4.53.9
- ✅ Fix modal cadastro funcionários (botões visíveis) — v4.53.4
- ✅ INSS/IRRF deduzem Faltas da base — v4.53.5
- ✅ Recálculo forçado antes de salvar; stale value guard removido — v4.53.6/7/8

- ✅ **HE 100% com Gratificação (88) na base** + competência fechada exibe snapshot salvo — v4.54.1
- ✅ **Aviso de alterações não salvas** (modal com "Salvar e continuar") — v4.55.0/v4.56.0
- ✅ Botão Imprimir/PDF do contracheque no grid — v4.58.1

### Security Hardening
- ✅ **Deploy 2** (v4.55.0): sem fallback `id_empresa=1`, RateLimiter fail-closed, IP anti-spoofing
- ✅ **Deploy 3** (v4.57.0–v4.58.0): logout revoga token, troca de senha obrigatória, senha temporária aleatória, sessão em cookie HttpOnly + CSRF
- ✅ **Hotfix v4.57.1:** scripts de manutenção bloqueados (eram executáveis sem login)
- ⚪ `usuarios_empresas` (C3): não se aplica — ADMIN multi-empresa é regra de negócio
- 🔲 CSP enforced; remover modo de transição da v4.58.0; apagar scripts PHP soltos

### Próxima Fase (v4.6x)
- 🔲 Comparativo mensal de folha no dashboard
- 🔲 Importação com validação prévia (preview antes de confirmar)
- 🔲 Notificações de fechamento de competência

### Fase Futura (v5.x)
- 🔲 Módulo de Férias (cálculo automático de 13º, período aquisitivo)
- 🔲 Módulo de Rescisão (cálculo automático de verbas rescisórias)
- 🔲 Portal do Colaborador expandido (banco de horas, documentos)
- 🔲 Integração eSocial
- 🔲 API pública para integração com outros ERPs

---

## 13. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **Competência** | Período mensal de referência da folha (ex: Março/2026) |
| **Rubrica** | Evento de folha identificado por um código numérico (ex: rubrica 49 = HE 100%) |
| **Lançamento** | Registro do valor de uma rubrica para um funcionário em uma competência |
| **DSR** | Descanso Semanal Remunerado — acréscimo sobre valores variáveis (HE, comissões) |
| **HE** | Horas Extras |
| **Insalubridade** | Adicional pago a trabalhadores expostos a agentes nocivos (% sobre salário mínimo) |
| **Auto-cálculo** | Eventos cujo valor é computado automaticamente pelo sistema com base em fórmulas legais |
| **Bulk Save** | Gravação de todos os lançamentos da folha em uma única operação transacional |
| **Tenant** | Empresa cliente do SaaS (Frimelo, Edvam Melo) |
| **ERP** | Sistema externo de gestão (para onde a folha é exportada) |
| **Espelho da Folha** | Relatório PDF com todos os lançamentos de uma competência |
| **Fechamento** | Ato de encerrar uma competência, tornando-a imutável |
| **Snapshot** | Registro imutável do estado da folha no momento do fechamento |
| **RBAC** | Role-Based Access Control — controle de acesso baseado em perfis |
| **JWT** | JSON Web Token — padrão de autenticação stateless |

---

| **Adicional Tempo de Serviço** | Rubrica percentual sobre o Salário Mínimo (código 1000). Exporta apenas a % |

---

*Este PRD foi atualizado em 2026-10-01. Versão atual do produto: FOLHA FRIMELO v4.58.1.*
