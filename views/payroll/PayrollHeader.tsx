/**
 * PayrollHeader - Cards de totais da folha
 * Mostra proventos, descontos, líquido e botão de salvar
 */

import React from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { PayrollTotals } from '../../hooks/usePayrollData';

interface PayrollHeaderProps {
    totals: PayrollTotals;
    isSaving: boolean;
    isCompetenciaClosed: boolean;
    hasUnsavedChanges?: boolean; // v4.55.0
    onSave: () => void;
}

const PayrollHeader: React.FC<PayrollHeaderProps> = ({
    totals,
    isSaving,
    isCompetenciaClosed,
    hasUnsavedChanges = false,
    onSave
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Proventos */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <p className="text-sm font-medium text-slate-500">Total Proventos</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-2xl font-bold text-slate-800">
                        {totals.proventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-slate-400">BRL</span>
                </div>
            </div>

            {/* Total Descontos */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <p className="text-sm font-medium text-slate-500">Total Descontos</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-2xl font-bold text-red-600">
                        {totals.descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-slate-400">BRL</span>
                </div>
            </div>

            {/* Total Líquido */}
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                <p className="text-sm font-bold text-emerald-700">Total Líquido</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-emerald-800">
                        {totals.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
            </div>

            {/* Botão Salvar */}
            <button
                onClick={onSave}
                disabled={isSaving || isCompetenciaClosed}
                className={`btn-primary flex items-center justify-center flex-col h-full gap-2 disabled:opacity-50 ${hasUnsavedChanges ? 'ring-4 ring-amber-300 animate-pulse' : ''}`}
            >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                <span className="text-xs font-bold uppercase tracking-wide">
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </span>
                {hasUnsavedChanges && !isSaving && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold normal-case bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        <AlertCircle size={12} /> Alterações não salvas
                    </span>
                )}
            </button>
        </div>
    );
};

export default PayrollHeader;
