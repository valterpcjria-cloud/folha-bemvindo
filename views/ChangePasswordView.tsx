/**
 * ChangePasswordView - Troca de senha (v4.57.0)
 * Modo obrigatório: 1º acesso / senha redefinida / senha padrão — bloqueia o sistema até trocar.
 * Modo voluntário: "Alterar senha" no menu do usuário.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, ShieldCheck, AlertCircle, CheckCircle2, Circle, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';

const regras = [
    { id: 'tamanho', label: 'Mínimo de 8 caracteres', ok: (s: string) => s.length >= 8 },
    { id: 'letra', label: 'Pelo menos uma letra', ok: (s: string) => /[A-Za-z]/.test(s) },
    { id: 'numero', label: 'Pelo menos um número', ok: (s: string) => /[0-9]/.test(s) },
];

const inputClass = 'w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all';

const ChangePasswordView: React.FC = () => {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const obrigatoria = Boolean(user?.must_change_password);

    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState(false);

    const regrasOk = regras.every(r => r.ok(novaSenha));
    const confirmacaoOk = novaSenha.length > 0 && novaSenha === confirmacao;
    const podeSalvar = senhaAtual.length > 0 && regrasOk && confirmacaoOk && novaSenha !== senhaAtual && !isSaving;

    const destinoInicial = user?.perfil === 'COLABORADOR' ? '/portal' : '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!podeSalvar) return;
        setIsSaving(true);
        setErro('');
        try {
            const atualizado = await api.changePassword(senhaAtual, novaSenha);
            login(atualizado);
            setSucesso(true);
            setTimeout(() => navigate(destinoInicial, { replace: true }), 1200);
        } catch (err: any) {
            setErro(err.message || 'Não foi possível alterar a senha.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSair = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/70 p-8">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 mb-4">
                        <KeyRound className="text-white" size={26} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">
                        {obrigatoria ? 'Defina sua nova senha' : 'Alterar minha senha'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-2">
                        {obrigatoria
                            ? `Olá${user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}! Por segurança, defina uma nova senha antes de continuar.`
                            : 'Informe sua senha atual e escolha uma nova senha.'}
                    </p>
                </div>

                {sucesso ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-emerald-700">
                        <CheckCircle2 size={40} />
                        <p className="font-semibold">Senha alterada com sucesso!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="password" autoComplete="current-password" className={inputClass}
                                placeholder="Senha atual (a que você usou para entrar)"
                                value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} autoFocus />
                        </div>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="password" autoComplete="new-password" className={inputClass}
                                placeholder="Nova senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
                        </div>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="password" autoComplete="new-password" className={inputClass}
                                placeholder="Confirme a nova senha" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} />
                        </div>

                        <ul className="space-y-1.5 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                            {regras.map(r => {
                                const ok = r.ok(novaSenha);
                                return (
                                    <li key={r.id} className={`flex items-center gap-2 ${ok ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />} {r.label}
                                    </li>
                                );
                            })}
                            <li className={`flex items-center gap-2 ${confirmacaoOk ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {confirmacaoOk ? <CheckCircle2 size={14} /> : <Circle size={14} />} Confirmação igual à nova senha
                            </li>
                            {novaSenha.length > 0 && novaSenha === senhaAtual && (
                                <li className="flex items-center gap-2 text-red-600">
                                    <AlertCircle size={14} /> A nova senha deve ser diferente da atual
                                </li>
                            )}
                        </ul>

                        {erro && (
                            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                <AlertCircle size={16} /> {erro}
                            </div>
                        )}

                        <button type="submit" disabled={!podeSalvar}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            {isSaving ? 'Salvando...' : 'Salvar nova senha'}
                        </button>

                        {obrigatoria ? (
                            <button type="button" onClick={handleSair}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-red-600 transition-colors">
                                <LogOut size={14} /> Sair
                            </button>
                        ) : (
                            <button type="button" onClick={() => navigate(-1)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                                <ArrowLeft size={14} /> Voltar
                            </button>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordView;
