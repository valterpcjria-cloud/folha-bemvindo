import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Pencil, Check, X, Power, Users } from 'lucide-react';
import { Setor } from '../../types';

interface Props {
  setores: Setor[];
  selecionadoId: number | null;
  podeEditar: boolean;
  onSelecionar: (id: number) => void;
  onMover: (id: number, direcao: -1 | 1) => void;
  onCriar: (nome: string) => Promise<void>;
  onRenomear: (id: number, nome: string) => Promise<void>;
  onAlternarAtivo: (setor: Setor) => void;
}

/** Bem Vindo (Fase A.1): lista de setores na ordem em que aparecem na matriz do DP. */
const SetoresPainel: React.FC<Props> = ({ setores, selecionadoId, podeEditar, onSelecionar, onMover, onCriar, onRenomear, onAlternarAtivo }) => {
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await onCriar(novoNome.trim());
    setNovoNome('');
  };

  const salvarNome = async (id: number) => {
    if (nomeEdicao.trim()) await onRenomear(id, nomeEdicao.trim());
    setEditandoId(null);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" aria-labelledby="titulo-setores">
      <header className="px-5 py-4 border-b border-slate-100">
        <h2 id="titulo-setores" className="font-bold text-slate-800">Setores</h2>
        <p className="text-xs text-slate-500 mt-0.5">A ordem aqui é a ordem dos blocos na matriz de lançamentos.</p>
      </header>

      <ol className="divide-y divide-slate-100">
        {setores.map((s, i) => {
          const ativo = !!Number(s.ativo);
          const selecionado = s.id === selecionadoId;
          return (
            <li key={s.id} className={`flex items-center gap-2 px-3 py-2 ${selecionado ? 'bg-sky-50' : ''} ${ativo ? '' : 'opacity-60'}`}>
              <span className="w-6 text-center text-xs font-semibold text-slate-400 tabular-nums">{i + 1}</span>
              {editandoId === s.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <label htmlFor={`setor-nome-${s.id}`} className="sr-only">Nome do setor</label>
                  <input id={`setor-nome-${s.id}`} autoFocus className="input-clean text-sm py-1.5" value={nomeEdicao} maxLength={100}
                    onChange={(e) => setNomeEdicao(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(s.id); if (e.key === 'Escape') setEditandoId(null); }} />
                  <button type="button" onClick={() => salvarNome(s.id)} className="p-2 rounded-lg text-sky-700 hover:bg-sky-100" aria-label="Salvar nome"><Check size={16} /></button>
                  <button type="button" onClick={() => setEditandoId(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Cancelar"><X size={16} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => onSelecionar(s.id)} aria-current={selecionado ? 'true' : undefined}
                  className="flex-1 min-w-0 text-left py-1.5 px-2 rounded-lg hover:bg-slate-50">
                  <span className={`block text-sm font-semibold truncate ${selecionado ? 'text-sky-800' : 'text-slate-800'}`}>{s.nome}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Users size={11} /> {s.qtd_funcionarios ?? 0} · {s.qtd_cargos ?? 0} cargos{ativo ? '' : ' · desativado'}
                  </span>
                </button>
              )}
              {podeEditar && editandoId !== s.id && (
                <div className="flex items-center">
                  <button type="button" disabled={i === 0} onClick={() => onMover(s.id, -1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Subir ${s.nome}`}><ArrowUp size={15} /></button>
                  <button type="button" disabled={i === setores.length - 1} onClick={() => onMover(s.id, 1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Descer ${s.nome}`}><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => { setEditandoId(s.id); setNomeEdicao(s.nome); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Renomear ${s.nome}`}><Pencil size={15} /></button>
                  <button type="button" onClick={() => onAlternarAtivo(s)} className={`p-2 rounded-lg hover:bg-slate-100 ${ativo ? 'text-emerald-600' : 'text-slate-400'}`} aria-label={ativo ? `Desativar ${s.nome}` : `Reativar ${s.nome}`}><Power size={15} /></button>
                </div>
              )}
            </li>
          );
        })}
        {setores.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">Nenhum setor cadastrado.</li>}
      </ol>

      {podeEditar && (
        <form onSubmit={criar} className="flex gap-2 p-3 border-t border-slate-100 mt-auto">
          <label htmlFor="novo-setor" className="sr-only">Nome do novo setor</label>
          <input id="novo-setor" className="input-clean text-sm" placeholder="Novo setor (ex.: Licitações)" value={novoNome} maxLength={100} onChange={(e) => setNovoNome(e.target.value)} />
          <button type="submit" className="btn-primary flex items-center gap-1 whitespace-nowrap" disabled={!novoNome.trim()}><Plus size={16} /> Adicionar</button>
        </form>
      )}
    </section>
  );
};

export default SetoresPainel;
