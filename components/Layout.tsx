import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  FileSpreadsheet,
  LogOut,
  KeyRound,
  Calculator,
  History,
  Globe,
  UserCog,
  PieChart,
  Upload,
  Zap,
  Activity,
  Printer,
  Building2,
  Variable,
  Download,
  BookOpen,
  Layers
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../config';
import { api } from '../services/mockApi';
import { confirmarDescarteAlteracoes, hasAlteracoesPendentes } from '../utils/unsavedChanges';
import UnsavedChangesDialog from './UnsavedChangesDialog';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, selectedCompanyId, setCompanyContext } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (user?.perfil === 'SUPERADMIN' || user?.perfil === 'ADMIN') {
      api.getCompanies()
        .then(res => setCompanies(res.data || []))
        .catch(err => {
          console.error("Layout: Erro ao carregar empresas contextuais:", err);
          setCompanies([]);
        });
    }
  }, [user]);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/funcionarios', label: 'Funcionários', icon: Users },
    { path: '/setores', label: 'Setores e Cargos', icon: Layers }, // Bem Vindo (Fase A.1)
    { path: '/lancamentos', label: 'Lançamentos', icon: Calculator },
    { path: '/eventos', label: 'Eventos', icon: Settings },
    { path: '/competencias', label: 'Competências', icon: CalendarDays },
    { path: '/feriados', label: 'Feriados', icon: CalendarDays },
    { path: '/folha', label: 'Folha Pagamento', icon: FileSpreadsheet },
    { path: '/fechamento-expresso', label: 'Fechamento Expresso', icon: Activity },
    { path: '/contracheques', label: 'Contracheques', icon: Printer },
    { path: '/relatorios', label: 'Relatórios', icon: PieChart },
    { path: '/manual', label: 'Manual do Sistema', icon: BookOpen },
    // { path: '/relacao-calculo', label: 'Relação de Cálculo', icon: Calculator }, // oculto da sidebar
    ...(user?.perfil === 'ADMIN' || user?.perfil === 'SUPERADMIN' ? [
      { path: '/importar', label: 'Importação', icon: Upload },
      { path: '/exportar', label: 'Exportação', icon: Download },
    ] : []),
    ...(user?.perfil === 'SUPERADMIN' ? [
      { path: '/parametros', label: 'Parametros', icon: Settings },
      { path: '/formulas', label: 'Fórmulas', icon: Variable },
      { path: '/auditoria', label: 'Logs Sistema', icon: History },
      { path: '/usuarios', label: 'Usuários', icon: UserCog },
      { path: '/superadmin', label: 'Gestão SaaS', icon: Building2 },
      { path: '/deep-cleanup', label: 'Limpeza Crítica', icon: Zap },
      { path: '/stress', label: 'Teste Estresse', icon: Activity }
    ] : []),
  ];

  const handleAlterarSenha = async () => {
    if (!(await confirmarDescarteAlteracoes())) return;
    navigate('/trocar-senha');
  };

  const handleLogout = async () => {
    if (!(await confirmarDescarteAlteracoes())) return;
    logout();
    navigate('/');
  };

  const isEdivanMelo = user?.email?.toLowerCase?.()?.endsWith('@edivanmelo.com');
  const appTitle = isEdivanMelo ? 'Folha Edivan Melo' : 'Folha Bem Vindo';

  // Determine active label for header
  const activeItem = menuItems.find(item => item.path === location.pathname) ||
    menuItems.find(item => location.pathname.startsWith(item.path) && item.path !== '/') ||
    (location.pathname === '/' ? menuItems.find(i => i.path === '/') : null);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Modern Sidebar (Dark Indigo/Slate) */}
      <aside className="w-64 flex flex-col shrink-0 bg-slate-900 border-r border-slate-800/50 z-50 shadow-2xl shadow-black/20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center font-bold text-lg text-white rounded-lg shadow-glow">B</div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white uppercase tracking-wider font-display">{appTitle}</h1>
            <span className="text-[10px] font-medium text-slate-400">v{CONFIG.VERSION}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={async (e) => {
                  // v4.55.0/v4.56.0: evita perder edições do grid ao trocar de tela
                  if (item.path === location.pathname || !hasAlteracoesPendentes()) return;
                  e.preventDefault();
                  if (await confirmarDescarteAlteracoes()) navigate(item.path);
                }}
                className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium group ${isActive
                  ? 'bg-sky-500/10 text-sky-400 shadow-sm border border-sky-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1'
                  }`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={`${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-800/50 rounded-lg border border-slate-700/50 shadow-inner">
            <div className="w-8 h-8 bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-xs rounded-full ring-2 ring-slate-800">
              {user?.nome?.[0] || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">{user?.nome || 'Usuário'}</span>
              <span className="text-[10px] text-sky-400 font-medium capitalize">{user?.perfil || 'Admin'}</span>
            </div>
          </div>
          <button
            onClick={handleAlterarSenha}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-1 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all duration-200 text-xs font-medium border border-transparent hover:border-sky-500/20"
          >
            <KeyRound size={14} />
            <span>Alterar Senha</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-xs font-medium border border-transparent hover:border-red-500/20"
          >
            <LogOut size={14} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f8fafc]">
        {/* Glassmorphism Topbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-40 transition-all">
          <h2 className="text-xl font-bold text-slate-800 font-display tracking-tight">
            {activeItem?.label || 'Sistema'}
          </h2>

          <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
            {(user?.perfil === 'SUPERADMIN' || user?.perfil === 'ADMIN') && (
              <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 min-w-[200px] hover:border-sky-400 hover:shadow-soft transition-all duration-200 shadow-sm">
                <Building2 size={14} className="text-sky-500" />
                <select
                  className="bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-700 w-full cursor-pointer uppercase"
                  value={selectedCompanyId || ''}
                  onChange={async (e) => {
                    const novaEmpresa = e.target.value ? Number(e.target.value) : null;
                    if (!(await confirmarDescarteAlteracoes())) return;
                    setCompanyContext(novaEmpresa);
                  }}
                >
                  <option value="">🏠 MINHA EMPRESA (PADRÃO)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.razao_social}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Globe size={14} className="text-slate-400" />
              <span>{CONFIG.SERVER_IP}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>

      {/* v4.56.0: diálogo global de alterações não salvas */}
      <UnsavedChangesDialog />
    </div>
  );
};

export default Layout;
