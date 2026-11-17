import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { THEME } from '../constants/theme';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import ErrorBoundary from '../components/ErrorBoundary';

// Lazy loaded views for better performance
const DashboardView = lazy(() => import('../views/DashboardView'));
const EmployeesView = lazy(() => import('../views/EmployeesView'));
const EventsView = lazy(() => import('../views/EventsView'));
const CompetenceView = lazy(() => import('../views/CompetenceView'));
const PayrollGridView = lazy(() => import('../views/PayrollGridView'));
const ExportView = lazy(() => import('../views/ExportView'));
const ExpressClosingView = lazy(() => import('../views/ExpressClosingView'));
const ReportsView = lazy(() => import('../views/ReportsView'));
const AuditLogsView = lazy(() => import('../views/AuditLogsView'));
const UsersView = lazy(() => import('../views/UsersView'));
const DeepCleanupView = lazy(() => import('../views/DeepCleanupView'));
const SettingsView = lazy(() => import('../views/SettingsView'));
const RelacaoCalculoView = lazy(() => import('../views/RelacaoCalculoView'));
const ImportView = lazy(() => import('../views/ImportView'));
const FormulasView = lazy(() => import('../views/FormulasView'));
const LoginView = lazy(() => import('../views/LoginView'));
const EmployeePortalView = lazy(() => import('../views/EmployeePortalView'));
const StressTestView = lazy(() => import('../views/StressTestView'));
const PaystubsManagementView = lazy(() => import('../views/PaystubsManagementView'));
const SuperAdminView = lazy(() => import('../views/SuperAdminView'));
const LandingPageView = lazy(() => import('../views/LandingPageView'));
const HolidaysView = lazy(() => import('../views/HolidaysView'));
const ManualView = lazy(() => import('../views/ManualView'));
const ChangePasswordView = lazy(() => import('../views/ChangePasswordView'));

// Loading Component
const ViewLoading = () => (
    <div className="flex h-full w-full items-center justify-center p-20">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/5 border-t-signal-orange rounded-full animate-spin"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">{THEME.strings.loadingModule}</span>
        </div>
    </div>
);

// Layout LayoutWrapper renders the shared layout (Sidebar, Header)
// and an Outlet for the child route content.
const LayoutWrapper = () => (
    <Layout>
        <ErrorBoundary>
            <Outlet />
        </ErrorBoundary>
    </Layout>
);

const AppRoutes: React.FC = () => {
    const { user, login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    return (
        <Routes>
            <Route path="/" element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> :
                    <Suspense fallback={<ViewLoading />}><LandingPageView /></Suspense>
            } />
            <Route path="/landing" element={<Navigate to="/" replace />} />

            <Route path="/login" element={
                <Suspense fallback={<ViewLoading />}>
                    <LoginView onLoginSuccess={(user) => {
                        login(user); // Update context
                        navigate('/dashboard'); // Redirect to dashboard
                    }} />
                </Suspense>
            } />

            {/* v4.57.0: troca de senha (obrigatória ou voluntária) — qualquer perfil autenticado */}
            <Route element={<ProtectedRoute />}>
                <Route path="/trocar-senha" element={
                    <Suspense fallback={<ViewLoading />}>
                        <ChangePasswordView />
                    </Suspense>
                } />
            </Route>

            {/* Portal Routes */}
            <Route element={<ProtectedRoute allowedRoles={['COLABORADOR']} />}>
                <Route path="/portal" element={
                    <Suspense fallback={<ViewLoading />}>
                        <EmployeePortalView user={user} />
                    </Suspense>
                } />
            </Route>

            {/* Admin Routes with Layout */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'RH', 'LEITURA']} />}>
                <Route element={<LayoutWrapper />}>
                    <Route element={<Suspense fallback={<ViewLoading />}><Outlet /></Suspense>}>
                        <Route path="/dashboard" element={<DashboardView />} />
                        <Route path="/funcionarios" element={<EmployeesView />} />
                        <Route path="/eventos" element={<EventsView />} />
                        <Route path="/competencias" element={<CompetenceView />} />
                        <Route path="/folha" element={<PayrollGridView />} />
                        <Route path="/fechamento-expresso" element={<ExpressClosingView />} />
                        <Route path="/contracheques" element={<PaystubsManagementView />} />
                        <Route path="/lancamentos" element={<PayrollGridView />} />
                        <Route path="/relatorios" element={<ReportsView />} />
                        <Route path="/relacao-calculo" element={<RelacaoCalculoView />} />
                        <Route path="/importar" element={<ImportView />} />
                        <Route path="/formulas" element={<FormulasView />} />
                        <Route path="/exportar" element={<ExportView />} />
                        <Route path="/feriados" element={<HolidaysView />} />
                        <Route path="/manual" element={<ManualView />} />

                        {/* Exclusives for SUPERADMIN */}
                        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                            <Route path="/parametros" element={<SettingsView />} />
                            <Route path="/settings" element={<SettingsView />} />
                            <Route path="/auditoria" element={<AuditLogsView />} />
                            <Route path="/usuarios" element={<UsersView />} />
                            <Route path="/superadmin" element={<SuperAdminView />} />
                            <Route path="/deep-cleanup" element={<DeepCleanupView />} />
                            <Route path="/stress" element={<StressTestView />} />
                        </Route>
                    </Route>
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
