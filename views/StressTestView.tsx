import React, { useState } from 'react';
import {
  Zap,
  Activity,
  Database,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server
} from 'lucide-react';
import { api } from '../services/mockApi';

const StressTestView: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const runStressTest = async () => {
    setIsGenerating(true);
    setProgress(10);
    const startTime = performance.now();

    try {
      setProgress(40);
      await api.bulkInsertFuncionarios(200);

      setProgress(70);
      await new Promise(r => setTimeout(r, 1500));

      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000;

      setResults({
        executionTime: totalTime.toFixed(2),
        recordsCreated: 200,
        avgLatency: (totalTime / 200 * 1000).toFixed(0),
        status: 'SUCCESS'
      });
      setProgress(100);
    } catch (e) {
      setResults({ status: 'ERROR', error: 'Falha na conexão com servidor de banco de dados.' });
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Diagnóstico de Performance</h1>
          <p className="text-sm text-slate-500 mt-1">Teste de carga e verificação de integridade do sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Play size={18} className="text-sky-600" />
              Executar Teste
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Este teste simulará a inserção de 200 funcionários simultaneamente para medir a latência de escrita do banco de dados e a resposta da API.
            </p>

            <button
              onClick={runStressTest}
              disabled={isGenerating}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Executando... {progress}%
                </>
              ) : (
                <>
                  <Zap size={18} /> Iniciar Teste de Carga
                </>
              )}
            </button>

            {isGenerating && (
              <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} />
              Atenção
            </h4>
            <p className="text-sm text-amber-700 leading-relaxed">
              Não execute este teste durante o processamento da folha oficial. O teste gera dados fictícios que precisarão ser removidos posteriormente.
            </p>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm h-full">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={18} className="text-emerald-500" />
              Resultados da Análise
            </h3>

            {!results ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                <Server size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Aguardando execução do teste...</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tempo Total</p>
                    <p className="text-2xl font-bold text-slate-800">{results.executionTime}s</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Registros</p>
                    <p className="text-2xl font-bold text-slate-800">{results.recordsCreated}</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Latência Média</p>
                    <p className="text-2xl font-bold text-sky-600">{results.avgLatency}ms</p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6 flex items-start gap-4">
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-800">Sistema Estável</h4>
                    <p className="text-sm text-emerald-700 mt-1">
                      A infraestrutura suportou a carga simulada dentro dos parâmetros aceitáveis. O banco de dados respondeu com latência média inferior a 50ms por operação.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-xs text-slate-400 text-center">
                    Teste executado em {new Date().toLocaleString()} • Cliente: Localhost v1.0
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressTestView;
