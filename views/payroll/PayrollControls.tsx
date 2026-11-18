/**
 * PayrollControls - Controles da folha de pagamento
 * Seletor de competência, seleção em lote e busca
 */

import React from 'react';
import { Search, Layers, List } from 'lucide-react';
import { Competencia } from '../../types';

interface PayrollControlsProps {
    competencias: Competencia[];
    selectedCompId: number | undefined;
    selectedCount: number;
    searchTerm: string;
    onCompChange: (compId: number) => void;
    onBulkApply: () => void;
    onSearchChange: (term: string) => void;
    // Bem Vindo (Fase A.2): matriz por setor
    agrupar: boolean;
    onAgruparChange: (v: boolean) => void;
    setores: { chave: string; nome: string }[];
    setorFiltro: string;
    onSetorFiltroChange: (chave: string) => void;
}

const PayrollControls: React.FC<PayrollControlsProps> = ({
    competencias,
    selectedCompId,
    selectedCount,
    searchTerm,
    onCompChange,
    onBulkApply,
    onSearchChange,
    agrupar,
    onAgruparChange,
    setores,
    setorFiltro,
    onSetorFiltroChange,
}) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 sticky top-0 z-30">
            <div className="flex items-center gap-4 w-full md:w-auto">
                {/* Seletor de Competência */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Competência
                    </label>
                    <div className="relative">
                        <select
                            className="input-clean min-w-[200px] font-bold text-slate-800"
                            value={selectedCompId || ''}
                            onChange={(e) => onCompChange(Number(e.target.value))}
                        >
                            {competencias.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.mes.toString().padStart(2, '0')}/{c.ano}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Seleção em Lote */}
                {selectedCount > 0 && (
                    <div className="flex items-center gap-4 pl-6 border-l border-slate-200 animate-in fade-in slide-in-from-left-4">
                        <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                            {selectedCount} selecionados
                        </span>
                        <button
                            onClick={onBulkApply}
                            className="text-xs font-medium text-slate-600 hover:text-sky-600 hover:underline"
                        >
                            Aplicar R$ 100,00 em Lote
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">
            {/* Bem Vindo (Fase A.2): visão por setor (com subtotais) ou lista simples */}
            <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Visão</span>
                <div role="group" aria-label="Visão da matriz" className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                    <button type="button" aria-pressed={agrupar} onClick={() => onAgruparChange(true)}
                        className={`flex items-center gap-1.5 px-3 py-2 ${agrupar ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <Layers size={14} /> Por setor
                    </button>
                    <button type="button" aria-pressed={!agrupar} onClick={() => onAgruparChange(false)}
                        className={`flex items-center gap-1.5 px-3 py-2 border-l border-slate-200 ${!agrupar ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <List size={14} /> Lista
                    </button>
                </div>
            </div>
            {agrupar && (
                <div className="space-y-1">
                    <label htmlFor="matriz-setor" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Setor</label>
                    <select id="matriz-setor" className="input-clean text-sm min-w-[180px]" value={setorFiltro} onChange={(e) => onSetorFiltroChange(e.target.value)}>
                        <option value="">Todos os setores</option>
                        {setores.map(s => <option key={s.chave} value={s.chave}>{s.nome}</option>)}
                    </select>
                </div>
            )}

            {/* Busca */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    className="input-clean pl-10 text-sm w-full"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            </div>
        </div>
    );
};

export default PayrollControls;
