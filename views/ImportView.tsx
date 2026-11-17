import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { api } from '../services/mockApi';

const ImportView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importType, setImportType] = useState<'employees' | 'payroll'>('employees');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const processFile = async (file: File): Promise<any[]> => {
    let rows: any[][] = [];

    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: false,
        skipEmptyLines: 'greedy'
      });
      rows = result.data as any[][];
    } else {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('Planilha não encontrada');
      worksheet.eachRow((row) => {
        rows.push(row.values as any[]);
      });
    }

    if (rows.length === 0) return [];

    // Helper p/ normalizar busca de headers
    const findHeaderIndex = (allRows: any[][]) => {
      return allRows.findIndex(row => {
        if (!row || !Array.isArray(row)) return false;
        const rowStr = row.join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const hasNome = rowStr.includes('nome') || rowStr.includes('funcionario') || rowStr.includes('colaborador') || rowStr.includes('empregado');
        const hasMatricula = rowStr.includes('contrato') || rowStr.includes('matricula') || rowStr.includes('id') || rowStr.includes('codigo');
        return hasNome && hasMatricula;
      });
    };

    const headerIndex = findHeaderIndex(rows);
    let headers: any[] = [];
    let dataRows: any[][] = [];

    if (headerIndex === -1) {
      headers = rows[0].filter(h => h !== undefined && h !== null);
      dataRows = rows.slice(1);
    } else {
      headers = rows[headerIndex];
      dataRows = rows.slice(headerIndex + 1);
    }

    // Clean headers (remove ExcelJS 1-indexing gap and nulls)
    const cleanHeaders = headers.map(h => String(h || '').trim()).filter(h => h !== '');

    return dataRows.map(row => {
      const obj: any = {};
      const values = Array.isArray(row) ? row : [];

      // 1. Identificar índices das colunas principais para priorização
      const priorityKeys = ['CONTRATO', 'MATRICULA', 'NOME', 'CODIGO'];

      // 2. Mapear todos os dados
      cleanHeaders.forEach((h, i) => {
        const val = Array.isArray(row) ? (file.name.endsWith('.xlsx') ? row[i + 1] : row[i]) : null;
        if (h) obj[h] = val;
      });

      // 3. Reordenar chaves do objeto para a pré-visualização (Prioridade no início)
      const sortedKeys = Object.keys(obj).sort((a, b) => {
        const aNorm = a.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const bNorm = b.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const aPriority = priorityKeys.some(px => aNorm.includes(px)) ? 0 : 1;
        const bPriority = priorityKeys.some(px => bNorm.includes(px)) ? 0 : 1;

        if (aPriority !== bPriority) return aPriority - bPriority;

        // Se ambos são prioridade, Matrícula vem antes de Nome
        if (aPriority === 0) {
          const aIsMat = aNorm.includes('CONTRATO') || aNorm.includes('MATRICULA') || aNorm.includes('CODIGO');
          const bIsMat = bNorm.includes('CONTRATO') || bNorm.includes('MATRICULA') || bNorm.includes('CODIGO');
          if (aIsMat && !bIsMat) return -1;
          if (!aIsMat && bIsMat) return 1;
        }

        return 0;
      });

      const sortedObj: any = {};
      sortedKeys.forEach(k => sortedObj[k] = obj[k]);
      return sortedObj;
    }).filter(obj => Object.values(obj).some(v => v !== null && v !== undefined && v !== ''));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      try {
        const data = await processFile(f);
        setPreview(data.slice(0, 5));
      } catch (error) {
        console.error("File read error:", error);
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const allData = await processFile(file);
      if (allData.length === 0) throw new Error("Nenhum dado encontrado no arquivo.");

      if (importType === 'employees') {
        await (api as any).importFuncionarios(allData);
      } else {
        await (api as any).importLancamentos(allData);
      }

      setIsProcessing(false);
      setSuccess(true);
      setPreview([]);
      setFile(null);
    } catch (error: any) {
      console.error("Import failed:", error);
      setIsProcessing(false);
      alert(error.message || 'Erro na importação. Verifique o formato do arquivo.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Importação de Dados</h1>
          <p className="text-sm text-slate-500 mt-1">Carregue dados em massa via arquivos Excel ou CSV.</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => { setImportType('employees'); setSuccess(false); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${importType === 'employees' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Funcionários
          </button>
          <button
            onClick={() => { setImportType('payroll'); setSuccess(false); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${importType === 'payroll' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lançamentos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Import Area */}
        <div className="lg:col-span-2 space-y-6">
          {!success && (
            <div className={`relative border-2 border-dashed rounded-xl p-12 transition-all flex flex-col items-center text-center space-y-4 group ${file ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'}`}>
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
              />
              <div className={`p-4 rounded-full transition-colors ${file ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-500'}`}>
                <Upload size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-700">
                  {file ? file.name : 'Clique ou arraste o arquivo aqui'}
                </p>
                <p className="text-sm text-slate-400">Suporta .xlsx, .xls e .csv</p>
              </div>
            </div>
          )}

          {preview.length > 0 && !success && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-sky-600" />
                  Pré-visualização de Dados
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Mostrando 5 primeiras linhas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      {Object.keys(preview[0] || {}).sort((a, b) => {
                        const priorityKeys = ['CONTRATO', 'MATRICULA', 'NOME', 'CODIGO'];
                        const aNorm = a.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const bNorm = b.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                        const aPriority = priorityKeys.some(px => aNorm.includes(px)) ? 0 : 1;
                        const bPriority = priorityKeys.some(px => bNorm.includes(px)) ? 0 : 1;

                        if (aPriority !== bPriority) return aPriority - bPriority;

                        // Se ambos são prioridade, Matrícula vem antes de Nome
                        if (aPriority === 0) {
                          const aIsMat = aNorm.includes('CONTRATO') || aNorm.includes('MATRICULA') || aNorm.includes('CODIGO');
                          const bIsMat = bNorm.includes('CONTRATO') || bNorm.includes('MATRICULA') || bNorm.includes('CODIGO');
                          if (aIsMat && !bIsMat) return -1;
                          if (!aIsMat && bIsMat) return 1;
                        }
                        return 0;
                      }).map(k => <th key={k} className="px-4 py-3 border-b border-slate-200">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => {
                      const sortedKeys = Object.keys(row).sort((a, b) => {
                        const priorityKeys = ['CONTRATO', 'MATRICULA', 'NOME', 'CODIGO'];
                        const aNorm = a.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const bNorm = b.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const aP = priorityKeys.some(px => aNorm.includes(px)) ? 0 : 1;
                        const bP = priorityKeys.some(px => bNorm.includes(px)) ? 0 : 1;
                        if (aP !== bP) return aP - bP;
                        if (aP === 0) {
                          const aIsMat = aNorm.includes('CONTRATO') || aNorm.includes('MATRICULA') || aNorm.includes('CODIGO');
                          const bIsMat = bNorm.includes('CONTRATO') || bNorm.includes('MATRICULA') || bNorm.includes('CODIGO');
                          return aIsMat && !bIsMat ? -1 : (!aIsMat && bIsMat ? 1 : 0);
                        }
                        return 0;
                      });
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          {sortedKeys.map((k, j) => (
                            <td key={j} className="px-4 py-3 text-slate-700 font-mono">
                              {row[k]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                  <span>Confirmar Importação</span>
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-emerald-800">Importação Concluída com Sucesso!</h3>
              <p className="text-emerald-600 mt-2 mb-6">Os dados foram processados e salvos no banco de dados.</p>
              <button
                onClick={() => setSuccess(false)}
                className="btn-secondary"
              >
                Importar Outro Arquivo
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              Instruções
            </h4>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-slate-600">
                <ArrowRight size={16} className="text-sky-500 shrink-0 mt-0.5" />
                <span>O arquivo deve conter cabeçalhos na primeira linha.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <ArrowRight size={16} className="text-sky-500 shrink-0 mt-0.5" />
                <span>Para <strong>Funcionários</strong>: Colunas obrigatórias apenas: <strong>Nome</strong> e <strong>Matrícula (ou Contrato)</strong>.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-600">
                <ArrowRight size={16} className="text-sky-500 shrink-0 mt-0.5" />
                <span>Para <strong>Lançamentos</strong>: Colunas obrigatórias: Matrícula, Código Evento, Valor/Qtd.</span>
              </li>
            </ul>
            <button className="w-full mt-6 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-sky-100 flex items-center justify-center gap-2">
              <FileSpreadsheet size={16} /> Baixar Modelo .xlsx
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportView;
