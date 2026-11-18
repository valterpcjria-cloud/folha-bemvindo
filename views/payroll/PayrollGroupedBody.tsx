/**
 * Bem Vindo (Fase A.2): corpo da matriz agrupado por setor.
 * Cada setor vira um bloco (tbody) com cabeçalho, as linhas na ordem da hierarquia
 * e uma linha de subtotal por rubrica. No fim, o total geral do que está na tela.
 */
import React from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { EventoFolha, Funcionario, Lancamento } from '../../types';
import { FuncTotals } from '../../hooks/usePayrollData';
import { GrupoSetor, somarGrupo } from './agruparPorSetor';

interface Props {
  grupos: GrupoSetor[];
  eventos: EventoFolha[];
  lancamentos: Record<string, Partial<Lancamento>>;
  totalsByFunc: Record<number, FuncTotals>;
  recolhidos: Set<string>;
  onToggleGrupo: (chave: string) => void;
  renderRow: (f: Funcionario) => React.ReactNode;
  rotuloTotal?: string;
}

const fmt = (v: number) => (v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');

const LinhaSoma: React.FC<{
  rotulo: string;
  eventos: EventoFolha[];
  soma: { porEvento: Record<number, number>; liquido: number };
  forte?: boolean;
}> = ({ rotulo, eventos, soma, forte }) => {
  const fundo = forte ? 'bg-slate-800 text-white' : 'bg-sky-50 text-slate-700';
  return (
    <tr className={`${fundo} text-xs font-semibold`}>
      <td colSpan={2} className={`px-6 py-2.5 sticky left-0 z-20 border-r border-slate-200 ${fundo} uppercase tracking-wide`}>
        {rotulo}
      </td>
      {eventos.map((ev) => (
        <td key={ev.id} className={`px-3 py-2.5 text-center border-r ${forte ? 'border-slate-700' : 'border-sky-100'} ${!forte && ev.tipo === 'DEBITO' ? 'text-red-600' : ''}`}>
          {fmt(soma.porEvento[ev.id] || 0)}
        </td>
      ))}
      <td className={`px-6 py-2.5 text-center sticky right-0 z-20 font-bold ${forte ? 'bg-slate-900' : 'bg-sky-100'}`}>
        {soma.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>
  );
};

const PayrollGroupedBody: React.FC<Props> = ({ grupos, eventos, lancamentos, totalsByFunc, recolhidos, onToggleGrupo, renderRow, rotuloTotal = 'Total geral' }) => {
  const todos = grupos.flatMap((g) => g.funcionarios);
  return (
    <>
      {grupos.map((g) => {
        const fechado = recolhidos.has(g.chave);
        const soma = somarGrupo(g.funcionarios, eventos, lancamentos, totalsByFunc);
        return (
          <tbody key={g.chave} className="divide-y divide-slate-100 border-b-4 border-slate-100">
            <tr className="bg-slate-100/80">
              <td colSpan={2} className="px-4 py-2 sticky left-0 z-20 bg-slate-100 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => onToggleGrupo(g.chave)}
                  aria-expanded={!fechado}
                  className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-sky-700"
                  title={fechado ? 'Mostrar as pessoas do setor' : 'Recolher o setor (fica só o subtotal)'}
                >
                  {fechado ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <Layers size={14} className="text-sky-600" />
                  {g.nome}
                  <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                    {g.funcionarios.length} {g.funcionarios.length === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                </button>
              </td>
              <td colSpan={eventos.length} className="bg-slate-100/80" />
              <td className="sticky right-0 z-20 bg-slate-100" />
            </tr>
            {!fechado && g.funcionarios.map(renderRow)}
            <LinhaSoma rotulo={`Subtotal ${g.nome}`} eventos={eventos} soma={soma} />
          </tbody>
        );
      })}
      {grupos.length > 1 && (
        <tbody>
          <LinhaSoma rotulo={rotuloTotal} eventos={eventos} soma={somarGrupo(todos, eventos, lancamentos, totalsByFunc)} forte />
        </tbody>
      )}
    </>
  );
};

export default PayrollGroupedBody;
