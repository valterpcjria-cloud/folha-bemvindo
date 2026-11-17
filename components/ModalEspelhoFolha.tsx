import React, { useState, useMemo } from 'react';
import { X, Search, Check, Filter, Printer, FileText } from 'lucide-react';
import { api } from '../services/mockApi';

interface Funcionario {
  id: number;
  id_contrato: string | number;
  nome: string;
}

interface ModalEspelhoFolhaProps {
  isOpen: boolean;
  onClose: () => void;
  funcionarios: Funcionario[];
  empresaId?: number;
  competencia: string;
  usuario?: string;
  setLoading: (loading: boolean) => void;
}

export function ModalEspelhoFolha({ isOpen, onClose, funcionarios, competencia, setLoading }: ModalEspelhoFolhaProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busca, setBusca] = useState('');
  const [tipoRelatorio, setTipoRelatorio] = useState<'completo' | 'resumo'>('completo');

  // Filtrar funcionários pela busca
  const funcionariosFiltrados = useMemo(() => {
    if (!busca.trim()) return funcionarios;
    const termo = busca.toLowerCase();
    return funcionarios.filter(f =>
      f.nome.toLowerCase().includes(termo) ||
      String(f.id_contrato).includes(termo)
    );
  }, [funcionarios, busca]);

  const toggleFuncionario = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selecionarTodos = () => {
    setSelectedIds(funcionariosFiltrados.map(f => f.id));
  };

  const limparSelecao = () => {
    setSelectedIds([]);
  };

  const gerarPDF = async () => {
    setLoading(true);
    try {
      // Usar o novo método no mockApi que aceita filtros
      await api.downloadRelacaoCalculoPDF(
        competencia, 
        'Mensal', 
        selectedIds.length > 0 ? selectedIds : null, 
        tipoRelatorio === 'resumo'
      );
      onClose();
    } catch (error: any) {
      console.error(error);
      alert('Erro ao gerar o relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Printer className="text-blue-600" size={24} />
              Configurar Espelho da Folha
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Competência: {competencia}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Tipo de relatório */}
        <div className="p-6 space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Escolha o Formato</label>
          <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setTipoRelatorio('completo')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${tipoRelatorio === 'completo' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
            >
                <div className={`p-3 rounded-xl ${tipoRelatorio === 'completo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <FileText size={20} />
                </div>
                <div className="text-center">
                    <span className={`block font-bold text-sm ${tipoRelatorio === 'completo' ? 'text-blue-900' : 'text-slate-600'}`}>Espelho Completo</span>
                    <span className="text-[10px] text-slate-400">Páginas individuais + Resumo</span>
                </div>
            </button>
            <button 
                onClick={() => setTipoRelatorio('resumo')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${tipoRelatorio === 'resumo' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
            >
                <div className={`p-3 rounded-xl ${tipoRelatorio === 'resumo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Filter size={20} />
                </div>
                <div className="text-center">
                    <span className={`block font-bold text-sm ${tipoRelatorio === 'resumo' ? 'text-blue-900' : 'text-slate-600'}`}>Apenas Resumo</span>
                    <span className="text-[10px] text-slate-400">Somente páginas de totais</span>
                </div>
            </button>
          </div>
        </div>

        {/* Seleção de funcionários */}
        {tipoRelatorio === 'completo' && (
          <div className="px-6 pb-6 flex-1 flex flex-col min-h-0">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Filtrar Colaboradores</label>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex gap-4">
                <button onClick={selecionarTodos} className="text-[10px] font-black text-blue-600 uppercase tracking-wider hover:underline">
                  Selecionar Todos ({funcionariosFiltrados.length})
                </button>
                <button onClick={limparSelecao} className="text-[10px] font-black text-rose-500 uppercase tracking-wider hover:underline">
                  Limpar Seleção
                </button>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {selectedIds.length === 0 ? 'Todos selecionados' : `${selectedIds.length} selecionado(s)`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
              {funcionariosFiltrados.map(func => (
                <button
                  key={func.id}
                  onClick={() => toggleFuncionario(func.id)}
                  className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all border ${selectedIds.includes(func.id) 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(func.id) 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-slate-200'}`}>
                    {selectedIds.includes(func.id) && <Check size={14} strokeWidth={4} />}
                  </div>
                  <span className="text-xs font-black text-slate-400 font-mono">#{func.id_contrato}</span>
                  <span className="text-sm font-bold text-slate-700">{func.nome}</span>
                </button>
              ))}
              {funcionariosFiltrados.length === 0 && (
                <div className="py-10 text-center opacity-40">
                  <Search size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum colaborador encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tipoRelatorio === 'resumo' && (
          <div className="px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6">
                <Filter size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Arquivo de Resumo Consolidado</h3>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Será gerado apenas o resumo consolidado dos cálculos, impostos e obrigações da competência.
              <span className="block mt-2 font-bold text-emerald-600">Ideal para conferência rápida e contabilidade.</span>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-4 bg-slate-50/50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 text-sm font-black text-slate-500 uppercase tracking-widest border border-slate-200 rounded-2xl hover:bg-white hover:text-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={gerarPDF}
            className="flex-[2] flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
          >
            <Printer size={18} />
            Gerar Relatório PDF
          </button>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
