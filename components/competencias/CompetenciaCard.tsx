/**
 * Bem Vindo v1.4.0: cartão da competência com a etapa atual, a linha das 6 etapas e os botões
 * que o perfil do usuário pode usar (avançar, devolver, excluir, histórico).
 */
import React from 'react';
import { Calendar, ChevronRight, Trash2, Undo2, History, Lock } from 'lucide-react';
import { Competencia, UserPerfil } from '../../types';
import { MONTHS } from '../../constants';
import {
  INFO_ETAPA, CLASSE_COR, etapaDe, proximaEtapa, podeAvancar, podeDevolver,
} from '../../constants/etapasCompetencia';
import EtapasStepper from './EtapasStepper';

interface Props {
  comp: Competencia;
  perfil?: UserPerfil;
  onAvancar: (comp: Competencia) => void;
  onDevolver: (comp: Competencia) => void;
  onExcluir: (comp: Competencia) => void;
  onHistorico: (comp: Competencia) => void;
}

const CompetenciaCard: React.FC<Props> = ({ comp, perfil, onAvancar, onDevolver, onExcluir, onHistorico }) => {
  const etapa = etapaDe(comp);
  const info = INFO_ETAPA[etapa];
  const prox = proximaEtapa(etapa);
  const aberta = etapa === 'ABERTA';
  const podeExcluir = aberta && (perfil === 'ADMIN' || perfil === 'RH' || perfil === 'SUPERADMIN');

  return (
    <div className={`group bg-white rounded-xl border p-6 flex flex-col gap-5 transition-all shadow-sm hover:shadow-md ${aberta ? 'border-sky-200 ring-4 ring-sky-50' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${aberta ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
            <Calendar size={24} />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{MONTHS[comp.mes - 1]}</h4>
            <p className="text-sm font-medium text-slate-500">{comp.ano}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${CLASSE_COR[info.cor]}`}>
          {info.nome}
        </span>
      </div>

      <EtapasStepper atual={etapa} />

      <div className="text-xs text-slate-500 space-y-1">
        <p className="flex items-center gap-1.5">
          {aberta ? 'Lançamentos liberados para o DP.' : <><Lock size={12} /> Lançamentos travados.</>}
        </p>
        {prox && <p>Próximo passo: <strong className="text-slate-700">{INFO_ETAPA[prox].quem}</strong></p>}
      </div>

      <div className="mt-auto border-t border-slate-100 pt-4 flex flex-col gap-2">
        {prox && podeAvancar(perfil, etapa) && (
          <button
            onClick={() => onAvancar(comp)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          >
            {INFO_ETAPA[prox].acao}
            <ChevronRight size={16} />
          </button>
        )}
        {podeDevolver(perfil, etapa) && (
          <button
            onClick={() => onDevolver(comp)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <Undo2 size={14} /> Devolver para aberta
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onHistorico(comp)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
          >
            <History size={14} /> Histórico
          </button>
          {podeExcluir && (
            <button
              onClick={() => onExcluir(comp)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 size={14} /> Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetenciaCard;
