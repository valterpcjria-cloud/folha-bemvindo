
import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Users, Briefcase, DollarSign, Search, Printer,
  ChevronRight, Calendar, Building2, Filter, FileBarChart, PieChart,
  Table as TableIcon, TrendingUp, ShieldCheck, Wallet, ArrowUpRight,
  TrendingDown, Globe, LayoutGrid, ListChecks
} from 'lucide-react';
import { CONFIG } from '../config';
import { api, authHeaders } from '../services/mockApi';
import { Funcionario, EventoFolha, Competencia, Lancamento, StatusFuncionario } from '../types';
import { exportToExcel } from '../utils/exportHelpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';
import { RelacaoCalculoPDF } from '../services/RelacaoCalculoPDF';
import { ModalEspelhoFolha } from '../components/ModalEspelhoFolha';
import { calcularINSS } from '../utils/taxCalculations';

const COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];

/** v4.52.15: helper defensivo para formatação BRL — evita crash se valor for undefined/null. */
const fmtBRL = (v: any): string => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * v4.52.15: Insere lançamento sintético de INSS por funcionário se não houver
 * registro real, calculando pela tabela progressiva oficial 2026 sobre os
 * proventos com incide_inss != false.
 */
function adicionarINSSSintetico(
  lancamentos: Lancamento[],
  eventos: EventoFolha[]
): Lancamento[] {
  const inssEvent = eventos.find(e => Number(e.codigo_evento) === 35);
  if (!inssEvent) return lancamentos;

  const funcIds = Array.from(new Set(lancamentos.map(l => l.funcionario_id)));
  const result = [...lancamentos];

  funcIds.forEach(fid => {
    const jaTemINSS = lancamentos.some(l =>
      l.funcionario_id === fid && Number(l.evento_id) === Number(inssEvent.id)
    );
    if (jaTemINSS) return;

    let baseINSS = 0;
    for (const l of lancamentos) {
      if (l.funcionario_id !== fid) continue;
      const ev = eventos.find(e => Number(e.id) === Number(l.evento_id));
      if (!ev || ev.tipo !== 'CREDITO') continue;
      if (ev.incide_inss === false) continue;
      baseINSS += Number(l.valor_total || 0);
    }
    if (baseINSS <= 0) return;

    const { valor: inssValor, aliquotaEfetiva } = calcularINSS(baseINSS);
    if (inssValor <= 0) return;

    result.push({
      id: -(Number(fid) * 1000 + 35), // ID sintético negativo p/ key React
      funcionario_id: fid,
      competencia_id: lancamentos[0]?.competencia_id ?? 0,
      evento_id: Number(inssEvent.id),
      quantidade: 0,
      valor_unitario: aliquotaEfetiva,
      valor_total: inssValor,
    });
  });

  return result;
}

type ReportType = 'DASHBOARD' | 'FICHA_FINANCEIRA' | 'RESUMO_FOLHA' | 'EVENTOS' | 'RELACAO_CALCULO';

const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [eventos, setEventos] = useState<EventoFolha[]>([]);

  // Filters
  const [selectedCompId, setSelectedCompId] = useState<number | 'ALL'>('ALL');
  const [selectedFuncId, setSelectedFuncId] = useState<number | 'ALL'>('ALL');
  const [selectedDep, setSelectedDep] = useState<string>('TODOS');

  // Data for reports
  const [reportData, setReportData] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isModalEspelhoOpen, setIsModalEspelhoOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [funcList, compList, eventList, stats] = await Promise.all([
          api.getFuncionarios(),
          api.getCompetencias(),
          api.getEventos(),
          api.getStats()
        ]);
        setFuncionarios(funcList);
        setCompetencias(compList);
        setEventos(eventList);
        setDashboardStats(stats);

        if (compList.length > 0) {
          setSelectedCompId(compList[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch report data when report type or filters change
  useEffect(() => {
    if (activeReport === 'DASHBOARD') return;

    // v4.52.16: limpa reportData antes do fetch para evitar render do shape antigo
    setReportData([]);

    const fetchReport = async () => {
      setLoading(true);
      try {
        if (activeReport === 'RESUMO_FOLHA') {
          if (selectedCompId !== 'ALL') {
            const rawLancs = await api.getLancamentos(selectedCompId as number);
            // v4.52.15: garante INSS sintético quando não há registro real
            const lancamentos = adicionarINSSSintetico(rawLancs, eventos);
            const data = lancamentos.map(l => {
              const f = funcionarios.find(func => func.id === l.funcionario_id);
              const e = eventos.find(ev => ev.id === l.evento_id);
              return {
                ...l,
                funcionario_nome: f?.nome || 'Não encontrado',
                departamento: f?.departamento || '-',
                evento_nome: e?.nome_evento || 'Não encontrado',
                tipo: e?.tipo || '-'
              };
            });
            const filtered = selectedDep === 'TODOS' ? data : data.filter(d => d.departamento === selectedDep);
            setReportData(filtered);
          }
        }
        else if (activeReport === 'RELACAO_CALCULO') {
          if (selectedCompId !== 'ALL') {
             const comp = competencias.find(c => c.id === selectedCompId);
             const compStr = comp ? `${String(comp.mes).padStart(2, '0')}/${comp.ano}` : '';
             
             // v4.58.0: sessão via cookie HttpOnly + contexto de empresa (authHeaders)
             const response = await fetch(`${CONFIG.API_BASE_URL}/reports/relacao-calculo?competencia=${compStr}`, {
               credentials: 'include',
               headers: authHeaders()
             });
             const result = await response.json();
             setReportData(result.data || []);
             setDashboardStats((prev: any) => ({ ...prev, empresa_report: result.empresa }));
          }
        }
        else if (activeReport === 'FICHA_FINANCEIRA') {
          if (selectedCompId !== 'ALL' && selectedFuncId !== 'ALL') {
            const rawLancs = await api.getLancamentos(selectedCompId as number);
            // v4.52.15: aplica INSS sintético antes de filtrar pelo funcionário
            const lancamentos = adicionarINSSSintetico(rawLancs, eventos);
            const filtered = lancamentos.filter(l => l.funcionario_id === selectedFuncId);
            const data = filtered.map(l => {
              const e = eventos.find(ev => ev.id === l.evento_id);
              return {
                ...l,
                evento_nome: e?.nome_evento || '-',
                tipo: e?.tipo || '-',
                referencia: l.quantidade || 0
              };
            });
            setReportData(data);
          }
        }
        else if (activeReport === 'EVENTOS') {
          if (selectedCompId !== 'ALL') {
            const rawLancs = await api.getLancamentos(selectedCompId as number);
            // v4.52.15: garante INSS sintético no detalhamento por evento
            const lancamentos = adicionarINSSSintetico(rawLancs, eventos);
            const data = lancamentos.map(l => {
              const f = funcionarios.find(func => func.id === l.funcionario_id);
              const e = eventos.find(ev => ev.id === l.evento_id);
              return {
                ...l,
                funcionario_nome: f?.nome || '-',
                evento_nome: e?.nome_evento || '-',
                departamento: f?.departamento || '-'
              };
            });
            setReportData(data);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar relatório:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [activeReport, selectedCompId, selectedFuncId, selectedDep, funcionarios, eventos, competencias]);

  const departments = useMemo(() => {
    const deps = Array.from(new Set(funcionarios.map(f => f.departamento).filter(Boolean)));
    return ['TODOS', ...deps];
  }, [funcionarios]);

  const handlePrintPDF = async () => {
    setIsModalEspelhoOpen(true);
  };

  const handleExport = async () => {
    if (activeReport === 'RELACAO_CALCULO') {
      const comp = competencias.find(c => c.id === selectedCompId);
      const compStr = comp ? `${String(comp.mes).padStart(2, '0')}/${comp.ano}` : '';
      
      const pdfService = new RelacaoCalculoPDF();
      await pdfService.generate({
        empresa: dashboardStats?.empresa_report || {},
        competencia: compStr,
        data: reportData,
        gerado_em: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR')
      });
      return;
    }

    let columns: any[] = [];
    let filename = `Relatorio_${activeReport}`;

    if (activeReport === 'RESUMO_FOLHA') {
      columns = [
        { header: 'Funcionário', key: 'funcionario_nome', width: 30 },
        { header: 'Departamento', key: 'departamento', width: 20 },
        { header: 'Evento', key: 'evento_nome', width: 25 },
        { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'Valor (R$)', key: 'valor_total', width: 15 },
      ];
    } else if (activeReport === 'FICHA_FINANCEIRA') {
      const f = funcionarios.find(func => func.id === selectedFuncId);
      filename = `Ficha_Financeira_${f?.nome || 'Func'}`;
      columns = [
        { header: 'Evento', key: 'evento_nome', width: 30 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Referência', key: 'referencia', width: 15 },
        { header: 'Saldos (R$)', key: 'valor_total', width: 20 },
      ];
    }

    exportToExcel(filename, columns, reportData, 'Dados');
  };

  const totals = useMemo(() => {
    return reportData.reduce((acc, curr) => {
      if (activeReport === 'RELACAO_CALCULO') {
        acc.proventos += Number(curr.totais?.proventos || 0);
        acc.descontos += Number(curr.totais?.descontos || 0);
      } else {
        const val = Number(curr.valor_total || 0);
        if (curr.tipo === 'CREDITO') acc.proventos += val;
        if (curr.tipo === 'DEBITO') acc.descontos += val;
      }
      return acc;
    }, { proventos: 0, descontos: 0 });
  }, [reportData, activeReport]);

  // UI Components
  const SidebarItem = ({ type, label, icon: Icon }: { type: ReportType, label: string, icon: any }) => (
    <button
      onClick={() => setActiveReport(type)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border ${activeReport === type
        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-[1.02]'
        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
        }`}
    >
      <Icon size={18} />
      <span className="font-bold text-sm">{label}</span>
      <ChevronRight size={14} className={`ml-auto opacity-40 ${activeReport === type ? 'text-white' : ''}`} />
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 font-sans pb-20 print:p-0">

      {/* Report Selector Sidebar */}
      <div className="w-full lg:w-72 space-y-4 print:hidden">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
              <FileBarChart size={24} />
            </div>
            <div>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">Centro de</h2>
              <h1 className="text-white font-black text-lg">Relatórios</h1>
            </div>
          </div>

          <div className="space-y-2">
            <SidebarItem type="DASHBOARD" label="Dashboard Geral" icon={PieChart} />
            <SidebarItem type="FICHA_FINANCEIRA" label="Ficha Financeira" icon={FileText} />
            <SidebarItem type="RESUMO_FOLHA" label="Resumo Mensal" icon={TableIcon} />
            <SidebarItem type="RELACAO_CALCULO" label="Relação de Cálculo" icon={Printer} />
            <SidebarItem type="EVENTOS" label="Análise de Eventos" icon={Briefcase} />
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <h3 className="text-blue-900 font-bold text-sm mb-2">Suporte Contábil</h3>
          <p className="text-blue-700/70 text-xs leading-relaxed">
            Dúvidas sobre os cálculos ou formatos de exportação? Entre em contato com o suporte técnico Frimelo.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">

        {/* Navigation & Actions Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {activeReport === 'DASHBOARD' && 'Visão Geral Executiva'}
              {activeReport === 'FICHA_FINANCEIRA' && 'Ficha Financeira do Colaborador'}
              {activeReport === 'RESUMO_FOLHA' && 'Resumo Consolidado de Folha'}
              {activeReport === 'RELACAO_CALCULO' && 'Relação de Cálculo (Espelho)'}
              {activeReport === 'EVENTOS' && 'Detalhamento por Evento'}
            </h2>

          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
              title="Imprimir Tabela (Navegador)"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
              title="Espelho da Folha (PDF Profissional)"
            >
              <FileText size={20} />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">PDF</span>
            </button>
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group-hover:pr-10"
                onClick={handleExport}
              >
                <Download size={18} />
                <span>Exportar Dados</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Bar (except dashboard) */}
        {activeReport !== 'DASHBOARD' && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-end print:hidden">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Competência</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {competencias.map(c => (
                    <option key={c.id} value={c.id}>{c.mes.toString().padStart(2, '0')}/{c.ano}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeReport === 'FICHA_FINANCEIRA' && (
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Colaborador</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={selectedFuncId}
                    onChange={(e) => setSelectedFuncId(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ALL">Selecione...</option>
                    {/* v4.54.0: DESLIGADOS não aparecem na seleção de relatórios (histórico preservado via lançamentos salvos) */}
                    {funcionarios.filter(f => f.status !== StatusFuncionario.DESLIGADO).map(f => (
                      <option key={f.id} value={f.id}>{f.nome} ({f.id_contrato})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeReport === 'RESUMO_FOLHA' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Departamento</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={selectedDep}
                    onChange={(e) => setSelectedDep(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                // Forçar atualização do ReportData (o useEffect já cuida, mas o botão dá feedback visual)
                setSelectedCompId(prev => prev); 
              }}
              className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm h-[42px] flex items-center gap-2 hover:bg-slate-900 transition-all active:scale-95"
            >
              <Filter size={16} />
              Filtrar
            </button>
          </div>
        )}

        {/* Report Area Content */}
        <div className="min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center p-20 bg-white rounded-3xl border border-slate-100">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 italic">Processando massa de dados...</span>
              </div>
            </div>
          ) : (
            <>
              {activeReport === 'DASHBOARD' && dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                  {/* Stats Cards */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-3 lg:col-span-1 flex flex-col justify-between">
                    <div>
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl inline-flex mb-6">
                        <DollarSign size={24} />
                      </div>
                      <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Custo Médio Operacional</h3>
                      <p className="text-4xl font-black text-slate-800">
                        {fmtBRL(Number(dashboardStats.total_funcionarios) > 0 ? Number(dashboardStats.custo_total || 0) / Number(dashboardStats.total_funcionarios) : 0)}
                      </p>
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base de Encargos</span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black">28.4%</span>
                    </div>
                  </div>

                  {/* Sector Chart */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-8">Distribuição de Investimento</h3>
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardStats.investimento_por_setor} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: '#64748b', fontSize: 11, fontWeight: '700' }} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="valor" radius={[0, 10, 10, 0]} barSize={28}>
                            {dashboardStats.investimento_por_setor.map((_: any, index: number) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Distribution Pie */}
                  <div className="bg-slate-900 p-8 rounded-3xl shadow-xl col-span-1 md:col-span-3">
                    <h3 className="font-black text-white/40 text-sm uppercase tracking-widest mb-8">Composição da Folha Mensal</h3>
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                      <div className="h-64 w-full lg:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={dashboardStats.distribuicao_folha}
                              cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                              paddingAngle={5} dataKey="value" stroke="none"
                            >
                              {dashboardStats.distribuicao_folha.map((_: any, index: number) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                        {dashboardStats.distribuicao_folha.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{item.name}</span>
                            </div>
                            <p className="text-white font-black text-xl">{fmtBRL(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeReport === 'RESUMO_FOLHA' || activeReport === 'EVENTOS') && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Departamento</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.filter((r: any) => r && r.evento_nome !== undefined).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">{row.funcionario_nome ?? '-'}</td>
                            <td className="px-6 py-4 font-black text-blue-600 text-xs text-center">#{row.funcionario_id ?? '-'}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">
                                {row.departamento ?? '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">{row.evento_nome}</span>
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${row.tipo === 'CREDITO' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {row.tipo ?? '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-800">
                              {fmtBRL(row.valor_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.length === 0 && (
                    <div className="p-20 flex flex-col items-center justify-center opacity-40">
                      <Search size={48} className="mb-4 text-slate-300" />
                      <p className="font-black text-xs uppercase tracking-widest">Nenhum dado encontrado para o filtro aplicado</p>
                    </div>
                  )}
                </div>
              )}

              {activeReport === 'RELACAO_CALCULO' && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Departamento</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Proventos</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Descontos</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Líquido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.filter((r: any) => r && r.info).map((row: any, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-black text-blue-600 text-xs text-center">#{row.info?.matricula ?? '-'}</td>
                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">{row.info?.nome ?? '-'}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">
                                {row.info?.departamento ?? '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600">
                              {fmtBRL(row.totais?.proventos)}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-rose-500">
                              {fmtBRL(row.totais?.descontos)}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-800">
                              {fmtBRL(row.totais?.liquido)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.length === 0 && (
                    <div className="p-20 flex flex-col items-center justify-center opacity-40">
                      <Search size={48} className="mb-4 text-slate-300" />
                      <p className="font-black text-xs uppercase tracking-widest">Nenhum dado encontrado para o filtro aplicado</p>
                    </div>
                  )}
                </div>
              )}

              {activeReport === 'FICHA_FINANCEIRA' && (
                <div className="space-y-6">
                  {selectedFuncId === 'ALL' ? (
                    <div className="bg-white p-20 rounded-3xl border border-slate-200 border-dashed flex flex-col items-center justify-center">
                      <Users size={64} className="text-slate-200 mb-6" />
                      <h2 className="text-slate-800 font-black text-lg mb-2">Selecione um Colaborador</h2>
                      <p className="text-slate-400 text-sm max-w-sm text-center font-medium">Use o menu superior para escolher o funcionário e visualizar o histórico financeiro completo.</p>
                    </div>
                  ) : (
                    <div className="animate-in zoom-in-95 duration-300">
                      {/* Person Profile Area */}
                      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 mb-6">
                        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                          <span className="text-4xl font-black">
                            {funcionarios.find(f => f.id === selectedFuncId)?.nome.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-black text-slate-800">
                              {funcionarios.find(f => f.id === selectedFuncId)?.nome}
                            </h1>
                            <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">Ativo</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                            <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Matrícula</span>
                              <span className="font-black text-blue-600 italic">#{funcionarios.find(f => f.id === selectedFuncId)?.id_contrato}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor</span>
                              <span className="font-bold text-slate-700">{funcionarios.find(f => f.id === selectedFuncId)?.departamento || 'Não Consta'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cargo</span>
                              <span className="font-bold text-slate-700">{funcionarios.find(f => f.id === selectedFuncId)?.cargo || '-'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Admissão</span>
                              <span className="font-bold text-slate-700 font-mono">15/01/2023</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Entries Table */}
                      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento / Histórico</th>
                              <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Referência</th>
                              <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Proventos</th>
                              <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Descontos</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportData.filter((l: any) => l && l.evento_nome !== undefined).map((l: any, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{l.evento_nome}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Evento Interno #{l.evento_id}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-4 text-right font-bold text-slate-500 text-sm">{l.referencia ?? 0}</td>
                                <td className="px-8 py-4 text-right font-black text-emerald-600">
                                  {l.tipo === 'CREDITO' ? fmtBRL(l.valor_total) : '-'}
                                </td>
                                <td className="px-8 py-4 text-right font-black text-rose-500">
                                  {l.tipo === 'DEBITO' ? fmtBRL(l.valor_total) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-900 text-white">
                              <td className="px-8 py-6 font-black uppercase text-xs tracking-widest">Líquido a Pagar</td>
                              <td colSpan={2} className="px-8 py-6 text-right">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-white/40 uppercase">Total Proventos: {fmtBRL(totals?.proventos)}</span>
                                  <span className="text-[9px] font-black text-white/40 uppercase">Total Descontos: {fmtBRL(totals?.descontos)}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right align-middle">
                                <span className="text-2xl font-black tracking-tighter italic">
                                  {fmtBRL(Number(totals?.proventos || 0) - Number(totals?.descontos || 0))}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .rounded-2xl, .rounded-3xl, .rounded-xl { border-radius: 0 !important; }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; }
          .border { border: 1px solid #eee !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th { background: #f8fafc !important; color: #475569 !important; border-bottom: 2px solid #000 !important; }
          td { border-bottom: 1px solid #eee !important; padding: 10px !important; }
          .bg-slate-900 { background: #000 !important; color: white !important; -webkit-print-color-adjust: exact; }
          .text-emerald-600 { color: #059669 !important; }
          .text-rose-500 { color: #dc2626 !important; }
          .text-blue-600 { color: #2563eb !important; }
        }
      `}</style>
      {/* Modal para Espelho da Folha */}
      <ModalEspelhoFolha 
        isOpen={isModalEspelhoOpen}
        onClose={() => setIsModalEspelhoOpen(false)}
        funcionarios={funcionarios}
        competencia={competencias.find(c => c.id === selectedCompId) ? `${String(competencias.find(c => c.id === selectedCompId)?.mes).padStart(2, '0')}/${competencias.find(c => c.id === selectedCompId)?.ano}` : ''}
        setLoading={setLoading}
      />
    </div>
  );
};

export default ReportsView;
