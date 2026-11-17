import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, DollarSign, Calculator, Frown } from 'lucide-react';
import { Funcionario, DsrCalculado, Competencia } from '../../types';
import { api } from '../../services/mockApi';

interface DsrModalProps {
    employee: Funcionario;
    competencia: Competencia;
    onClose: () => void;
    onDescontoFalta?: (data_falta: string) => void;
}

const DsrModal: React.FC<DsrModalProps> = ({ employee, competencia, onClose, onDescontoFalta }) => {
    const [data, setData] = useState<DsrCalculado | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataFalta, setDataFalta] = useState('');

    // v4.56.0: usa a API autenticada (antes lia sessionStorage 'token', que nunca existiu → 401 silencioso)
    const fetchDsr = useCallback(async () => {
        setLoading(true);
        try {
            const lista = await api.getDsrCompetencia(competencia.id);
            setData(lista.find(d => d.funcionario_id === employee.id) || null);
        } catch (err) {
            console.error('Erro ao buscar DSR:', err);
        } finally {
            setLoading(false);
        }
    }, [competencia.id, employee.id]);

    useEffect(() => {
        fetchDsr();
    }, [fetchDsr]);

    const handleRegistrarFalta = async () => {
        if (!dataFalta) return;
        try {
            await api.registrarFaltaDsr(employee.id, competencia.id, dataFalta);
            onDescontoFalta && onDescontoFalta(dataFalta);
            setDataFalta('');
            // ideal mode is refetching, but we can instruct the user to hit recalculate
            alert('Falta Registrada! Recalcule a folha ou a fila de DSR do funcionário.');
        } catch (e: any) {
            console.error(e);
            alert(`Erro ao registrar falta: ${e?.message || 'falha desconhecida'}`);
        }
    };

    const handleRecalcularDsr = async () => {
        setLoading(true);
        try {
            await api.recalcularDsrIndividual(employee.id, competencia.id);
            await fetchDsr(); // recarrega para exibir o valor recalculado
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex justify-center">
                    <span className="text-slate-500 animate-pulse">Calculando e Carregando DSR...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">DSR Automático (605/49)</h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {employee.nome} • MAT: {employee.id_contrato}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-slate-50/30">
                    {!data ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500 mb-4">O DSR ainda não foi calculado para este funcionário neste mês.</p>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-medium"
                                onClick={handleRecalcularDsr}
                            >
                                Forçar Cálculo Agora
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                    <span className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1"><Calendar size={12} /> Dias Úteis</span>
                                    <span className="text-xl font-bold text-slate-800">{data.dias_uteis_mes}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                    <span className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1"><Calendar size={12} /> Dias DSR</span>
                                    <span className="text-xl font-bold text-blue-600">{data.dias_dsr_mes}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                    <span className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1"><Clock size={12} /> Base H.E.</span>
                                    <span className="text-sm font-bold text-slate-800 mt-auto">R$ {data.dsr_horas_extras < 1000 ? data.dsr_horas_extras.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '...'}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                    <span className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1"><DollarSign size={12} /> Base Com.</span>
                                    <span className="text-sm font-bold text-slate-800 mt-auto">R$ {data.dsr_comissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><Calculator size={16} /> Resumo Financeiro</h3>
                                <div className="flex justify-between items-center py-2 border-b border-blue-100/50">
                                    <span className="text-sm text-blue-700">DSR Bruto Apurado</span>
                                    <span className="font-semibold text-blue-900">R$ {data.dsr_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-blue-100/50">
                                    <span className="text-sm text-red-600">Descontos Faltas ({data.faltas_pre_dsr_qtd})</span>
                                    <span className="font-semibold text-red-600">- R$ {data.dsr_desconto_faltas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 mt-1">
                                    <span className="font-bold text-blue-900 uppercase">DSR LÍQUIDO</span>
                                    <span className="text-xl font-bold bg-blue-600 text-white px-3 py-1 rounded-lg">R$ {data.dsr_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <span className="font-semibold text-slate-700 flex items-center gap-2"><Frown size={16} /> Registro de Faltas (Perda de DSR)</span>
                                </div>
                                <div className="p-4 flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Data da Falta Injustificada Pré-DSR</label>
                                        <input type="date" value={dataFalta} onChange={e => setDataFalta(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <button onClick={handleRegistrarFalta} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                                        Registrar Perda
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DsrModal;
