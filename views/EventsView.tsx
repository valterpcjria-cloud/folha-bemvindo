import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Zap, Save, CheckCircle } from 'lucide-react';
import { EventoFolha, EventType, Natureza, Unidade } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';

const EventsView: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [events, setEvents] = useState<EventoFolha[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<number, Partial<EventoFolha>>>({});
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<EventoFolha>>({
    tipo: EventType.CREDITO,
    natureza: Natureza.PROVENTO,
    unidade: Unidade.VALOR
  });

  useEffect(() => {
    loadEvents();
  }, [selectedCompanyId]);

  const loadEvents = () => {
    api.getEventos().then(setEvents);
  };

  // Marcar alteração de incidência (ainda não salva)
  const handleIncidenciaChange = (eventoId: number, campo: 'incide_inss' | 'incide_fgts' | 'incide_irrf', valor: boolean) => {
    const evento = events.find(e => e.id === eventoId);
    if (!evento) return;

    // Atualiza estado local imediatamente
    setEvents(prev => prev.map(e => e.id === eventoId ? { ...e, [campo]: valor } : e));

    // Registra alteração pendente
    setPendingChanges(prev => ({
      ...prev,
      [eventoId]: { ...prev[eventoId], ...evento, [campo]: valor }
    }));
  };

  // Salvar todas as alterações pendentes
  const handleSaveIncidencias = async () => {
    const changes = Object.values(pendingChanges);
    if (changes.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(changes.map(ev => api.updateEvento(ev as EventoFolha)));
      setPendingChanges({});
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (error) {
      alert('Erro ao salvar incidências');
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (events.some(ev => ev.codigo_evento === newEvent.codigo_evento)) {
      alert('Erro: Já existe um evento com este código.');
      return;
    }

    await api.saveEvento({
      ...newEvent,
      ordem_exportacao: events.length + 1
    });
    setShowModal(false);
    loadEvents();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Eventos de Folha</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie as rubricas de proventos e descontos.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-in fade-in">
              <CheckCircle size={16} />
              Salvo com sucesso!
            </span>
          )}
          {hasPendingChanges && (
            <button
              onClick={handleSaveIncidencias}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              <span>{saving ? 'Salvando...' : `Salvar Incidências (${Object.keys(pendingChanges).length})`}</span>
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 flex items-start gap-3">
        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
          <Zap size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-sky-800">Estrutura de Eventos</h4>
          <p className="text-xs text-sky-700 mt-1">
            Eventos marcados com o cadeado (<Lock size={12} className="inline" />) são protegidos pelo sistema e não podem ser removidos para garantir a integridade dos cálculos.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">INSS</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">FGTS</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">IRRF</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {ev.codigo_evento}
                      </span>
                      {ev.obrigatorio && <Lock size={14} className="text-slate-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">{ev.nome_evento}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ev.tipo === 'CREDITO'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                      {ev.tipo === 'CREDITO' ? 'Provento' : 'Desconto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={ev.incide_inss !== false}
                      onChange={(e) => handleIncidenciaChange(ev.id, 'incide_inss', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={ev.incide_fgts !== false}
                      onChange={(e) => handleIncidenciaChange(ev.id, 'incide_fgts', e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={ev.incide_irrf !== false}
                      onChange={(e) => handleIncidenciaChange(ev.id, 'incide_irrf', e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ev.obrigatorio ? (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sistema</span>
                    ) : (
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Manual</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Novo Evento</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Código</label>
                  <input
                    required
                    type="number"
                    className="input-clean"
                    onChange={(e) => setNewEvent(p => ({ ...p, codigo_evento: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <input
                    required
                    type="text"
                    className="input-clean"
                    onChange={(e) => setNewEvent(p => ({ ...p, nome_evento: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tipo</label>
                  <select
                    className="input-clean"
                    onChange={(e) => setNewEvent(p => ({ ...p, tipo: e.target.value as EventType }))}
                  >
                    <option value="CREDITO">Provento (Crédito)</option>
                    <option value="DEBITO">Desconto (Débito)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Unidade</label>
                  <select
                    className="input-clean"
                    onChange={(e) => setNewEvent(p => ({ ...p, unidade: e.target.value as Unidade }))}
                  >
                    <option value="VALOR">Valor (R$)</option>
                    <option value="HORA">Horas</option>
                    <option value="DIA">Dias</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;
