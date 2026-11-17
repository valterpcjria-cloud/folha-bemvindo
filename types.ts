
export enum EventType {
  CREDITO = 'CREDITO',
  DEBITO = 'DEBITO',
  INFORMATIVO = 'INFORMATIVO'
}

export enum Natureza {
  PROVENTO = 'PROVENTO',
  DESCONTO = 'DESCONTO',
  BASE = 'BASE',
  OUTRO = 'OUTRO'
}

export enum Unidade {
  VALOR = 'VALOR',
  HORA = 'HORA',
  DIA = 'DIA',
  UNIDADE = 'UNIDADE',
  PERCENTUAL = 'PERCENTUAL'
}

export enum StatusFuncionario {
  ATIVO = 'ATIVO',
  DESLIGADO = 'DESLIGADO',
  AFASTADO = 'AFASTADO'
}

export enum StatusCompetencia {
  ABERTA = 'ABERTA',
  FECHADA = 'FECHADA'
}

export interface Funcionario {
  id: number;
  id_contrato: number;
  nome: string;
  cpf?: string;
  status: StatusFuncionario;
  cargo?: string;
  data_admissao?: string;
  cbo?: string;
  empresa_codigo?: string;
  local?: string;
  departamento?: string;
  salario_base?: number; // v4.52.0: fonte única do salário; alimenta rubrica 33 em competências abertas
  insalubridade_perc?: number;      // v4.52.20: % insalubridade (padrão 20%)
  assiduidade_perc?: number;        // v4.52.20: % assiduidade (padrão 11%)
  adic_tempo_servico_perc?: number; // v4.52.20: % adicional tempo serviço (padrão 0%)
  mensalidade_sindical?: number;    // v4.52.20: valor fixo R$ mensalidade sindical
  emprestimo_consignado?: number;   // v4.52.20: valor fixo R$ empréstimo consignado
  dep_ir?: number;                  // v4.53.x: número de dependentes para dedução IRRF
  gratificacao?: number;            // v4.53.10: valor fixo R$ gratificação
}

export interface EventoFolha {
  id: number;
  codigo_evento: number;
  nome_evento: string;
  tipo: EventType;
  natureza: Natureza;
  unidade: Unidade;
  obrigatorio: boolean;
  ordem_exportacao: number;
  incide_inss?: boolean;
  incide_fgts?: boolean;
  incide_irrf?: boolean;
}

export interface Competencia {
  id: number;
  mes: number;
  ano: number;
  status: StatusCompetencia;
  justificativa_status?: string;
}

export interface Lancamento {
  id: number;
  funcionario_id: number;
  competencia_id: number;
  evento_id: number;
  quantidade?: number;
  valor_unitario?: number;
  valor_total: number;
}

export interface AuditLog {
  id: number;
  usuario: string;
  empresa?: string;
  acao: string;
  entidade: string;
  detalhes: string;
  data: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: 'SUPERADMIN' | 'ADMIN' | 'RH' | 'LEITURA';
  id_empresa: number;
}

// Interfaces adicionais para type safety

export type UserPerfil = 'SUPERADMIN' | 'ADMIN' | 'RH' | 'COLABORADOR' | 'LEITURA';

export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: UserPerfil;
  id_empresa: number;
  ativo?: number;
  must_change_password?: boolean; // v4.57.0: troca de senha obrigatória antes de usar o sistema
}

export interface ServerInfo {
  connected: boolean;
  ip: string;
  db: string;
}

export interface AIAnalysisResult {
  alerts: string[];
  insights: string[];
  summary: string;
}

export interface DashboardStats {
  total_funcionarios: number;
  custo_total: number;
  competencia: string;
  total_lancamentos: number;
  status_competencia?: string;
}

// -- Novas Estruturas para DSR --

export interface DsrCalculado {
  id?: number;
  funcionario_id: number;
  competencia_id: number;
  mes: number;
  ano: number;
  dias_uteis_mes: number;
  dias_dsr_mes: number;
  faltas_pre_dsr_qtd: number;
  dsr_horas_extras: number;
  dsr_comissoes: number;
  dsr_horista: number;
  dsr_bruto: number;
  dsr_desconto_faltas: number;
  dsr_liquido: number;
  memoria_calculo?: string; // JSON string
  calculado_em?: string;
  calculado_por?: string;
  funcionario_nome?: string;
}

