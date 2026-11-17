import React, { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Calculator, Loader2, AlertCircle, Share2 } from 'lucide-react';
import { api } from '../services/mockApi';
import { Competencia, Funcionario, Lancamento, EventoFolha, Natureza } from '../types';

interface RowData {
  id_contrato: number;
  nome: string;
  cargo: string;
  proventos: number;
  descontos: number;
  liquido: number;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RelacaoCalculoView() {
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [eventos, setEventos] = useState<EventoFolha[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [selectedCompetenciaId, setSelectedCompetenciaId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error, setError] = useState('');

  // Carrega dados iniciais (competências, funcionários, eventos)
  useEffect(() => {
    async function init() {
      setLoadingInit(true);
      try {
        const [comps, funcs, evs] = await Promise.all([
          api.getCompetencias(),
          api.getFuncionarios(),
          api.getEventos(),
        ]);
        setCompetencias(comps);
        setFuncionarios(funcs);
        setEventos(evs);
      } catch (e: any) {
        setError(e.message || 'Erro ao carregar dados iniciais');
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, []);

  // Carrega lançamentos quando uma competência é selecionada
  useEffect(() => {
    if (!selectedCompetenciaId) {
      setLancamentos([]);
      return;
    }
    async function fetchLancamentos() {
      setLoading(true);
      setError('');
      try {
        const items = await api.getLancamentos(selectedCompetenciaId!);
        setLancamentos(items);
      } catch (e: any) {
        setError(e.message || 'Erro ao carregar lançamentos');
      } finally {
        setLoading(false);
      }
    }
    fetchLancamentos();
  }, [selectedCompetenciaId]);

  // Gera mapa evento_id -> natureza
  const eventoNaturezaMap = useMemo(() => {
    const map = new Map<number, Natureza>();
    eventos.forEach(ev => map.set(ev.id, ev.natureza));
    return map;
  }, [eventos]);

  // Gera mapa funcionario_id -> Funcionario
  const funcMap = useMemo(() => {
    const map = new Map<number, Funcionario>();
    funcionarios.forEach(f => map.set(f.id, f));
    return map;
  }, [funcionarios]);

  // Agrupa lançamentos por funcionário e calcula totais
  const rows = useMemo<RowData[]>(() => {
    if (lancamentos.length === 0) return [];

    const grouped = new Map<number, { proventos: number; descontos: number }>();

    lancamentos.forEach(l => {
      if (!grouped.has(l.funcionario_id)) {
        grouped.set(l.funcionario_id, { proventos: 0, descontos: 0 });
      }
      const entry = grouped.get(l.funcionario_id)!;
      const natureza = eventoNaturezaMap.get(l.evento_id);
      const valor = Number(l.valor_total || 0);

      if (natureza === Natureza.PROVENTO) {
        entry.proventos += valor;
      } else if (natureza === Natureza.DESCONTO) {
        entry.descontos += valor;
      }
    });

    const result: RowData[] = [];
    grouped.forEach((totais, funcionario_id) => {
      const func = funcMap.get(funcionario_id);
      result.push({
        id_contrato: func?.id_contrato ?? funcionario_id,
        nome: func?.nome ?? `Funcionário #${funcionario_id}`,
        cargo: func?.cargo ?? '—',
        proventos: totais.proventos,
        descontos: totais.descontos,
        liquido: totais.proventos - totais.descontos,
      });
    });

    return result.sort((a, b) => a.id_contrato - b.id_contrato);
  }, [lancamentos, eventoNaturezaMap, funcMap]);

  // Filtro por nome ou matrícula
  const filteredRows = useMemo(() => {
    if (!filterText.trim()) return rows;
    const q = filterText.toLowerCase();
    return rows.filter(
      r => r.nome.toLowerCase().includes(q) || String(r.id_contrato).includes(q)
    );
  }, [rows, filterText]);

  // Totais gerais
  const totals = useMemo(() => ({
    proventos: filteredRows.reduce((s, r) => s + r.proventos, 0),
    descontos: filteredRows.reduce((s, r) => s + r.descontos, 0),
    liquido: filteredRows.reduce((s, r) => s + r.liquido, 0),
  }), [filteredRows]);

  const selectedComp = competencias.find(c => c.id === selectedCompetenciaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relação de Cálculo</h1>
          <p className="text-slate-600 mt-1">Visualize o resumo consolidado de proventos e descontos por competência</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium">
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
          <button
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Seletor de competência */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Competência</label>
            {loadingInit ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                value={selectedCompetenciaId ?? ''}
                onChange={e => setSelectedCompetenciaId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecione uma competência</option>
                {competencias.map(c => (
                  <option key={c.id} value={c.id}>
                    {String(c.mes).padStart(2, '0')}/{c.ano} — {c.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtro texto */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Filtro Adicional</label>
            <div className="relative">
              <Filter className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder="Filtrar por nome ou matrícula..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Conteúdo principal */}
        {!selectedCompetenciaId ? (
          <div className="text-center py-12 text-slate-500">
            <Calculator className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p>Selecione uma competência para visualizar a relação de cálculo.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center py-12 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p>Carregando lançamentos...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calculator className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p>Nenhum lançamento encontrado para esta competência.</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">
                Resumo da Folha — {String(selectedComp?.mes).padStart(2, '0')}/{selectedComp?.ano}
              </h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                selectedComp?.status === 'FECHADA'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {selectedComp?.status}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Matrícula</th>
                    <th className="px-4 py-3 font-medium">Funcionário</th>
                    <th className="px-4 py-3 font-medium">Cargo</th>
                    <th className="px-4 py-3 font-medium text-right">Proventos</th>
                    <th className="px-4 py-3 font-medium text-right">Descontos</th>
                    <th className="px-4 py-3 font-medium text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map(row => (
                    <tr key={row.id_contrato} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.id_contrato}</td>
                      <td className="px-4 py-3">{row.nome}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{row.cargo}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatBRL(row.proventos)}</td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium">{formatBRL(row.descontos)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{formatBRL(row.liquido)}</td>
                    </tr>
                  ))}
                  {/* Linha de totais */}
                  <tr className="bg-slate-100">
                    <td colSpan={3} className="px-4 py-4 text-right font-semibold text-slate-700">
                      Totais da Competência ({filteredRows.length} funcionário{filteredRows.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-700">{formatBRL(totals.proventos)}</td>
                    <td className="px-4 py-4 text-right font-bold text-rose-700">{formatBRL(totals.descontos)}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900 text-lg">{formatBRL(totals.liquido)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RelacaoCalculoView;
