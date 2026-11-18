/**
 * Bem Vindo (Fase A.2): agrupa os funcionários da matriz por setor, na ordem dos setores
 * e, dentro de cada setor, na ordem da hierarquia do cargo (1 = topo), depois por nome.
 * Quem não tem setor vai para o bloco "Sem setor", no fim.
 */
import { EventoFolha, Funcionario, Lancamento } from '../../types';
import { FuncTotals } from '../../hooks/usePayrollData';

export interface GrupoSetor {
  chave: string;          // id do setor ou 'sem-setor'
  nome: string;
  funcionarios: Funcionario[];
}

export const SEM_SETOR = 'sem-setor';

const num = (v: unknown, padrao: number) => (v === null || v === undefined || v === '' ? padrao : Number(v));

export function agruparPorSetor(funcionarios: Funcionario[]): GrupoSetor[] {
  const ordenados = [...funcionarios].sort((a, b) =>
    num(a.setor_ordem, 9999) - num(b.setor_ordem, 9999)
    || (a.setor_nome ?? '').localeCompare(b.setor_nome ?? '', 'pt-BR')
    || num(a.cargo_ordem, 999) - num(b.cargo_ordem, 999)
    || a.nome.localeCompare(b.nome, 'pt-BR'));

  const grupos: GrupoSetor[] = [];
  const porChave = new Map<string, GrupoSetor>();
  for (const f of ordenados) {
    const chave = f.id_setor ? String(f.id_setor) : SEM_SETOR;
    let g = porChave.get(chave);
    if (!g) {
      g = { chave, nome: f.id_setor ? (f.setor_nome || 'Setor') : 'Sem setor', funcionarios: [] };
      porChave.set(chave, g);
      grupos.push(g);
    }
    g.funcionarios.push(f);
  }
  return grupos;
}

/** Soma por rubrica (valor_total) e o líquido de um conjunto de funcionários. */
export function somarGrupo(
  funcionarios: Funcionario[],
  eventos: EventoFolha[],
  lancamentos: Record<string, Partial<Lancamento>>,
  totalsByFunc: Record<number, FuncTotals>,
): { porEvento: Record<number, number>; liquido: number } {
  const porEvento: Record<number, number> = {};
  let liquido = 0;
  for (const f of funcionarios) {
    for (const ev of eventos) {
      const v = Number(lancamentos[`${f.id}_${ev.id}`]?.valor_total) || 0;
      porEvento[ev.id] = (porEvento[ev.id] || 0) + v;
    }
    const t = totalsByFunc[f.id];
    if (t) liquido += (t.proventos || 0) - (t.descontos || 0);
  }
  return { porEvento, liquido };
}
