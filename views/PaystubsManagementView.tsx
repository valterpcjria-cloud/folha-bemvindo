import React, { useState, useEffect, useMemo } from 'react';
import {
    Printer,
    Search,
    CheckSquare,
    Square,
    ChevronLeft,
    ChevronRight,
    Loader2,
    FileText
} from 'lucide-react';
import { Funcionario, EventoFolha, Competencia, Lancamento } from '../types';
import { api } from '../services/mockApi';
import { PrintBatchView } from '../components/PrintBatchView';

const PaystubsManagementView: React.FC = () => {
    const [competencias, setCompetencias] = useState<Competencia[]>([]);
    const [selectedComp, setSelectedComp] = useState<Competencia | null>(null);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [eventos, setEventos] = useState<EventoFolha[]>([]);
    const [lancamentos, setLancamentos] = useState<Record<string, Partial<Lancamento>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmps, setSelectedEmps] = useState<Set<number>>(new Set());

    // Print state
    const [isPrinting, setIsPrinting] = useState(false);
    const [printingEmps, setPrintingEmps] = useState<Funcionario[]>([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const init = async () => {
            try {
                const [comps, funcs, evs] = await Promise.all([
                    api.getCompetencias(),
                    api.getFuncionarios(),
                    api.getEventos()
                ]);
                setCompetencias(comps);
                setFuncionarios(funcs);
                setEventos(evs);

                if (comps.length > 0) {
                    const savedId = sessionStorage.getItem('selectedCompId');
                    const initialId = savedId && comps.find(c => c.id === Number(savedId)) ? Number(savedId) : comps[0].id;
                    const comp = comps.find(c => c.id === initialId) || comps[0];
                    setSelectedComp(comp);

                    const data = await api.getLancamentos(comp.id);
                    const mapped: Record<string, Partial<Lancamento>> = {};
                    data.forEach(l => {
                        mapped[`${l.funcionario_id}_${l.evento_id}`] = l;
                    });
                    setLancamentos(mapped);
                }
            } catch (e) {
                console.error("Erro ao carregar dados:", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleCompChange = async (compId: number) => {
        const comp = competencias.find(c => c.id === compId) || null;
        setSelectedComp(comp);
        if (comp) {
            sessionStorage.setItem('selectedCompId', comp.id.toString());
            const data = await api.getLancamentos(comp.id);
            const mapped: Record<string, Partial<Lancamento>> = {};
            data.forEach(l => {
                mapped[`${l.funcionario_id}_${l.evento_id}`] = l;
            });
            setLancamentos(mapped);
        }
    };

    const filteredFuncionarios = useMemo(() => {
        return funcionarios.filter(f =>
            f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.id_contrato.toString().includes(searchTerm)
        );
    }, [funcionarios, searchTerm]);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredFuncionarios.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedFuncionarios = filteredFuncionarios.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const toggleSelectAll = () => {
        if (selectedEmps.size === filteredFuncionarios.length) setSelectedEmps(new Set());
        else setSelectedEmps(new Set(filteredFuncionarios.map(f => f.id)));
    };

    const toggleSelect = (id: number) => {
        const next = new Set(selectedEmps);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedEmps(next);
    };

    const handlePrintSelected = () => {
        const emps = funcionarios.filter(f => selectedEmps.has(f.id));
        if (emps.length === 0) return;
        setPrintingEmps(emps);
        setIsPrinting(true);
    };

    const handleDownloadOfficialPDF = async () => {
        if (!selectedComp) return;
        const compStr = `${selectedComp.mes.toString().padStart(2, '0')}/${selectedComp.ano}`;
        const employeeIds = selectedEmps.size > 0 ? Array.from(selectedEmps) : null;

        try {
            setIsLoading(true);
            await api.downloadContrachequesPDF(compStr, employeeIds);
        } catch (e: any) {
            alert("Erro ao gerar PDF: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-sky-600" size={32} />
            </div>
        );
    }

    // Modo impressão profissional — 3 contracheques por página A4
    if (isPrinting) {
        return (
            <PrintBatchView
                employees={printingEmps}
                events={eventos}
                lancamentosMap={lancamentos}
                competenciaLabel={
                    selectedComp
                        ? `${selectedComp.mes.toString().padStart(2, '0')}/${selectedComp.ano}`
                        : ''
                }
                onClose={() => setIsPrinting(false)}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Printer className="text-sky-600" size={28} />
                        Gestão de Contracheques
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Impressão em lote e visualização rápida por competência.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Competência</label>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            value={selectedComp?.id || ''}
                            onChange={(e) => handleCompChange(Number(e.target.value))}
                        >
                            {competencias.map(c => (
                                <option key={c.id} value={c.id}>{c.mes.toString().padStart(2, '0')}/{c.ano}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handlePrintSelected}
                        disabled={selectedEmps.size === 0}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
                        title="Impressão rápida (HTML)"
                    >
                        <Printer size={18} />
                        Rápido ({selectedEmps.size})
                    </button>

                    <button
                        onClick={handleDownloadOfficialPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                    >
                        <FileText size={18} />
                        Gerar PDF Oficial (TCPDF)
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou matrícula..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs font-bold text-slate-500 hover:text-sky-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-100 hover:bg-sky-50 transition-all flex items-center gap-2 uppercase tracking-wide"
                        >
                            {selectedEmps.size === filteredFuncionarios.length ? <CheckSquare size={14} /> : <Square size={14} />}
                            Selecionar Filtro
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="w-16 px-4 py-3 text-center"></th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrícula</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tem Lançamento?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedFuncionarios.map(func => {
                                const isSelected = selectedEmps.has(func.id);
                                const hasLancamentos = Object.keys(lancamentos).some(k => k.startsWith(`${func.id}_`));

                                return (
                                    <tr
                                        key={func.id}
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-sky-50/30' : ''}`}
                                        onClick={() => toggleSelect(func.id)}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <div className={`p-1 rounded transition-colors ${isSelected ? 'text-sky-600' : 'text-slate-300'}`}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{func.id_contrato}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 uppercase tracking-tight">{func.nome}</span>
                                                <span className="text-[10px] text-slate-400 font-mono italic">ID_SYSTEM: {func.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{func.cargo || 'Não definido'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${func.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {func.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {hasLancamentos ? (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                                    <CheckSquare size={12} /> Sincronizado
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase italic">-- Sem Dados --</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredFuncionarios.length === 0 && (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} strokeWidth={1} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium italic">Nenhum funcionário encontrado para o filtro atual.</p>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                            Mostrando <span className="font-semibold text-slate-700">{startIndex + 1}</span> até <span className="font-semibold text-slate-700">{Math.min(startIndex + ITEMS_PER_PAGE, filteredFuncionarios.length)}</span> de <span className="font-semibold text-slate-700">{filteredFuncionarios.length}</span> registros
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === pageNum
                                                    ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-sky-600 shadow-sm'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                        <span className="text-slate-400 px-1">...</span>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-all shadow-sm"
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaystubsManagementView;
