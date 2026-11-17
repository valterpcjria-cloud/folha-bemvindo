import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Trash2,
    ShieldAlert,
    Building2,
    Users,
    CheckSquare,
    Square,
    Lock,
    Unlock,
    Loader2
} from 'lucide-react';
import { api, authHeaders } from '../services/mockApi';

interface Item {
    id: number;
    label: string;
    sublabel: string;
    safe: boolean;
}

const DeepCleanupView: React.FC = () => {
    const [tab, setTab] = useState<'companies' | 'users'>('companies');
    const [items, setItems] = useState<Item[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [password, setPassword] = useState('');
    const [phrase, setPhrase] = useState('');
    const [processing, setProcessing] = useState(false);

    const PHRASE_REQUIRED = "EXCLUIR DEFINITIVAMENTE";

    const loadItems = async () => {
        setLoading(true);
        setSelectedIds([]);
        try {
            if (tab === 'companies') {
                const res = await api.getCompanies();
                setItems(res.data.map((c: any) => ({
                    id: c.id,
                    label: c.razao_social,
                    sublabel: `${c.cnpj || 'Sem CNPJ'} | ${c.total_funcionarios || 0} funcionários`,
                    safe: c.id > 1 // Bloqueia ID 1
                })));
            } else {
                // @ts-ignore
                const res = await fetch(`${import.meta.env.VITE_API_URL || '/backend/v1'}/users`, {
                    credentials: 'include',
                    headers: authHeaders()
                });
                const data = await res.json();
                const currentUser = api.getCurrentUser();
                setItems(data.map((u: any) => ({
                    id: u.id,
                    label: u.nome,
                    sublabel: `${u.email} | Perfil: ${u.perfil}`,
                    safe: u.id !== currentUser?.id
                })));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, [tab]);

    const toggleSelect = (id: number, safe: boolean) => {
        if (!safe) return;
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchDelete = async () => {
        if (phrase !== PHRASE_REQUIRED) return;

        setProcessing(true);
        try {
            const response = await fetch(`${(import.meta as any).env.VITE_API_URL || '/backend/v1'}/deep_cleanup`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders()
                },
                body: JSON.stringify({
                    type: tab,
                    ids: selectedIds,
                    confirm_password: password // Backend validará perfil mas deixamos payload preparado
                })
            });

            if (response.ok) {
                alert('Limpeza crítica concluída com sucesso.');
                setIsConfirming(false);
                setPassword('');
                setPhrase('');
                loadItems();
            } else {
                const err = await response.json();
                alert('Falha crítica: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (error) {
            alert('Erro de conexão durante operação crítica');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Crisis Header */}
            <div className="bg-red-600 p-8 rounded-2xl text-white shadow-2xl shadow-red-200 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                    <ShieldAlert size={160} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic">Terminal de Exclusão Crítica</h1>
                    </div>
                    <p className="text-red-100 font-medium max-w-2xl leading-relaxed">
                        Área restrita para manutenção profunda de dados. Ações realizadas aqui ignoram validações convencionais
                        e removem todos os registros dependentes permanentemente.
                    </p>
                </div>
            </div>

            {/* Selection Engine */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seletor de Entidade</p>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                            <button
                                onClick={() => setTab('companies')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${tab === 'companies' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Building2 size={18} />
                                Empresas / Tenants
                            </button>
                            <button
                                onClick={() => setTab('users')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${tab === 'users' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Users size={18} />
                                Usuários Globais
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border-2 border-red-100 shadow-lg shadow-red-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Métricas de Risco</p>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-4xl font-black text-red-600 tracking-tighter">{selectedIds.length}</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase">Itens p/ Remoção</p>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    disabled={selectedIds.length === 0}
                                    onClick={() => setIsConfirming(true)}
                                    className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                                >
                                    <Trash2 size={20} />
                                    Executar Limpeza
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Engine */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-black text-slate-800 uppercase tracking-tight">Seleção de Alvos</h2>
                            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded-full font-bold text-slate-600 uppercase">
                                {loading ? 'Sincronizando...' : `${items.length} itens encontrados`}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin text-red-500" size={32} />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleSelect(item.id, item.safe)}
                                            className={`group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${!item.safe ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' :
                                                selectedIds.includes(item.id) ? 'bg-red-50 border-red-200 shadow-md' : 'bg-white border-slate-100 hover:border-red-100 hover:bg-slate-50/50'
                                                }`}
                                        >
                                            {selectedIds.includes(item.id) ?
                                                <CheckSquare className="text-red-600" size={20} /> :
                                                <Square className="text-slate-300" size={20} />
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 uppercase truncate">
                                                    {item.label}
                                                    {!item.safe && <span className="ml-2 text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-black tracking-widest italic">PROTEGIDO</span>}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                                            </div>
                                            <div className="text-[10px] font-mono font-black text-slate-300 group-hover:text-red-300">
                                                ID {item.id}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Crisis Confirmation Modal */}
            {isConfirming && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border-4 border-red-600">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                                <ShieldAlert size={40} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Ação Irreversível</h2>
                                <p className="text-slate-500 font-medium">
                                    Você está prestes a remover <span className="text-red-600 font-black">{selectedIds.length} {tab === 'companies' ? 'empresas' : 'usuários'}</span>.
                                    Esta ação não pode ser desfeita e afetará todos os relatórios históricos.
                                </p>
                            </div>

                            <div className="space-y-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>Confirme sua Identidade</span>
                                        <Lock size={12} />
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Sua senha de Super Admin"
                                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:border-red-500 focus:bg-white transition-all outline-none"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>Digite exatamente a frase abaixo:</span>
                                        <span className="text-red-500">{PHRASE_REQUIRED}</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Digite a frase de veredito"
                                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 font-black text-red-600 placeholder:text-slate-300 uppercase focus:border-red-500 focus:bg-white transition-all outline-none"
                                        value={phrase}
                                        onChange={(e) => setPhrase(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                                >
                                    Abortar
                                </button>
                                <button
                                    disabled={phrase !== PHRASE_REQUIRED || !password || processing}
                                    onClick={handleBatchDelete}
                                    className="px-6 py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                                >
                                    {processing ? <Loader2 className="animate-spin" size={20} /> : <Unlock size={20} />}
                                    Confirmar Destruição
                                </button>
                            </div>
                        </div>
                        <div className="bg-red-600 p-3 text-center text-[10px] font-black text-white uppercase tracking-[0.2em]">
                            Safety Protocol Level 3 Active
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeepCleanupView;
