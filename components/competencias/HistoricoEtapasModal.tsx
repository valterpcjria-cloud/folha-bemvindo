/**
 * Bem Vindo v1.4.0: histórico das etapas de uma competência (quem, quando, de → para, motivo).
 */
import React, { useEffect, useState } from 'react';
import { History, X, Loader2, ArrowRight, Undo2 } from 'lucide-react';
import { api } from '../../services/mockApi';
import { Competencia, HistoricoEtapa } from '../../types';
import { INFO_ETAPA } from '../../constants/etapasCompetencia';
import { MONTHS } from '../../constants';

interface Props {
  comp: Competencia | null;
  onClose: () => void;
}

const PERFIL: Record<string, string> = {
  RH: 'DP', ADMIN: 'Admin', SUPERADMIN: 'Superadmin', CONTABILIDADE: 'Contabilidade', DIRETOR: 'Diretor',
};

const HistoricoEtapasModal: React.FC<Props> = ({ comp, onClose }) => {
  const [itens, setItens] = useState<HistoricoEtapa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!comp) return;
    setItens(null);
    setErro(null);
    api.getHistoricoCompetencia(comp.id).then(setItens).catch((e: any) => setErro(e?.message || 'Falha ao carregar.'));
  }, [comp]);

  if (!comp) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <History size={20} className="text-sky-600" /> Histórico · {MONTHS[comp.mes - 1]}/{comp.ano}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {!itens && !erro && <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando…</p>}
          {itens && itens.length === 0 && <p className="text-sm text-slate-500">Nenhuma mudança de etapa registrada ainda.</p>}
          {itens && itens.length > 0 && (
            <ol className="space-y-4">
              {itens.map(h => {
                const devolucao = h.etapa_para === 'ABERTA';
                return (
                  <li key={h.id} className="flex gap-3">
                    <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${devolucao ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {devolucao ? <Undo2 size={14} /> : <ArrowRight size={14} />}
                    </span>
                    <div className="text-sm">
                      <p className="font-semibold text-slate-800">
                        {INFO_ETAPA[h.etapa_de]?.nome ?? h.etapa_de} → {INFO_ETAPA[h.etapa_para]?.nome ?? h.etapa_para}
                        {devolucao && <span className="ml-2 text-[10px] font-bold uppercase text-amber-700">devolvida</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(h.criado_em.replace(' ', 'T')).toLocaleString('pt-BR')} · {h.usuario_nome || 'usuário removido'}
                        {h.usuario_perfil ? ` (${PERFIL[h.usuario_perfil] ?? h.usuario_perfil})` : ''}
                      </p>
                      {h.observacao && <p className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2">{h.observacao}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricoEtapasModal;
