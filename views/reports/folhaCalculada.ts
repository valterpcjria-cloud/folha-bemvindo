/**
 * Bem Vindo v1.3.0: carrega uma competência e calcula a folha exatamente como o grid de
 * Lançamentos (mesma cadeia: calcularFolhaCompetencia). Base dos relatórios do DP.
 */
import { api } from '../../services/mockApi';
import { Competencia, EventoFolha, Funcionario, Lancamento } from '../../types';
import { calcularFolhaCompetencia, calcDiasComFeriados } from '../../hooks/usePayrollData';
import { EVENT_CODES } from '../../constants/payroll';

export type MapaLancamentos = Record<string, Partial<Lancamento>>;

export interface TotaisFuncionario {
  proventos: number;
  descontos: number;
  liquido: number;
}

export interface FolhaCalculada {
  competencia: Competencia;
  funcionarios: Funcionario[];          // só quem tem movimento ou atestado na competência
  todosFuncionarios: Funcionario[];     // v1.5.0: cadastro inteiro (quadro de pessoal dos indicadores)
  diasUteis: number;                    // v1.5.0: dias úteis da competência (absenteísmo)
  eventos: EventoFolha[];               // ativos, na ordem de exportação
  lancamentos: MapaLancamentos;
  totais: Record<number, TotaisFuncionario>;
  atestados: Set<number>;
  atestadoDias: Record<number, number | null>;
}

export const valorDe = (lancs: MapaLancamentos, funcId: number, ev: EventoFolha): number =>
  Number(lancs[`${funcId}_${ev.id}`]?.valor_total) || 0;

export const quantidadeDe = (lancs: MapaLancamentos, funcId: number, ev: EventoFolha): number =>
  Number(lancs[`${funcId}_${ev.id}`]?.quantidade) || 0;

/** FGTS Visual (1900) é informativo: fica fora de proventos/descontos, como no grid. */
export const ehFgtsVisual = (ev: EventoFolha) => Number(ev.codigo_evento) === EVENT_CODES.FGTS_VISUAL;

export function totaisDoFuncionario(lancs: MapaLancamentos, eventos: EventoFolha[], funcId: number): TotaisFuncionario {
  let proventos = 0;
  let descontos = 0;
  for (const ev of eventos) {
    if (ehFgtsVisual(ev)) continue;
    const v = valorDe(lancs, funcId, ev);
    if (ev.tipo === 'CREDITO') proventos += v;
    else if (ev.tipo === 'DEBITO') descontos += v;
  }
  return { proventos, descontos, liquido: proventos - descontos };
}

export async function carregarFolhaCalculada(competencia: Competencia): Promise<FolhaCalculada> {
  const [funcs, evs, ferRes, lancsData, dias, atestList] = await Promise.all([
    api.getFuncionarios(),
    api.getEventos(),
    api.getHolidays().catch(() => ({ data: [] })),
    api.getLancamentos(competencia.id),
    api.calcularDiasUteisMes(competencia.id).catch(() => null),
    api.getAtestados(competencia.id).catch(() => ({ ids: [] as number[], dias: {} as Record<number, number | null> })),
  ]);

  const eventos = (evs as EventoFolha[])
    .filter(e => e.ativo === undefined || Number(e.ativo) !== 0)
    .sort((a, b) => (a.ordem_exportacao || 0) - (b.ordem_exportacao || 0));

  const ferList = Array.isArray(ferRes) ? ferRes : (ferRes?.data ?? []);
  const diasCal = dias ?? calcDiasComFeriados(competencia.mes, competencia.ano, ferList);

  const mapa: MapaLancamentos = {};
  (lancsData as Lancamento[]).forEach(l => { mapa[`${l.funcionario_id}_${l.evento_id}`] = l; });

  const atestados = new Set<number>(atestList.ids);
  const calc = calcularFolhaCompetencia(mapa, eventos, funcs, competencia, diasCal, atestados);

  const totais: Record<number, TotaisFuncionario> = {};
  const funcionarios = calc.funcionarios.filter(f => {
    totais[f.id] = totaisDoFuncionario(calc.lancamentos, eventos, f.id);
    const t = totais[f.id];
    return t.proventos !== 0 || t.descontos !== 0 || atestados.has(f.id);
  });

  return {
    competencia,
    funcionarios,
    todosFuncionarios: funcs,
    diasUteis: diasCal.dias_uteis,
    eventos,
    lancamentos: calc.lancamentos,
    totais,
    atestados,
    atestadoDias: atestList.dias || {},
  };
}

export const rotuloCompetencia = (c: Competencia) => `${String(c.mes).padStart(2, '0')}/${c.ano}`;

export const porNome = (a: Funcionario, b: Funcionario) => a.nome.localeCompare(b.nome, 'pt-BR');
