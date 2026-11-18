import React, { useState, useEffect } from 'react';
import {
  Download,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { Competencia, EventoFolha } from '../types';
import { api } from '../services/mockApi';

const ExportView: React.FC = () => {
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [eventos, setEventos] = useState<EventoFolha[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'CSV' | 'TXT'>('XLSX');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [comps, evs] = await Promise.all([api.getCompetencias(), api.getEventos()]);
        console.log("💎 [ExportView] Data loaded:", { comps, evs });

        setCompetencias(Array.isArray(comps) ? comps : []);
        const validEvents = Array.isArray(evs) ? evs : [];
        setEventos(validEvents);
        setSelectedEventIds(validEvents.map(e => e.id)); // Selecionar todos por padrão

        if (comps && comps.length > 0) setSelectedCompId(comps[0].id);
      } catch (err) {
        console.error("❌ [ExportView] Error loading data:", err);
      }
    };
    loadData();
  }, []);

  const handleExportXLSX = async (comp: any, funcs: any[], lancs: any[], sortedEvents: any[]) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema RH';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Sistema RH');

    // Linha 1: Códigos dos eventos (inicia na coluna C)
    const row1 = ['', '', ...sortedEvents.map(e => String(e.codigo_evento))];
    worksheet.addRow(row1);

    // Linha 2: Unidade (V, H, R)
    const getUnidadeLabel = (unidade: string) => {
      if (unidade === 'VALOR') return 'V';
      if (unidade === 'HORA') return 'H';
      return 'R';
    };
    const row2 = ['', '', ...sortedEvents.map(e => getUnidadeLabel(e.unidade))];
    worksheet.addRow(row2);

    // Linha 3: Títulos das colunas
    const row3 = ['Contrato do Empregado', 'Nome', ...sortedEvents.map(e => e.nome_evento?.toUpperCase() || '')];
    worksheet.addRow(row3);

    // Style header rows
    [1, 2, 3].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.font = { bold: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Add data rows
    funcs.forEach(f => {
      const rowData: any[] = [f.id_contrato, f.nome];
      sortedEvents.forEach(e => {
        const lanc = lancs.find(l => l.funcionario_id === f.id && l.evento_id === e.id);
        // HORA e PERCENTUAL exportam a quantidade (horas ou %); demais exportam o valor
        // HORA/PERCENTUAL exportam quantidade; Faltas (71) também exporta quantidade (dias)
        const isQty = e.unidade === 'HORA' || e.unidade === 'PERCENTUAL' || e.codigo_evento === 71;
        const exportValue = isQty
          ? (lanc && lanc.quantidade ? lanc.quantidade : '')
          : (lanc ? lanc.valor_total : '');
        rowData.push(exportValue);
      });
      worksheet.addRow(rowData);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      column.width = index === 1 ? 35 : 18; // Nome mais largo
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FolhaBemVindo_${comp?.mes}_${comp?.ano}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportTXT = async (comp: any, funcs: any[], lancs: any[], sortedEvents: any[]) => {
    let content = "";
    funcs.forEach(f => {
      sortedEvents.forEach(e => {
        const lanc = lancs.find(l => l.funcionario_id === f.id && l.evento_id === e.id);
        if (lanc && lanc.valor_total > 0) {
          // HORA/PERCENTUAL exportam quantidade; Faltas (71) também exporta quantidade (dias)
          const isQty = e.unidade === 'HORA' || e.unidade === 'PERCENTUAL' || e.codigo_evento === 71;
          const exportValor = isQty
            ? (lanc.quantidade || 0).toFixed(2).replace('.', ',')
            : lanc.valor_total.toFixed(2).replace('.', ',');
          content += `001;${f.id_contrato};${e.codigo_evento};${exportValor};${(lanc.quantidade || 0).toFixed(2).replace('.', ',')};\n`;
        }
      });
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Importacao_BemVindo_${comp?.mes}_${comp?.ano}.txt`;
    a.click();
  };

  const handleExportCSV = async (comp: any, funcs: any[], lancs: any[], sortedEvents: any[]) => {
    const getUnidadeLabel = (unidade: string) => {
      if (unidade === 'VALOR') return 'V';
      if (unidade === 'HORA') return 'H';
      return 'R';
    };

    // Linha 1: Códigos dos eventos
    const row1 = ['', '', ...sortedEvents.map(e => String(e.codigo_evento))];
    let content = row1.join(';') + '\n';

    // Linha 2: Unidade (V, H, R)
    const row2 = ['', '', ...sortedEvents.map(e => getUnidadeLabel(e.unidade))];
    content += row2.join(';') + '\n';

    // Linha 3: Títulos das colunas
    const row3 = ['Contrato do Empregado', 'Nome', ...sortedEvents.map(e => e.nome_evento?.toUpperCase() || '')];
    content += row3.join(';') + '\n';

    // Data rows
    funcs.forEach(f => {
      const rowData: string[] = [String(f.id_contrato), f.nome];
      sortedEvents.forEach(e => {
        const lanc = lancs.find(l => l.funcionario_id === f.id && l.evento_id === e.id);
        // HORA/PERCENTUAL exportam quantidade; Faltas (71) também exporta quantidade (dias)
        const isQty = e.unidade === 'HORA' || e.unidade === 'PERCENTUAL' || e.codigo_evento === 71;
        const exportValue = isQty
          ? (lanc && lanc.quantidade ? lanc.quantidade.toFixed(2).replace('.', ',') : '')
          : (lanc ? lanc.valor_total.toFixed(2).replace('.', ',') : '');
        rowData.push(exportValue);
      });
      content += rowData.join(';') + '\n';
    });

    // BOM for Excel UTF-8 recognition
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FolhaBemVindo_${comp?.mes}_${comp?.ano}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!selectedCompId) return;
    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const comp = competencias.find(c => c.id === selectedCompId);
      const funcs = await api.getFuncionarios();
      const lancs = await api.getLancamentos(selectedCompId);

      // Filtra apenas os eventos selecionados pelo usuário
      const filteredEvents = eventos.filter(e => selectedEventIds.includes(e.id));
      const sortedEvents = [...filteredEvents].sort((a, b) => (a.ordem_exportacao || 0) - (b.ordem_exportacao || 0));

      if (exportFormat === 'XLSX') {
        await handleExportXLSX(comp, funcs, lancs, sortedEvents);
      } else if (exportFormat === 'CSV') {
        await handleExportCSV(comp, funcs, lancs, sortedEvents);
      } else {
        await handleExportTXT(comp, funcs, lancs, sortedEvents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Exportação de Dados</h1>
        <p className="text-sm text-slate-500 mt-1">Gere arquivos para integração com contabilidade e sistemas externos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Control Card */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Competência de Referência</label>
              <select
                className="input-clean w-full"
                value={selectedCompId || ''}
                onChange={(e) => setSelectedCompId(Number(e.target.value))}
              >
                {(competencias || []).map(c => (
                  <option key={c.id} value={c.id}>
                    {(c.mes || 0).toString().padStart(2, '0')}/{(c.ano || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Colunas de Eventos</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedEventIds(eventos.map(e => e.id))}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 uppercase"
                  >
                    Marcar Tudo
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setSelectedEventIds([])}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrar eventos..."
                  className="input-clean w-full pl-9 text-xs py-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <AlertCircle size={14} />
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg max-h-[220px] overflow-y-auto bg-slate-50 p-2 space-y-1">
                {(eventos || []).filter(e => {
                  const name = (e.nome_evento || '').toLowerCase();
                  const code = (e.codigo_evento || '').toString();
                  const term = (searchTerm || '').toLowerCase();
                  return name.includes(term) || code.includes(term);
                }).map(evento => {
                  const isSelected = selectedEventIds.includes(evento.id);
                  return (
                    <label
                      key={evento.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-slate-100'
                        }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedEventIds(selectedEventIds.filter(id => id !== evento.id));
                          } else {
                            setSelectedEventIds([...selectedEventIds, evento.id]);
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                          {evento.codigo_evento} - {evento.nome_evento}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">{evento.natureza} | {evento.unidade}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-400 italic">
                {selectedEventIds.length} eventos selecionados para exportação.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Formato de Saída</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setExportFormat('XLSX')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all ${exportFormat === 'XLSX'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <FileSpreadsheet size={18} />
                  Excel
                </button>
                <button
                  onClick={() => setExportFormat('CSV')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all ${exportFormat === 'CSV'
                    ? 'bg-sky-50 border-sky-200 text-sky-700 ring-1 ring-sky-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <FileText size={18} />
                  CSV
                </button>
                <button
                  onClick={() => setExportFormat('TXT')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all ${exportFormat === 'TXT'
                    ? 'bg-slate-100 border-slate-300 text-slate-800 ring-1 ring-slate-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <FileText size={18} />
                  TXT
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || !selectedCompId}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Download size={20} />
                <span>Exportar Arquivo</span>
              </>
            )}
          </button>
        </div>

        {/* Info / Advisory */}
        <div className="space-y-6">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-6">
            <h4 className="flex items-center gap-2 font-bold text-sky-800 mb-2">
              <CheckCircle2 size={18} />
              Layout de Importação da Contabilidade
            </h4>
            <p className="text-sm text-sky-700 leading-relaxed">
              O arquivo gerado segue o layout de importação usado pela contabilidade. Certifique-se de que os códigos de eventos estejam mapeados corretamente antes de exportar.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-4">
              <AlertCircle size={18} className="text-amber-500" />
              Lembretes Importantes
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
              <li>Verifique se todos os lançamentos foram salvos.</li>
              <li>A competência não precisa estar fechada para testes.</li>
              <li>CPF e Matrícula são chaves obrigatórias.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportView;
