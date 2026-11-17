import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  Activity,
  History,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import { ServerInfo, AIAnalysisResult, DashboardStats, AuditLog } from '../types';
// AI Service moved to dynamic import to save ~1MB bundle size


const AuditShortList: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.getLogs().then(data => {
      if (Array.isArray(data)) {
        setLogs(data.slice(0, 5));
      }
    }).catch(err => console.error("Erro ao carregar logs:", err));
  }, [selectedCompanyId]);

  if (!logs || logs.length === 0) return (
    <div className="text-center py-8 text-slate-400 text-sm">
      Nenhum registro recente.
    </div>
  );

  return (
    <div className="divide-y divide-slate-100">
      {logs.map((log) => (
        <div key={log.id} className="py-3 flex items-start justify-between hover:bg-slate-50 transition-colors px-2 rounded-md">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{log.acao}</span>
            <span className="text-xs text-slate-500">{log.detalhes}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {log.data ? new Date(log.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </span>
        </div>
      ))}
    </div>
  );
};


const DashboardView: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_funcionarios: 0,
    custo_total: 0,
    competencia: '...',
    total_lancamentos: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [info, s] = await Promise.all([
          api.getServerStatus(),
          api.getStats()
        ]);
        setServerInfo(info);
        if (s) {
          setStats(s);
          const history = s.evolucao_custo || [];
          setChartData(history);
          runAiAnalysis(s, history);
        }
      } catch (err) {
        console.error("Erro dashboard:", err);
      }
    };
    fetchData();
  }, [selectedCompanyId]);

  const runAiAnalysis = async (currentStats: any, history: any[]) => {
    try {
      // Dynamic import to keep main bundle light
      const { analyzePayrollData } = await import('../services/aiService');

      const result = await analyzePayrollData({
        stats: currentStats,
        history: history
      });
      setAiAnalysis(result);
    } catch (e) {
      console.error("AI Error:", e);
    }
  };

  const kpis = [
    { label: 'Funcionários Ativos', value: stats.total_funcionarios?.toString() || '0', unit: 'unid.', icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Custo Folha (Bruto)', value: (parseFloat(String(stats.custo_total || 0)) / 1000).toFixed(1), unit: 'k BRL', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Competência Atual', value: stats.competencia, unit: '', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Greetings */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 text-sm mt-1">Resumo operacional e indicadores de desempenho.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-slate-600">Sistema Operacional</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-slate-800">{kpi.value}</h3>
                <span className="text-xs font-medium text-slate-400">{kpi.unit}</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${kpi.bg}`}>
              <kpi.icon size={20} className={kpi.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-stretch">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Evolução de Custo</h3>
              <p className="text-sm text-slate-500">Histórico semestral de folha bruta.</p>
            </div>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `R$${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel: Logs & Insights */}
        <div className="flex flex-col gap-6">
          {/* AI Insight */}
          <div className="bg-sky-50 border border-sky-100 p-6 rounded-xl flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={18} className="text-sky-600" />
              <h4 className="font-bold text-sky-800 text-sm uppercase tracking-wide">Insight Inteligente</h4>
            </div>
            <p className="text-sm text-sky-700 leading-relaxed italic">
              "{aiAnalysis?.summary || "Analisando padrões de folha..."}"
            </p>
          </div>

          {/* Logs */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">Logs Recentes</h4>
              <History size={16} className="text-slate-400" />
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar pr-2 max-h-[200px]">
              <AuditShortList />
            </div>
            <button className="w-full mt-4 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline text-center">
              Ver Todos os Logs &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
