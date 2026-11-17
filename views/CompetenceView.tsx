import React, { useState, useEffect } from 'react';
import { Plus, Calendar, ChevronRight, CheckCircle, Lock, X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Competencia, StatusCompetencia } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import { MONTHS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';

const CompetenceView: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newMes, setNewMes] = useState(new Date().getMonth() + 1);
  const [newAno, setNewAno] = useState(new Date().getFullYear());
  const [closeConfirm, setCloseConfirm] = useState<{ show: boolean; comp: Competencia | null }>({ show: false, comp: null });
  const [justificationModal, setJustificationModal] = useState<{
    show: boolean;
    type: 'DELETE' | 'REOPEN';
    comp: Competencia | null;
    value: string;
  }>({ show: false, type: 'DELETE', comp: null, value: '' });

  useEffect(() => {
    loadCompetencias();
  }, [selectedCompanyId]);

  const loadCompetencias = async () => {
    const data = await api.getCompetencias();
    setCompetencias(data.sort((a, b) => b.ano - a.ano || b.mes - a.mes));
  };

  const handleCreate = async () => {
    await api.addCompetencia(newMes, newAno);
    setShowModal(false);
    loadCompetencias();
  };

  const toggleStatus = (comp: Competencia) => {
    if (comp.status === StatusCompetencia.ABERTA) {
      setCloseConfirm({ show: true, comp });
    }
  };

  const confirmClose = async () => {
    if (closeConfirm.comp) {
      await api.closeCompetencia(closeConfirm.comp.id);
      loadCompetencias();
    }
    setCloseConfirm({ show: false, comp: null });
  };

  const openJustification = (type: 'DELETE' | 'REOPEN', comp: Competencia) => {
    setJustificationModal({ show: true, type, comp, value: '' });
  };

  const handleJustificationSubmit = async () => {
    if (!justificationModal.comp || !justificationModal.value.trim()) return;

    try {
      if (justificationModal.type === 'DELETE') {
        await api.deleteCompetencia(justificationModal.comp.id, justificationModal.value);
      } else {
        await api.reopenCompetencia(justificationModal.comp.id, justificationModal.value);
      }
      setJustificationModal({ show: false, type: 'DELETE', comp: null, value: '' });
      loadCompetencias();
    } catch (error: any) {
      alert(error.message || "Erro ao processar ação");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Competências</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os períodos de apuração da folha.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Nova Competência</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competencias.map(comp => (
          <div
            key={comp.id}
            className={`group bg-white rounded-xl border p-6 flex flex-col gap-6 transition-all shadow-sm hover:shadow-md ${comp.status === 'ABERTA' ? 'border-sky-200 ring-4 ring-sky-50' : 'border-slate-200 opacity-75 hover:opacity-100'
              }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${comp.status === 'ABERTA' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{MONTHS[comp.mes - 1]}</h4>
                  <p className="text-sm font-medium text-slate-500">{comp.ano}</p>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${comp.status === 'ABERTA'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                {comp.status === 'ABERTA' ? 'Aberta' : 'Fechada'}
              </div>
            </div>

            <div className="mt-auto border-t border-slate-100 pt-4 flex flex-col gap-2">
              <button
                onClick={() => toggleStatus(comp)}
                disabled={comp.status !== 'ABERTA'}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${comp.status === 'ABERTA'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-400 cursor-not-allowed'
                  }`}
              >
                {comp.status === 'ABERTA' ? (
                  <>
                    Encerrar Ciclo
                    <ChevronRight size={16} />
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Processamento Finalizado
                  </>
                )}
              </button>

              {comp.status === 'ABERTA' ? (
                <button
                  onClick={() => openJustification('DELETE', comp)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                  Excluir Competência
                </button>
              ) : (
                <button
                  onClick={() => openJustification('REOPEN', comp)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-sky-600 hover:bg-sky-50 transition-all"
                >
                  <RotateCcw size={14} />
                  Reabrir Competência
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Nova Competência</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mês de Referência</label>
                <select
                  className="input-clean"
                  value={newMes}
                  onChange={(e) => setNewMes(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ano</label>
                <input
                  type="number"
                  className="input-clean"
                  value={newAno}
                  onChange={(e) => setNewAno(Number(e.target.value))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="btn-primary flex-1"
                >
                  Abrir Competência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={closeConfirm.show}
        title="Encerrar Competência"
        message={`Atenção: Deseja realmente encerrar a competência ${closeConfirm.comp?.mes}/${closeConfirm.comp?.ano}? Esta ação não pode ser desfeita.`}
        confirmText="Encerrar"
        variant="warning"
        onConfirm={confirmClose}
        onCancel={() => setCloseConfirm({ show: false, comp: null })}
      />

      {/* Justification Modal */}
      {justificationModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`flex justify-between items-center px-6 py-4 border-b border-slate-100 ${justificationModal.type === 'DELETE' ? 'bg-red-50' : 'bg-sky-50'}`}>
              <div className="flex items-center gap-2">
                {justificationModal.type === 'DELETE' ? (
                  <Trash2 size={20} className="text-red-600" />
                ) : (
                  <RotateCcw size={20} className="text-sky-600" />
                )}
                <h3 className="font-bold text-slate-800 text-lg">
                  {justificationModal.type === 'DELETE' ? 'Excluir Competência' : 'Reabrir Competência'}
                </h3>
              </div>
              <button
                onClick={() => setJustificationModal({ ...justificationModal, show: false })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {justificationModal.type === 'DELETE' && (
                <div className="flex gap-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>
                    <strong>Atenção:</strong> Ao excluir esta competência, todos os lançamentos de eventos e cálculos associados serão <strong>removidos permanentemente</strong>.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Justificativa da Ação <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full h-32 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"
                  placeholder="Descreva detalhadamente o motivo para realizar esta ação..."
                  value={justificationModal.value}
                  onChange={(e) => setJustificationModal({ ...justificationModal, value: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setJustificationModal({ ...justificationModal, show: false })}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleJustificationSubmit}
                  disabled={!justificationModal.value.trim()}
                  className={`flex-1 btn-primary ${justificationModal.type === 'DELETE' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  Confirmar Ação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetenceView;
