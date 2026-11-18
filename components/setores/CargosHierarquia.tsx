import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Pencil, Check, X, Power, Trash2, Network } from 'lucide-react';
import { Cargo, Setor } from '../../types';

export interface DadosCargo { nome: string; cbo: string; }

interface Props {
  setor: Setor | null;
  cargos: Cargo[];
  podeEditar: boolean;
  onMover: (id: number, direcao: -1 | 1) => void;
  onCriar: (dados: DadosCargo) => Promise<void>;
  onSalvar: (id: number, dados: DadosCargo) => Promise<void>;
  onAlternarAtivo: (cargo: Cargo) => void;
  onExcluir: (cargo: Cargo) => void;
}

const vazio: DadosCargo = { nome: '', cbo: '' };

/** Bem Vindo (Fase A.1): hierarquia de cargos de um setor (1 = topo). Define a ordem das pessoas dentro do setor. */
const CargosHierarquia: React.FC<Props> = ({ setor, cargos, podeEditar, onMover, onCriar, onSalvar, onAlternarAtivo, onExcluir }) => {
  const [novo, setNovo] = useState<DadosCargo>(vazio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<DadosCargo>(vazio);

  if (!setor) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-500">
        Escolha um setor à esquerda para ver e organizar os cargos.
      </section>
    );
  }

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novo.nome.trim()) return;
    await onCriar({ nome: novo.nome.trim(), cbo: novo.cbo.trim() });
    setNovo(vazio);
  };

  const salvar = async (id: number) => {
    if (edicao.nome.trim()) await onSalvar(id, { nome: edicao.nome.trim(), cbo: edicao.cbo.trim() });
    setEditandoId(null);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" aria-labelledby="titulo-cargos">
      <header className="px-5 py-4 border-b border-slate-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"><Network size={18} /></div>
        <div>
          <h2 id="titulo-cargos" className="font-bold text-slate-800">Hierarquia do setor {setor.nome}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Do topo para a base. Na matriz, as pessoas do setor aparecem nesta ordem.</p>
        </div>
      </header>

      <ol className="divide-y divide-slate-100">
        {cargos.map((c, i) => {
          const ativo = !!Number(c.ativo);
          const emUso = (c.qtd_funcionarios ?? 0) > 0;
          return (
            <li key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${ativo ? '' : 'opacity-60'}`}>
              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center tabular-nums shrink-0">{i + 1}</span>
              {editandoId === c.id ? (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-center">
                  <label className="sr-only" htmlFor={`cargo-nome-${c.id}`}>Nome do cargo</label>
                  <input id={`cargo-nome-${c.id}`} autoFocus className="input-clean text-sm py-1.5" value={edicao.nome} maxLength={150} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} />
                  <label className="sr-only" htmlFor={`cargo-cbo-${c.id}`}>CBO</label>
                  <input id={`cargo-cbo-${c.id}`} className="input-clean text-sm py-1.5" placeholder="CBO" value={edicao.cbo} maxLength={10} onChange={(e) => setEdicao({ ...edicao, cbo: e.target.value })} />
                  <div className="flex">
                    <button type="button" onClick={() => salvar(c.id)} className="p-2 rounded-lg text-sky-700 hover:bg-sky-100" aria-label="Salvar cargo"><Check size={16} /></button>
                    <button type="button" onClick={() => setEditandoId(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Cancelar"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{c.nome}</span>
                  <span className="text-[11px] text-slate-500">
                    {c.cbo ? `CBO ${c.cbo} · ` : ''}{c.qtd_funcionarios ?? 0} {(c.qtd_funcionarios ?? 0) === 1 ? 'pessoa' : 'pessoas'}{ativo ? '' : ' · desativado'}
                  </span>
                </div>
              )}
              {podeEditar && editandoId !== c.id && (
                <div className="flex items-center">
                  <button type="button" disabled={i === 0} onClick={() => onMover(c.id, -1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Subir ${c.nome} na hierarquia`}><ArrowUp size={15} /></button>
                  <button type="button" disabled={i === cargos.length - 1} onClick={() => onMover(c.id, 1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Descer ${c.nome} na hierarquia`}><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => { setEditandoId(c.id); setEdicao({ nome: c.nome, cbo: c.cbo ?? '' }); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Editar ${c.nome}`}><Pencil size={15} /></button>
                  <button type="button" onClick={() => onAlternarAtivo(c)} className={`p-2 rounded-lg hover:bg-slate-100 ${ativo ? 'text-emerald-600' : 'text-slate-400'}`} aria-label={ativo ? `Desativar ${c.nome}` : `Reativar ${c.nome}`}><Power size={15} /></button>
                  <button type="button" disabled={emUso} onClick={() => onExcluir(c)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label={`Excluir ${c.nome}`} title={emUso ? 'Cargo em uso: desative em vez de excluir' : undefined}><Trash2 size={15} /></button>
                </div>
              )}
            </li>
          );
        })}
        {cargos.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">Nenhum cargo neste setor ainda. Cadastre do topo (ex.: Encarregado) para a base (ex.: Auxiliar).</li>}
      </ol>

      {podeEditar && (
        <form onSubmit={criar} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 p-3 border-t border-slate-100 mt-auto">
          <label htmlFor="novo-cargo" className="sr-only">Nome do novo cargo</label>
          <input id="novo-cargo" className="input-clean text-sm" placeholder="Novo cargo (entra na base)" value={novo.nome} maxLength={150} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <label htmlFor="novo-cargo-cbo" className="sr-only">CBO do novo cargo</label>
          <input id="novo-cargo-cbo" className="input-clean text-sm" placeholder="CBO (opcional)" value={novo.cbo} maxLength={10} onChange={(e) => setNovo({ ...novo, cbo: e.target.value })} />
          <button type="submit" className="btn-primary flex items-center justify-center gap-1 whitespace-nowrap" disabled={!novo.nome.trim()}><Plus size={16} /> Adicionar</button>
        </form>
      )}
    </section>
  );
};

export default CargosHierarquia;
