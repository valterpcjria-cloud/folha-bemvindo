import React, { useState, useEffect } from 'react';
import {
    Activity,
    CheckCircle2,
    XCircle,
    RefreshCcw,
    Play,
    AlertCircle,
    Users
} from 'lucide-react';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';

// Types
interface EmpregadoExcecao {
    id: number;
    id_funcionario: number;
    nome: string;
    cpf: string;
    detalhe_erro: string;
}

interface FilaStats {
    total: number;
    pendente: number;
    erro: number;
    concluido: number;
}

interface SnapshotData {
    id: number;
    status: 'PENDENTE' | 'VALIDADO' | 'ERRO' | 'PROCESSANDO' | 'CONCLUIDO';
    total_colaboradores: number;
    erros?: string;
    excecoes: EmpregadoExcecao[];
    stats_fila: FilaStats;
}

const ExpressClosingView: React.FC = () => {
    const { selectedCompanyId } = useAuth();
    const navigate = useNavigate();
    const [competencias, setCompetencias] = useState<any[]>([]);
    const [selectedComp, setSelectedComp] = useState<number | null>(null);
    const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);

    const [loadingSync, setLoadingSync] = useState(false);
    const [loadingProcess, setLoadingProcess] = useState(false);
    const [message, setMessage] = useState('');

    // Load Competencias
    useEffect(() => {
        loadCompetencias();
    }, [selectedCompanyId]);

    // Load Snapshot when competence selected
    useEffect(() => {
        if (selectedComp) {
            loadSnapshot(selectedComp);
        } else {
            setSnapshot(null);
        }
    }, [selectedComp]);

    const loadCompetencias = async () => {
        try {
            const res: any = await api.getCompetencias();
            // Depending on mockApi returning bare array or .data wrapper
            const comps = Array.isArray(res) ? res : (res.data || []);
            setCompetencias(comps);
            const openComp = comps.find((c: any) => c.status === 'ABERTA');
            if (openComp) {
                setSelectedComp(openComp.id);
            }
        } catch (e) {
            console.error("Erro ao carregar competencias", e);
        }
    };

    const loadSnapshot = async (comp_id: number) => {
        try {
            const data = await api.getExpressClosing(comp_id);
            setSnapshot(data.data || null);
        } catch (e) {
            console.error("Erro ao carregar snapshot", e);
        }
    };

    const handleSync = async () => {
        if (!selectedComp) return;
        setLoadingSync(true);
        setMessage('Sincronizando e realizando pré-validação (Shadow Calc)...');
        try {
            const resData = await api.syncExpressClosing(selectedComp);

            if (resData.success) {
                setMessage(`Sincronização concluída. Status: ${resData.status}. Erros encontrados: ${resData.total_erros}`);
                await loadSnapshot(selectedComp);
            } else {
                setMessage(`Erro: ${resData.error || 'Falha na sincronização'}`);
            }
        } catch (e: any) {
            setMessage(`Erro de conexão ao sincronizar: ${e.message}`);
        } finally {
            setLoadingSync(false);
        }
    };

    const processBatchRecursive = async (id_snap: number) => {
        try {
            const resData = await api.processExpressClosing(selectedComp!, id_snap);

            if (resData.warning) { // Throttled handler
                // Throttling ativado
                setMessage(`Servidor sob alta carga. Pausando por 5 segundos...`);
                setTimeout(() => processBatchRecursive(id_snap), 5000);
                return;
            }

            if (!resData.success) {
                setMessage(`Erro no processamento: ${resData.error || resData.detalhe}`);
                setLoadingProcess(false);
                return;
            }

            if (resData.finished) {
                setMessage('Fechamento Expresso concluído com sucesso!');
                await loadSnapshot(selectedComp!);
                setLoadingProcess(false);
                return;
            } else {
                // Continua processando o próximo lote
                setMessage(`Processado lote de ${resData.processed} funcionários...`);
                await loadSnapshot(selectedComp!); // Atualiza tela
                // Pequeno delay para respirar
                setTimeout(() => processBatchRecursive(id_snap), 1000);
            }

        } catch (e: any) {

            // Verifica Throttling da string base message
            if (e.message && e.message.includes('429')) {
                setMessage(`Servidor sob alta carga. Pausando por 5 segundos...`);
                setTimeout(() => processBatchRecursive(id_snap), 5000);
                return;
            }

            setMessage(`Erro de conexão durante o processamento: ${e.message}`);
            setLoadingProcess(false);
        }
    };


    const handleProcess = async () => {
        if (!snapshot || !selectedComp) return;

        // Hard rule validation bypass check (Interface level)
        if (snapshot.status === 'ERRO' || snapshot.stats_fila.erro > 0) {
            if (!window.confirm('Existem erros de validação críticos. Continuar irá ignorar os funcionários com erro. Confirmar?')) {
                return;
            }
        }

        setLoadingProcess(true);
        setMessage('Iniciando processamento em lotes...');
        await processBatchRecursive(snapshot.id);
    };

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'VALIDADO': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'ERRO': return 'text-red-600 bg-red-50 border-red-200';
            case 'CONCLUIDO': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'PROCESSANDO': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'PENDENTE': default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-sky-600" />
                        Cockpit Fechamento Expresso
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gestão de alto desempenho da folha de pagamento via Sincronização e Lotes.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                            Competência para Fechamento
                        </label>
                        <select
                            className="w-full max-w-xs px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                            value={selectedComp || ''}
                            onChange={(e) => setSelectedComp(Number(e.target.value))}
                            disabled={loadingSync || loadingProcess}
                        >
                            <option value="" disabled>Selecione...</option>
                            {competencias.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.mes.toString().padStart(2, '0')}/{c.ano} {c.status === 'ABERTA' ? '(Aberta)' : '(Fechada)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 items-end">
                        <button
                            onClick={handleSync}
                            disabled={loadingSync || loadingProcess || !selectedComp}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCcw size={18} className={loadingSync ? 'animate-spin' : ''} />
                            {loadingSync ? 'Sincronizando...' : '1. Sincronizar & Validar'}
                        </button>

                        <button
                            onClick={handleProcess}
                            disabled={loadingSync || loadingProcess || !snapshot || snapshot.status === 'CONCLUIDO'}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <Play size={18} className={loadingProcess ? 'animate-pulse' : ''} />
                            {loadingProcess ? 'Processando Lotes...' : '2. Fechar Expresso'}
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="mb-6 p-4 rounded-lg bg-sky-50 text-sky-800 border border-sky-100 flex items-center gap-3 text-sm">
                        <Activity size={18} className="animate-pulse" />
                        <strong>Sistema:</strong> {message}
                    </div>
                )}

                {/* Semaphore Vision */}
                {snapshot ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className={`p-4 rounded-lg border ${getStatusColor(snapshot.status)} flex flex-col justify-center items-center text-center`}>
                            <span className="text-xs font-bold uppercase tracking-wider mb-2">Status do Motor</span>
                            <div className="flex items-center gap-2">
                                {snapshot.status === 'VALIDADO' || snapshot.status === 'CONCLUIDO' ? <CheckCircle2 size={24} /> :
                                    snapshot.status === 'ERRO' ? <XCircle size={24} /> :
                                        <Activity size={24} />}
                                <span className="text-lg font-black">{snapshot.status}</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-center items-center text-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mapeados</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-800">{snapshot.stats_fila.total}</span>
                                <Users size={16} className="text-slate-400" />
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border border-red-200 bg-red-50 flex flex-col justify-center items-center text-center">
                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Exceções Ccríticas</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-red-700">{snapshot.stats_fila.erro}</span>
                                <AlertCircle size={16} className="text-red-500" />
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 flex flex-col justify-center items-center text-center">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Processados (Lotes)</span>
                            <div className="w-full bg-blue-200 rounded-full h-2.5 mt-2 mb-1">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${snapshot.stats_fila.total > 0 ? (snapshot.stats_fila.concluido / snapshot.stats_fila.total) * 100 : 0}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-800">
                                {snapshot.stats_fila.concluido} / {snapshot.stats_fila.total}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl mb-6 bg-slate-50">
                        <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-600">Nenhum Snapshot Ativo</h3>
                        <p className="text-slate-400 text-sm mt-1">Execute a validação (Passo 1) para espelhar a base legado e mapear inconsistências.</p>
                    </div>
                )}

                {/* Exception Management Dashboard */}
                {snapshot && snapshot.excecoes && snapshot.excecoes.length > 0 && (
                    <div className="mt-8 border border-red-200 rounded-xl overflow-hidden">
                        <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3">
                            <AlertCircle className="text-red-600" />
                            <h3 className="font-bold text-red-800">Semaforo Vermelho: Gestão de Exceções</h3>
                            <span className="ml-auto text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold">
                                Bloqueio Ativo (Hard Rule)
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-auto">
                            {snapshot.excecoes.map(exc => (
                                <div key={exc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-slate-50">
                                    <div>
                                        <div className="font-bold text-slate-800">{exc.nome}</div>
                                        <div className="text-sm text-slate-500">CPF: {exc.cpf}</div>
                                    </div>
                                    <div className="text-sm text-red-600 flex-1 max-w-2xl bg-red-50 p-2 rounded border border-red-100">
                                        <strong>Motivo:</strong> {exc.detalhe_erro}
                                    </div>
                                    <button
                                        onClick={() => navigate('/lancamentos')}
                                        className="text-sm text-sky-600 font-medium hover:underline whitespace-nowrap"
                                    >
                                        Ajustar Cadastro &rarr;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ExpressClosingView;
