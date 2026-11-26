/**
 * Bem Vindo v1.3.0: tela única dos relatórios do DP (contabilidade, resumo por setor e pagamentos).
 * Carrega a competência com o mesmo cálculo do grid, mostra a prévia e exporta em Excel, CSV ou PDF.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileSpreadsheet, FileText, FileDown, Loader2, AlertTriangle, Info } from 'lucide-react';
import { api } from '../../services/mockApi';
import { Competencia } from '../../types';
import { nomeEtapa } from '../../constants/etapasCompetencia';
import { carregarFolhaCalculada, FolhaCalculada, rotuloCompetencia } from './folhaCalculada';
import { montarRelatorioContabilidade, montarResumoPorSetor, montarRelacaoPagamentos, TabelaRelatorio } from './montarRelatorios';
import { exportarRelatorio, formatarCelula, FormatoExportacao } from './exportarRelatorio';

export type TipoRelatorioBV = 'BV_CONTABILIDADE' | 'BV_RESUMO_SETOR' | 'BV_PAGAMENTOS';

export const TITULOS_BV: Record<TipoRelatorioBV, string> = {
  BV_CONTABILIDADE: 'Relatório para a Contabilidade',
  BV_RESUMO_SETOR: 'Resumo por Setor',
  BV_PAGAMENTOS: 'Relação de Pagamentos',
};

const ARQUIVOS: Record<TipoRelatorioBV, string> = {
  BV_CONTABILIDADE: 'Contabilidade',
  BV_RESUMO_SETOR: 'ResumoPorSetor',
  BV_PAGAMENTOS: 'Pagamentos',
};

const ESTILO_LINHA = {
  grupo: 'bg-sky-50 font-bold text-sky-900',
  subtotal: 'bg-slate-100 font-bold text-slate-800',
  total: 'bg-slate-800 font-black text-white',
} as const;

interface Props {
  tipo: TipoRelatorioBV;
  competencias: Competencia[];
}

const RelatorioBemVindo: React.FC<Props> = ({ tipo, competencias }) => {
  const [compId, setCompId] = useState<number | null>(competencias[0]?.id ?? null);
  const [folha, setFolha] = useState<FolhaCalculada | null>(null);
  const [empresa, setEmpresa] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [incluirCalculadas, setIncluirCalculadas] = useState(false);
  const [exportando, setExportando] = useState<FormatoExportacao | null>(null);

  useEffect(() => {
    if (compId === null && competencias.length) setCompId(competencias[0].id);
  }, [competencias, compId]);

  useEffect(() => {
    api.getEmpresaAtual().then(e => setEmpresa(e?.razao_social || '')).catch(() => setEmpresa(''));
  }, []);

  useEffect(() => {
    const comp = competencias.find(c => c.id === compId);
    if (!comp) return;
    let ativo = true;
    setCarregando(true);
    setErro(null);
    carregarFolhaCalculada(comp)
      .then(f => { if (ativo) setFolha(f); })
      .catch((e: any) => { if (ativo) { setFolha(null); setErro(e?.message || 'Falha ao carregar a competência.'); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [compId, competencias]);

  const tabela: TabelaRelatorio | null = useMemo(() => {
    if (!folha) return null;
    if (tipo === 'BV_CONTABILIDADE') return montarRelatorioContabilidade(folha, incluirCalculadas);
    if (tipo === 'BV_RESUMO_SETOR') return montarResumoPorSetor(folha);
    return montarRelacaoPagamentos(folha);
  }, [folha, tipo, incluirCalculadas]);

  const exportar = async (formato: FormatoExportacao) => {
    if (!tabela || !folha) return;
    setExportando(formato);
    try {
      const comp = rotuloCompetencia(folha.competencia);
      await exportarRelatorio({
        arquivo: `BemVindo_${ARQUIVOS[tipo]}_${comp.replace('/', '-')}`,
        titulo: TITULOS_BV[tipo],
        subtitulo: `${empresa || 'Supermercado Bem Vindo'} · Competência ${comp} (${nomeEtapa(folha.competencia).toLowerCase()})`,
        colunas: tabela.colunas,
        linhas: tabela.linhas,
        rodape: tabela.rodape,
      }, formato);
    } finally {
      setExportando(null);
    }
  };

  const botao = (formato: FormatoExportacao, rotulo: string, Icone: React.ElementType, cor: string) => (
    <button
      onClick={() => exportar(formato)}
      disabled={!tabela || !!exportando || carregando}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors disabled:opacity-40 ${cor}`}
    >
      {exportando === formato ? <Loader2 size={16} className="animate-spin" /> : <Icone size={16} />}
      {rotulo}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">{TITULOS_BV[tipo]}</h2>
          <p className="text-xs text-slate-500 mt-1">Mesmos valores da tela de Lançamentos · prévia interna do DP</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {botao('xlsx', 'Excel', FileSpreadsheet, 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')}
          {botao('csv', 'CSV', FileDown, 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')}
          {botao('pdf', 'PDF', FileText, 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')}
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-6 items-end">
        <div className="min-w-[200px]">
          <label htmlFor="bv-rel-comp" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Competência</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              id="bv-rel-comp"
              value={compId ?? ''}
              onChange={e => setCompId(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              {competencias.map(c => (
                <option key={c.id} value={c.id}>{rotuloCompetencia(c)} · {nomeEtapa(c)}</option>
              ))}
            </select>
          </div>
        </div>
        {tipo === 'BV_CONTABILIDADE' && (
          <label className="flex items-center gap-2 text-sm text-slate-600 pb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={incluirCalculadas}
              onChange={e => setIncluirCalculadas(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Incluir prévia de INSS, IRRF e DSR
          </label>
        )}
        {folha && (
          <span className="text-xs text-slate-500 pb-2 ml-auto">{folha.funcionarios.length} pessoas com movimento</span>
        )}
      </div>

      {!competencias.length && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">Nenhuma competência cadastrada.</div>
      )}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center p-16 text-slate-400 gap-3">
          <Loader2 className="animate-spin" /> Calculando a competência…
        </div>
      ) : tabela && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  {tabela.colunas.map((c, i) => (
                    <th key={i} className={`bg-sky-700 text-white font-bold px-3 py-2 whitespace-nowrap ${c.tipo === 'texto' ? 'text-left' : 'text-right'}`}>
                      {c.titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((l, li) => (
                  <tr key={li} className={l.estilo ? ESTILO_LINHA[l.estilo] : 'border-b border-slate-100 hover:bg-slate-50'}>
                    {l.celulas.map((c, ci) => {
                      const t = tabela.colunas[ci]?.tipo ?? 'texto';
                      return (
                        <td key={ci} className={`px-3 py-1.5 whitespace-nowrap ${t === 'texto' ? 'text-left' : 'text-right font-mono'}`}>
                          {formatarCelula(c, t)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {folha && folha.funcionarios.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">Nenhum lançamento nesta competência.</p>
          )}
          <p className="flex items-start gap-2 p-4 text-[11px] text-slate-500 border-t border-slate-100 bg-slate-50">
            <Info size={14} className="shrink-0 mt-0.5" /> {tabela.rodape}
          </p>
        </div>
      )}
    </div>
  );
};

export default RelatorioBemVindo;
