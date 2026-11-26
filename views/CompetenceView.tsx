import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Undo2, AlertTriangle } from 'lucide-react';
import { Competencia } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import { MONTHS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';
import CompetenciaCard from '../components/competencias/CompetenciaCard';
import HistoricoEtapasModal from '../components/competencias/HistoricoEtapasModal';
import { INFO_ETAPA, etapaDe, proximaEtapa, ehSomenteLeitura } from '../constants/etapasCompetencia';

const CompetenceView: React.FC = () => {
  const { selectedCompanyId, user } = useAuth();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newMes, setNewMes] = useState(new Date().getMonth() + 1);
  const [newAno, setNewAno] = useState(new Date().getFullYear());
  // Bem Vindo v1.4.0: avançar etapa, histórico e erros sem alert()
  const [avancar, setAvancar] = useState<Competencia | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Competencia | null>(null);
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

  const confirmarAvanco = async () => {
    if (!avancar) return;
    const prox = proximaEtapa(etapaDe(avancar));
    if (!prox) return;
    setProcessando(true);
    setErroAcao(null);
    try {
      await api.mudarEtapaCompetencia(avancar.id, prox);
      setAvancar(null);
      loadCompetencias();
    } catch (e: any) {
      setErroAcao(e?.message || 'Não foi possível mudar a etapa.');
    } finally {
      setProcessando(false);
    }
  };

  const openJustification = (type: 'DELETE' | 'REOPEN', comp: Competencia) => {
    setErroAcao(null);
    setJustificationModal({ show: true, type, comp, value: '' });
  };

  const handleJustificationSubmit = async () => {
    if (!justificationModal.comp || !justificationModal.value.trim()) return;

    try {
      if (justificationModal.type === 'DELETE') {
        await api.deleteCompetencia(justificationModal.comp.id, justificationModal.value);
      } else {
        await api.mudarEtapaCompetencia(justificationModal.comp.id, 'ABERTA', justificationModal.value);
      }
      setJustificationModal({ show: false, type: 'DELETE', comp: null, value: '' });
      loadCompetencias();
    } catch (error: any) {
      setErroAcao(error.message || 'Erro ao processar ação');
    }
  };

  const proxAvanco = avancar ? proximaEtapa(etapaDe(avancar)) : null;
  const mensagemAvanco = !avancar || !proxAvanco ? '' :
    `${MONTHS[avancar.mes - 1]}/${avancar.ano}: ${INFO_ETAPA[etapaDe(avancar)].nome} → ${INFO_ETAPA[proxAvanco].nome}.`
    + (etapaDe(avancar) === 'ABERTA'
      ? ' Os lançamentos ficam travados. Confira se tudo foi salvo na tela de Lançamentos antes de enviar.'
      : ' Fica registrado no histórico com seu nome.');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Competências</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aberta → Em conferência → Validada → Autorizada → Paga → Encerrada. Só a etapa aberta permite lançar.
          </p>
        </div>
        {!ehSomenteLeitura(user?.perfil) && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Nova Competência</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competencias.map(comp => (
          <CompetenciaCard
            key={comp.id}
            comp={comp}
            perfil={user?.perfil}
            onAvancar={c => { setErroAcao(null); setAvancar(c); }}
            onDevolver={c => openJustification('REOPEN', c)}
            onExcluir={c => openJustification('DELETE', c)}
            onHistorico={setHistorico}
          />
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
        isOpen={!!avancar}
        title={proxAvanco ? INFO_ETAPA[proxAvanco].acao : ''}
        message={mensagemAvanco}
        confirmText="Confirmar"
        variant="info"
        isLoading={processando}
        errorText={erroAcao}
        onConfirm={confirmarAvanco}
        onCancel={() => setAvancar(null)}
      />

      <HistoricoEtapasModal comp={historico} onClose={() => setHistorico(null)} />

      {/* Justification Modal */}
      {justificationModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`flex justify-between items-center px-6 py-4 border-b border-slate-100 ${justificationModal.type === 'DELETE' ? 'bg-red-50' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-2">
                {justificationModal.type === 'DELETE' ? (
                  <Trash2 size={20} className="text-red-600" />
                ) : (
                  <Undo2 size={20} className="text-amber-600" />
                )}
                <h3 className="font-bold text-slate-800 text-lg">
                  {justificationModal.type === 'DELETE' ? 'Excluir Competência' : 'Devolver para aberta'}
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

              {justificationModal.type === 'REOPEN' && (
                <p className="text-sm text-slate-600">
                  A competência volta para <strong>Aberta</strong> e o DP pode corrigir os lançamentos.
                  Depois ela precisa passar de novo por todas as etapas.
                </p>
              )}
              {erroAcao && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{erroAcao}</p>
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
