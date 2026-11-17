import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Edit2, 
  Globe, 
  MapPin, 
  Building2, 
  Search, 
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/mockApi';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

interface Feriado {
  id?: number;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal';
  uf?: string;
  cidade?: string;
  recorrente: boolean;
  ativo: boolean;
  empresa_id?: number;
}

const HolidaysView: React.FC = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'nacional' | 'estadual' | 'municipal'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState<Feriado | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.getHolidays();
      if (res.data) setHolidays(res.data);
    } catch (err) {
      console.error("Erro ao carregar feriados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHoliday) return;

    setIsSaving(true);
    try {
      await api.saveHoliday(currentHoliday);
      setSuccessMsg(currentHoliday.id ? 'Feriado atualizado!' : 'Feriado cadastrado!');
      setIsModalOpen(false);
      loadHolidays();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert("Erro ao salvar feriado.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentHoliday?.id) return;
    try {
      await api.deleteHoliday(currentHoliday.id);
      setIsDeleteModalOpen(false);
      loadHolidays();
      setSuccessMsg('Feriado removido!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert("Erro ao remover feriado.");
    }
  };

  // Liga/desliga o feriado. Desligado (ativo=0) NÃO entra no cálculo do DSR.
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const handleToggleAtivo = async (holiday: Feriado) => {
    if (!holiday.id) return;
    const novoAtivo = !holiday.ativo;
    setTogglingId(holiday.id);
    // Atualização otimista
    setHolidays(prev => prev.map(h => h.id === holiday.id ? { ...h, ativo: novoAtivo } : h));
    try {
      await api.saveHoliday({ ...holiday, ativo: novoAtivo });
      setSuccessMsg(novoAtivo ? 'Feriado religado — voltará ao DSR.' : 'Feriado desligado — fora do DSR.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      // Reverte em caso de erro
      setHolidays(prev => prev.map(h => h.id === holiday.id ? { ...h, ativo: holiday.ativo } : h));
      alert("Erro ao alterar status do feriado.");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredHolidays = holidays.filter(h => {
    const matchesSearch = h.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || h.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (tipo: string) => {
    switch (tipo) {
      case 'nacional': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Nacional</span>;
      case 'estadual': return <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Estadual</span>;
      case 'municipal': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Municipal</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans max-w-6xl mx-auto">
      {/* Header Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-600 to-sky-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
              <CalendarDays size={22} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gestão de Feriados</h1>
          </div>
          <p className="text-slate-500 font-medium">Configure feriados nacionais, estaduais e municipais para o cálculo automático do DSR.</p>
        </div>
        
        <div className="flex items-center gap-3 z-10">
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm"
            >
              <CheckCircle2 size={16} />
              <span className="text-sm font-semibold">{successMsg}</span>
            </motion.div>
          )}
          <button 
            onClick={() => {
              setCurrentHoliday({ nome: '', data: '', tipo: 'nacional', recorrente: true, ativo: true });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl transition-all shadow-lg hover:shadow-sky-200 hover:-translate-y-0.5 active:scale-95 font-bold text-sm"
          >
            <Plus size={18} />
            <span>Novo Feriado</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome do feriado..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-slate-400" size={18} />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full md:w-48 py-3 px-4 bg-slate-50 border-transparent border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-bold text-slate-700 cursor-pointer"
          >
            <option value="all">Todos os Tipos</option>
            <option value="nacional">Nacional</option>
            <option value="estadual">Estadual</option>
            <option value="municipal">Municipal</option>
          </select>
          
          <button 
            onClick={loadHolidays}
            className="p-3 bg-white border-2 border-slate-100 text-slate-400 hover:text-sky-600 hover:border-sky-100 hover:bg-sky-50 rounded-2xl transition-all shadow-sm active:scale-95"
            title="Atualizar Feriados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid of Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4"></div>
              <div className="h-5 bg-slate-100 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))
        ) : filteredHolidays.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
            <CalendarDays size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum feriado encontrado.</p>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setSearchTerm('')} className="text-sky-500 text-sm font-bold hover:underline">Limpar filtros</button>
            </div>
          </div>
        ) : (
          filteredHolidays.map((holiday, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={holiday.id}
              className={`group bg-white p-6 rounded-3xl border shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all flex flex-col justify-between ${
                holiday.ativo ? 'border-slate-200' : 'border-slate-200 opacity-60 grayscale'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${
                    holiday.tipo === 'nacional' ? 'bg-emerald-50 text-emerald-600' : 
                    holiday.tipo === 'estadual' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <CalendarDays size={24} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setCurrentHoliday(holiday); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    {holiday.empresa_id && (
                      <button 
                        onClick={() => { setCurrentHoliday(holiday); setIsDeleteModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  {getTypeBadge(holiday.tipo)}
                  {!!holiday.recorrente && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Anual</span>}
                  {!holiday.ativo && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Desligado</span>}
                </div>
                <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{holiday.nome}</h3>
                <p className="text-2xl font-black text-slate-900 mt-2 flex items-baseline gap-1">
                  {new Date(holiday.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  {!holiday.recorrente && <span className="text-xs font-medium text-slate-400">/{new Date(holiday.data + 'T12:00:00').getFullYear()}</span>}
                </p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                  {holiday.tipo === 'nacional' ? <Globe size={14} /> : holiday.tipo === 'estadual' ? <Building2 size={14} /> : <MapPin size={14} />}
                  <span>{holiday.tipo === 'nacional' ? 'Todo o Brasil' :
                         holiday.tipo === 'estadual' ? `Estado: ${holiday.uf}` :
                         `${holiday.cidade} - ${holiday.uf}`}</span>
                </div>

                {/* Switcher: liga/desliga o feriado no cálculo do DSR.
                    Feriado nacional só pode ser alternado pelo Superadmin (backend exige). */}
                {(() => {
                  const canToggle = holiday.tipo !== 'nacional' || user?.perfil === 'SUPERADMIN';
                  return (
                <button
                  type="button"
                  onClick={() => handleToggleAtivo(holiday)}
                  disabled={togglingId === holiday.id || !canToggle}
                  title={!canToggle ? 'Apenas Superadmin pode desligar feriados nacionais'
                    : holiday.ativo ? 'Desligar feriado (sai do DSR)' : 'Religar feriado (volta ao DSR)'}
                  className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className={`text-[10px] font-black uppercase tracking-wider ${holiday.ativo ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {togglingId === holiday.id ? '...' : holiday.ativo ? 'DSR On' : 'DSR Off'}
                  </span>
                  <div className="relative">
                    <div className={`w-11 h-6 rounded-full transition-all ${holiday.ativo ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${holiday.ativo ? 'translate-x-5' : ''}`}></div>
                  </div>
                </button>
                  );
                })()}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{currentHoliday?.id ? 'Editar Feriado' : 'Novo Feriado'}</h2>
                  <p className="text-sm text-slate-500 font-medium">Preencha os detalhes do evento.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-800 shadow-sm border border-transparent hover:border-slate-200">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nome do Feriado</label>
                  <input 
                    required
                    type="text" 
                    value={currentHoliday?.nome}
                    onChange={(e) => setCurrentHoliday(prev => prev ? ({ ...prev, nome: e.target.value }) : null)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold"
                    placeholder="Ex: Aniversário da Cidade"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Data</label>
                    <input 
                      required
                      type="date" 
                      value={currentHoliday?.data}
                      onChange={(e) => setCurrentHoliday(prev => prev ? ({ ...prev, data: e.target.value }) : null)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Tipo de Feriado</label>
                    <select 
                      value={currentHoliday?.tipo}
                      onChange={(e) => setCurrentHoliday(prev => prev ? ({ ...prev, tipo: e.target.value as any }) : null)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold appearance-none cursor-pointer"
                    >
                      <option value="nacional">Nacional</option>
                      <option value="estadual">Estadual</option>
                      <option value="municipal">Municipal</option>
                    </select>
                  </div>
                </div>

                {currentHoliday?.tipo !== 'nacional' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">UF (Estado)</label>
                      <input 
                        type="text" 
                        maxLength={2}
                        placeholder="Ex: MG"
                        value={currentHoliday?.uf}
                        onChange={(e) => setCurrentHoliday(prev => prev ? ({ ...prev, uf: e.target.value.toUpperCase() }) : null)}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold"
                      />
                    </div>
                    {currentHoliday?.tipo === 'municipal' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Cidade</label>
                        <input 
                          type="text" 
                          placeholder="Ex: São Paulo"
                          value={currentHoliday?.cidade}
                          onChange={(e) => setCurrentHoliday(prev => prev ? ({ ...prev, cidade: e.target.value }) : null)}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex items-center gap-6 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only p-4"
                        checked={currentHoliday?.recorrente}
                        onChange={(e) => setCurrentHoliday(prev => prev ? ({ ...prev, recorrente: e.target.checked }) : null)}
                      />
                      <div className={`w-12 h-6 rounded-full transition-all ${currentHoliday?.recorrente ? 'bg-sky-500' : 'bg-slate-200'}`}></div>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all transform ${currentHoliday?.recorrente ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-sky-600 transition-colors">Feriado Recorrente (Anual)</span>
                  </label>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all border border-transparent active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-8 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <>{currentHoliday?.id ? 'Salvar Alterações' : 'Cadastrar Feriado'}</>}
                  </button>
                </div>
              </form>
              
              <div className="bg-sky-50 p-6 flex items-start gap-3 border-t border-sky-100">
                <AlertCircle className="text-sky-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-sky-700 font-semibold leading-relaxed">
                  Ao salvar um novo feriado, o sistema agendará automaticamente o recálculo do DSR para todas as competências em aberto.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Remover Feriado?"
        message={`Tem certeza que deseja remover o feriado "${currentHoliday?.nome}"? Isso afetará os cálculos de DSR futuros.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        variant="danger"
      />
    </div>
  );
};

export default HolidaysView;
