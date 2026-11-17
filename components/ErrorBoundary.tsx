import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Critical UI Error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>

                        <h1 className="text-xl font-bold text-slate-900 mb-2">Ops! Algo deu errado.</h1>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            Ocorreu um erro inesperado ao carregar esta tela.
                            Nossos logs já foram notificados e estamos trabalhando nisso.
                        </p>

                        <div className="bg-slate-50 rounded-lg p-4 mb-8 text-left overflow-hidden">
                            <p className="text-[10px] font-mono text-slate-400 uppercase mb-1 tracking-wider">Detalhes Técnicos</p>
                            <p className="text-[11px] font-mono text-slate-600 break-all leading-tight italic">
                                {this.state.error?.message || 'Erro desconhecido de renderização'}
                            </p>
                        </div>

                        <button
                            onClick={this.handleReset}
                            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-sky-200 active:scale-95"
                        >
                            <RefreshCw size={18} />
                            Tentar Novamente
                        </button>

                        <p className="mt-6 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                            Sistema RH Resilience System
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
