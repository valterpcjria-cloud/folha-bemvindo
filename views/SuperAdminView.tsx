import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    CheckCircle2,
    XCircle,
    Plus,
    Search,
    MoreVertical,
    ShieldCheck,
    TrendingUp,
    CreditCard,
    Edit,
    Trash2
} from 'lucide-react';
import { api, authHeaders } from '../services/mockApi';

interface Empresa {
    id: number;
    razao_social: string;
    cnpj: string;
    slug: string;
    ativa: boolean;
    data_cadastro: string;
    total_funcionarios?: number;
    valor_mensalidade: number;
    plano: string;
    limite_funcionarios: number;
    vencimento_dia: number;
}

const SuperAdminView: React.FC = () => {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: undefined as number | undefined,
        razao_social: '',
        cnpj: '',
        slug: '',
        admin_email: '',
        valor_mensalidade: 0,
        plano: 'BRONZE',
        limite_funcionarios: 10,
        vencimento_dia: 10
    });
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.getCompanies();
            setEmpresas(res.data || []);
        } catch (error: any) {
            console.error('Erro ao carregar empresas:', error);
            alert('ERRO AO CARREGAR EMPRESAS: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // @ts-ignore - Chamada direta para o backend v1
            const response = await fetch(`${(import.meta as any).env?.VITE_API_URL || '/backend/v1'}/companies`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                setFormData({
                    id: undefined,
                    razao_social: '', cnpj: '', slug: '', admin_email: '',
                    valor_mensalidade: 0, plano: 'BRONZE', limite_funcionarios: 10, vencimento_dia: 10
                });
                loadData();
            } else {
                const err = await response.json();
                alert('Erro: ' + (err.error || (formData.id ? 'Falha ao atualizar' : 'Falha ao criar')));
            }
        } catch (error) {
            alert('Erro de conexão ao criar empresa');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (empresa: Empresa) => {
        setFormData({
            id: empresa.id,
            razao_social: empresa.razao_social,
            cnpj: empresa.cnpj || '',
            slug: empresa.slug,
            admin_email: '', // Não editamos o email do admin por aqui por segurança
            valor_mensalidade: empresa.valor_mensalidade,
            plano: empresa.plano,
            limite_funcionarios: empresa.limite_funcionarios,
            vencimento_dia: empresa.vencimento_dia
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number, nome: string) => {
        if (!window.confirm(`TEM CERTEZA que deseja excluir a empresa "${nome}"?\n\nISSO APAGARÁ TODOS OS DADOS (funcionários, usuários, regras) de forma IRREVERSÍVEL!`)) {
            return;
        }

        try {
            const response = await fetch(`${(import.meta as any).env?.VITE_API_URL || '/backend/v1'}/companies?id=${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: authHeaders()
            });

            if (response.ok) {
                loadData();
            } else {
                const err = await response.json();
                alert('Erro ao excluir: ' + (err.error || 'Falha desconhecida'));
            }
        } catch (error) {
            alert('Erro de conexão ao excluir empresa');
        }
    };

    const toggleStatus = async (empresa: Empresa) => {
        try {
            // @ts-ignore
            await fetch(`${(import.meta as any).env?.VITE_API_URL || '/backend/v1'}/companies`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders()
                },
                body: JSON.stringify({ ...empresa, ativa: !empresa.ativa })
            });
            loadData();
        } catch (error) {
            console.error('Erro ao alternar status:', error);
        }
    };

    const filtered = empresas.filter(e =>
        e.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            {/* SaaS Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                            <Building2 size={24} />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                        {loading ? '...' : empresas.length}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Clientes Ativos</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Users size={24} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                        {loading ? '...' : empresas.reduce((acc, curr) => acc + (curr.total_funcionarios || 0), 0)}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Usuários Gerenciados</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                        R$ {loading ? '...' : empresas.reduce((acc, curr) => acc + (Number(curr.valor_mensalidade) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Faturamento MRR</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <ShieldCheck size={24} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">99.9%</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status do Sistema</p>
                </div>
            </div>

            {/* Tenant Manager */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão de Clientes SaaS</h2>
                        <p className="text-sm text-slate-500">Controle de instâncias e faturamento de clientes.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar empresa ou slug..."
                                className="input-clean pl-10 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setFormData({
                                    id: undefined,
                                    razao_social: '', cnpj: '', slug: '', admin_email: '',
                                    valor_mensalidade: 0, plano: 'BRONZE', limite_funcionarios: 10, vencimento_dia: 10
                                });
                                setIsModalOpen(true);
                            }}
                            className="btn-primary flex items-center gap-2 h-10"
                        >
                            <Plus size={18} />
                            <span className="hidden md:inline">Novo Cliente</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Empresa</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Plano / Limite</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Mensalidade</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                                        Carregando inquilinos...
                                    </td>
                                </tr>
                            ) : filtered.map(empresa => (
                                <tr key={empresa.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400">
                                                {empresa.razao_social.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{empresa.razao_social}</p>
                                                <p className="text-xs text-slate-500">{empresa.cnpj}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">
                                                {empresa.plano}
                                            </span>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                                <Users size={10} />
                                                <span>{empresa.total_funcionarios} / {empresa.limite_funcionarios} FUNC</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-700">
                                                R$ {Number(empresa.valor_mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                Venc. Dia {empresa.vencimento_dia}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(empresa)}
                                            className="focus:outline-none"
                                        >
                                            {empresa.ativa ? (
                                                <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-full">
                                                    <CheckCircle2 size={12} /> Ativo
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-wider bg-rose-50 px-2 py-1 rounded-full">
                                                    <XCircle size={12} /> BLOQUEADO
                                                </div>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => handleEdit(empresa)}
                                                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                                title="Editar Empresa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(empresa.id, empresa.razao_social)}
                                                className={`p-2 rounded-lg transition-all ${empresa.id === 1 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                                disabled={empresa.id === 1}
                                                title={empresa.id === 1 ? "Empresa Principal não pode ser excluída" : "Excluir Empresa"}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Nova Empresa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    {formData.id ? 'Editar Inquilino' : 'Novo Inquilino SaaS'}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {formData.id ? 'Atualização de configurações do cliente' : 'Configuração Automática ativada'}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Razão Social</label>
                                    <input
                                        required
                                        type="text"
                                        className="input-clean"
                                        value={formData.razao_social}
                                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                                        placeholder="Ex: Empresa de Teste Ltda"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">CNPJ</label>
                                        <input
                                            type="text"
                                            className="input-clean"
                                            value={formData.cnpj}
                                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                            placeholder="00.000.000/0001-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Slug (ID Único)</label>
                                        <input
                                            required
                                            type="text"
                                            className="input-clean font-mono"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                            placeholder="empresa-exemplo"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Plano</label>
                                        <select
                                            className="input-clean"
                                            value={formData.plano}
                                            onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                                        >
                                            <option value="BRONZE">BRONZE (Lite)</option>
                                            <option value="SILVER">SILVER (Standard)</option>
                                            <option value="GOLD">GOLD (Premium)</option>
                                            <option value="PLATINUM">PLATINUM (Enterprise)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Limite Func.</label>
                                        <input
                                            type="number"
                                            className="input-clean"
                                            value={formData.limite_funcionarios}
                                            onChange={(e) => setFormData({ ...formData, limite_funcionarios: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Mensalidade (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input-clean"
                                            value={formData.valor_mensalidade}
                                            onChange={(e) => setFormData({ ...formData, valor_mensalidade: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Vencimento (Dia)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            className="input-clean"
                                            value={formData.vencimento_dia}
                                            onChange={(e) => setFormData({ ...formData, vencimento_dia: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                {!formData.id && (
                                    <div>
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Email do Administrador</label>
                                        <input
                                            required
                                            type="email"
                                            className="input-clean"
                                            value={formData.admin_email}
                                            onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                                            placeholder="admin@empresa.com.br"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-2 font-bold italic">
                                            * A senha inicial do novo admin será: <span className="text-indigo-600">frimelo123</span> (troca obrigatória no 1º acesso)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-[2] bg-indigo-600 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Processando...' : (formData.id ? 'Salvar Alterações' : 'Ativar Empresa')}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}
        </div >
    );
};

export default SuperAdminView;
