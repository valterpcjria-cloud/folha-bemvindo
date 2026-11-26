/**
 * Bem Vindo v1.4.0: fluxo da competência em 6 etapas.
 * Espelho de backend/v1/lib/EtapasCompetencia.php — o backend é quem decide; aqui só mostra os botões.
 */
import { Competencia, EtapaCompetencia, UserPerfil } from '../types';

export const ETAPAS: EtapaCompetencia[] = ['ABERTA', 'EM_CONFERENCIA', 'VALIDADA', 'AUTORIZADA', 'PAGA', 'ENCERRADA'];

export const INFO_ETAPA: Record<EtapaCompetencia, { nome: string; curto: string; acao: string; quem: string; cor: string }> = {
  ABERTA:         { nome: 'Aberta',         curto: 'Aberta',      acao: 'Reabrir',                 quem: 'DP lança',                            cor: 'sky' },
  EM_CONFERENCIA: { nome: 'Em conferência', curto: 'Conferência', acao: 'Enviar para conferência', quem: 'DP envia para conferência',           cor: 'amber' },
  VALIDADA:       { nome: 'Validada',       curto: 'Validada',    acao: 'Validar',                 quem: 'Contabilidade confere e valida',      cor: 'violet' },
  AUTORIZADA:     { nome: 'Autorizada',     curto: 'Autorizada',  acao: 'Autorizar pagamento',     quem: 'Diretor autoriza o pagamento',        cor: 'indigo' },
  PAGA:           { nome: 'Paga',           curto: 'Paga',        acao: 'Marcar como paga',        quem: 'DP registra o pagamento',             cor: 'emerald' },
  ENCERRADA:      { nome: 'Encerrada',      curto: 'Encerrada',   acao: 'Encerrar',                quem: 'DP encerra o mês',                    cor: 'slate' },
};

/** Classes Tailwind por cor (escritas por extenso para o Tailwind não descartar). */
export const CLASSE_COR: Record<string, string> = {
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-300',
};

const AVANCAR: Record<Exclude<EtapaCompetencia, 'ABERTA'>, UserPerfil[]> = {
  EM_CONFERENCIA: ['ADMIN', 'RH'],
  VALIDADA: ['ADMIN', 'CONTABILIDADE'],
  AUTORIZADA: ['ADMIN', 'DIRETOR'],
  PAGA: ['ADMIN', 'RH'],
  ENCERRADA: ['ADMIN', 'RH'],
};

const DEVOLVER: Record<Exclude<EtapaCompetencia, 'ABERTA'>, UserPerfil[]> = {
  EM_CONFERENCIA: ['ADMIN', 'RH', 'CONTABILIDADE'],
  VALIDADA: ['ADMIN', 'RH', 'CONTABILIDADE', 'DIRETOR'],
  AUTORIZADA: ['ADMIN', 'RH', 'CONTABILIDADE', 'DIRETOR'],
  PAGA: ['ADMIN'],
  ENCERRADA: ['ADMIN'],
};

/** Perfis que só consultam: não lançam nem cadastram (cada um só mexe na sua etapa). */
export const PERFIS_SOMENTE_LEITURA: UserPerfil[] = ['LEITURA', 'CONTABILIDADE', 'DIRETOR'];

export const ehSomenteLeitura = (perfil?: UserPerfil | null) => !!perfil && PERFIS_SOMENTE_LEITURA.includes(perfil);

/** Competências antigas (sem a coluna) caem no status. */
export const etapaDe = (c?: Competencia | null): EtapaCompetencia =>
  c?.etapa ?? (c?.status === 'FECHADA' ? 'ENCERRADA' : 'ABERTA');

export function proximaEtapa(e: EtapaCompetencia): EtapaCompetencia | null {
  const i = ETAPAS.indexOf(e);
  return i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1] : null;
}

const pode = (perfil: UserPerfil | undefined, perfis: UserPerfil[]) => perfil === 'SUPERADMIN' || (!!perfil && perfis.includes(perfil));

export function podeAvancar(perfil: UserPerfil | undefined, atual: EtapaCompetencia): boolean {
  const prox = proximaEtapa(atual);
  return !!prox && prox !== 'ABERTA' && pode(perfil, AVANCAR[prox as Exclude<EtapaCompetencia, 'ABERTA'>]);
}

export function podeDevolver(perfil: UserPerfil | undefined, atual: EtapaCompetencia): boolean {
  return atual !== 'ABERTA' && pode(perfil, DEVOLVER[atual]);
}

export const nomeEtapa = (c?: Competencia | null) => INFO_ETAPA[etapaDe(c)].nome;
