import React, { useState } from 'react';
import { CONFIG } from '../config';
import { LogIn, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/mockApi';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await api.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Acesso Negado: Credenciais Incorretas.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 selection:bg-sky-500/30">

      {/* Left Panel - Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black opacity-90"></div>

        {/* Decorative Blurred Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }}></div>

        <div className="relative z-10 flex flex-col justify-between p-16 h-full text-white w-full">
          <div>
            <div className="flex items-center gap-4 mb-16">
              <div className="w-14 h-14 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-xl shadow-blue-500/30 border border-white/10 backdrop-blur-md">
                F
              </div>
              <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">Sistema Folha RH</span>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.15] mb-6">
              Gestão de Folha<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-200">Inteligente e Segura</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-md leading-relaxed font-medium">
              Plataforma premium para controle de folha de pagamento, contracheques e rotinas de departamento pessoal com precisão de IA.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm self-start">
            <div className="p-2.5 bg-sky-500/20 rounded-xl">
              <ShieldCheck size={24} className="text-sky-400" />
            </div>
            <div>
              <p className="font-bold text-slate-200">Ambiente Protegido</p>
              <p>Criptografia de ponta a ponta e compliance com a LGPD.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative bg-white">

        {/* Background blobs for mobile */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-blue-900 via-slate-900 to-sky-900 opacity-5 rounded-b-[100px]"></div>

        <div className="w-full max-w-md relative z-10">

          {/* Header Mobile Only */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl mb-6 shadow-xl shadow-blue-500/20">
              F
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sistema RH</h2>
            <p className="text-slate-500 mt-2 font-medium">Folha Profissional</p>
          </div>

          {/* Header Desktop */}
          <div className="hidden lg:block mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Acesso ao Sistema</h2>
            <p className="text-slate-500 mt-2 font-medium">Insira suas credenciais corporativas para continuar.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Email Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  placeholder="usuario@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="block text-sm font-semibold text-slate-700">Senha</label>
                <a href="#" className="text-sm font-bold text-sky-600 hover:text-sky-700 hover:underline transition-all">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium tracking-widest"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] mt-8 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-sky-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="tracking-wide">Entrar no Sistema</span>
                  <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-14 text-center">
            <p className="text-xs font-semibold text-slate-400">
              &copy; {new Date().getFullYear()} Sistema Folha RH &bull; Versão {CONFIG.VERSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;