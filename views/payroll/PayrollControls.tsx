/**
 * PayrollControls - Controles da folha de pagamento
 * Seletor de competência, seleção em lote e busca
 */

import React from 'react';
import { Search } from 'lucide-react';
import { Competencia } from '../../types';

interface PayrollControlsProps {
    competencias: Competencia[];
    selectedCompId: number | undefined;
    selectedCount: number;
    searchTerm: string;
    onCompChange: (compId: number) => void;
    onBulkApply: () => void;
    onSearchChange: (term: string) => void;
}

const PayrollControls: React.FC<PayrollControlsProps> = ({
    competencias,
    selectedCompId,
    selectedCount,
    searchTerm,
    onCompChange,
    onBulkApply,
    onSearchChange
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
    );
};

export default PayrollControls;
