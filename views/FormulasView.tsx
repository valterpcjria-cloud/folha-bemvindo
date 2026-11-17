import React, { useState, useEffect, useCallback } from 'react';
import { evaluate } from 'mathjs';
import {
   Calculator,
   Variable,
   Zap,
   Save,
   Play,
   Code,
   Check,
   X,
   AlertCircle,
   ChevronDown
} from 'lucide-react';
import { CONFIG } from '../config';
import { api, authHeaders } from '../services/mockApi';

interface Evento {
   id: number;
   codigo_evento: string;
   nome_evento: string;
   tipo: string;
   formula: string | null;
}

interface TestResult {
   success: boolean;
   result?: number;
   error?: string;
}

const AVAILABLE_VARIABLES = [
   { name: 'SALARIO_BASE', description: 'Salário base do funcionário', testValue: 2200 },
   { name: 'SALARIO_MINIMO', description: 'Salário mínimo atual', testValue: 1412 },
   { name: 'QTD_HORAS', description: 'Quantidade de horas', testValue: 10 },
   { name: 'TOTAL_PROVENTOS', description: 'Total de proventos', testValue: 3000 },
   { name: 'FALTAS', description: 'Número de faltas', testValue: 2 },
   { name: 'DSR', description: 'Descanso Semanal Remunerado', testValue: 200 },
   { name: 'ADICIONAL_NOTURNO', description: 'Valor do adicional noturno', testValue: 150 },
];

const FormulasView: React.FC = () => {
   const [eventos, setEventos] = useState<Evento[]>([]);
   const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
   const [formula, setFormula] = useState('');
   const [isValid, setIsValid] = useState<boolean | null>(null);
   const [testResult, setTestResult] = useState<TestResult | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [isTesting, setIsTesting] = useState(false);
   const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
   const [showEventoDropdown, setShowEventoDropdown] = useState(false);

   // Carrega eventos
   useEffect(() => {
      const fetchEventos = async () => {
         try {
            // v4.58.0: sessão via cookie (antes lia sessionStorage 'token', chave inexistente)
            const res = await fetch(`${CONFIG.API_BASE_URL}/eventos`, {
               credentials: 'include',
               headers: authHeaders()
            });
            const data = await res.json();
            setEventos(data.data || []);

            // Seleciona o primeiro evento por padrão
            if (data.data && data.data.length > 0) {
               setSelectedEvento(data.data[0]);
               setFormula(data.data[0].formula || getDefaultFormula(data.data[0]));
            }
         } catch (error) {
            console.error('Erro ao carregar eventos:', error);
         }
      };
      fetchEventos();
   }, []);

   // Gera fórmula padrão baseada no tipo do evento
   const getDefaultFormula = (evento: Evento): string => {
      if (evento.nome_evento.toLowerCase().includes('hora extra')) {
         return `// Cálculo de ${evento.nome_evento}
// Base: Salário Contratual / 220 horas

var valorHora = {SALARIO_BASE} / 220;
var acrescimo = 2.0; // 100%

return valorHora * {QTD_HORAS} * acrescimo;`;
      }

      if (evento.nome_evento.toLowerCase().includes('falta')) {
         return `// Desconto por Faltas
var valorDiario = {SALARIO_BASE} / 30;
return valorDiario * {FALTAS};`;
      }

      return `// Fórmula para ${evento.nome_evento}
// Edite esta fórmula conforme necessário

return 0;`;
   };

   // Testa a fórmula
   const testFormula = useCallback(() => {
      setIsTesting(true);
      setTestResult(null);

      try {
         // Substitui variáveis pelos valores de teste
         let testCode = formula;

         // Verifica se a fórmula está vazia
         if (!formula.trim()) {
            throw new Error("A fórmula não pode estar vazia");
         }

         AVAILABLE_VARIABLES.forEach(v => {
            const regex = new RegExp(`\\{${v.name}\\}`, 'g');
            testCode = testCode.replace(regex, String(v.testValue));
         });

         // Avalia a expressão de forma segura via mathjs (sem execução de código arbitrário)
         const result = evaluate(testCode);

         if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            setIsValid(true);
            setTestResult({ success: true, result: Math.round(result * 100) / 100 });
         } else {
            setIsValid(false);
            setTestResult({ success: false, error: 'A fórmula deve retornar um número válido (numérico)' });
         }
      } catch (error: any) {
         setIsValid(false);
         setTestResult({ success: false, error: error.message });
      }

      setIsTesting(false);
   }, [formula]);

   // Salva a fórmula
   const saveFormula = async () => {
      if (!selectedEvento) return;

      setIsSaving(true);
      setSaveMessage(null);

      try {
         const data = await api.updateEvento({
            ...selectedEvento,
            formula: formula
         });

         if (data.success || data.id) {
            setSaveMessage({ type: 'success', text: 'Fórmula salva com sucesso!' });

            // Atualiza o evento na lista
            setEventos(prev => prev.map(e =>
               e.id === selectedEvento.id ? { ...e, formula } : e
            ));
         } else {
            setSaveMessage({ type: 'error', text: 'Erro ao salvar a fórmula' });
         }
      } catch (error: any) {
         setSaveMessage({ type: 'error', text: error.message || 'Erro de conexão' });
      }

      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
   };

   // Insere variável no cursor
   const insertVariable = (varName: string) => {
      setFormula(prev => prev + `{${varName}}`);
   };

   // Seleciona um evento
   const selectEvento = (evento: Evento) => {
      setSelectedEvento(evento);
      setFormula(evento.formula || getDefaultFormula(evento));
      setIsValid(null);
      setTestResult(null);
      setShowEventoDropdown(false);
   };

   // Atalho Ctrl+Enter
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            testFormula();
         }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [testFormula]);

   return (
      <div className="space-y-6 animate-in fade-in duration-500 font-sans">
         {/* Header */}
         <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Motor de Cálculo</h1>
               <p className="text-sm text-slate-500 mt-1">Configure as fórmulas de cálculo para eventos complexos.</p>
            </div>
            <button
               onClick={saveFormula}
               disabled={isSaving || !selectedEvento}
               className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
               <Save size={18} />
               <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
         </div>

         {/* Save Message */}
         {saveMessage && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${saveMessage.type === 'success'
               ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
               : 'bg-red-50 text-red-700 border border-red-200'
               }`}>
               {saveMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
               {saveMessage.text}
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor Area */}
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                  {/* Event Selector */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                     <div className="relative">
                        <button
                           onClick={() => setShowEventoDropdown(!showEventoDropdown)}
                           className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-lg transition-colors"
                        >
                           <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                              <Zap size={18} />
                           </div>
                           <div className="text-left">
                              <h3 className="font-bold text-slate-700">{selectedEvento?.nome_evento || 'Selecione um evento'}</h3>
                              <p className="text-xs text-slate-400 font-mono">ID: {selectedEvento?.codigo_evento || '-'}</p>
                           </div>
                           <ChevronDown size={16} className="text-slate-400" />
                        </button>

                        {/* Dropdown */}
                        {showEventoDropdown && (
                           <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
                              {eventos.map(ev => (
                                 <button
                                    key={ev.id}
                                    onClick={() => selectEvento(ev)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                 >
                                    <div className="font-medium text-slate-700">{ev.nome_evento}</div>
                                    <div className="text-xs text-slate-400 font-mono">{ev.codigo_evento} • {ev.tipo}</div>
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="flex items-center gap-2">
                        {isValid === true && (
                           <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              <Check size={12} /> Fórmula Válida
                           </span>
                        )}
                        {isValid === false && (
                           <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                              <X size={12} /> Fórmula Inválida
                           </span>
                        )}
                     </div>
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 relative bg-slate-900">
                     <textarea
                        className="w-full h-full p-6 bg-transparent text-slate-100 font-mono text-sm leading-relaxed outline-none resize-none selection:bg-sky-500/30"
                        value={formula}
                        onChange={(e) => {
                           setFormula(e.target.value);
                           setIsValid(null);
                           setTestResult(null);
                        }}
                        placeholder="// Digite sua fórmula aqui..."
                     />
                  </div>

                  {/* Test Result */}
                  {testResult && (
                     <div className={`p-4 border-t ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        {testResult.success ? (
                           <div className="flex items-center justify-between">
                              <span className="text-emerald-700 font-medium">✓ Resultado do teste:</span>
                              <span className="font-mono font-bold text-emerald-800 text-lg">
                                 R$ {testResult.result?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        ) : (
                           <div className="flex items-center gap-2 text-red-700">
                              <AlertCircle size={16} />
                              <span>Erro: {testResult.error}</span>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                     <div className="text-xs text-slate-500">
                        Pressione <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 mx-1">Ctrl + Enter</kbd> para testar
                     </div>
                     <button
                        onClick={testFormula}
                        disabled={isTesting || !formula}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                     >
                        <Play size={16} />
                        {isTesting ? 'Testando...' : 'Testar Agora'}
                     </button>
                  </div>
               </div>
            </div>

            {/* Sidebar Variables */}
            <div className="space-y-6">
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                     <Variable size={18} className="text-sky-600" />
                     Variáveis Disponíveis
                  </h4>
                  <div className="space-y-1">
                     {AVAILABLE_VARIABLES.map(v => (
                        <div
                           key={v.name}
                           onClick={() => insertVariable(v.name)}
                           className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                           title={v.description}
                        >
                           <code className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded group-hover:bg-white group-hover:shadow-sm">{`{${v.name}}`}</code>
                           <span className="text-xs text-slate-400 group-hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-all">Inserir</span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Test Values Info */}
               <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <h4 className="font-bold text-amber-800 mb-2 text-sm">Valores de Teste</h4>
                  <div className="text-xs text-amber-700 space-y-1">
                     {AVAILABLE_VARIABLES.slice(0, 4).map(v => (
                        <div key={v.name} className="flex justify-between">
                           <span>{v.name}:</span>
                           <span className="font-mono">{v.testValue}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-sky-50 border border-sky-100 rounded-xl p-6">
                  <h4 className="font-bold text-sky-800 mb-2 flex items-center gap-2">
                     <Code size={18} />
                     Funções Auxiliares
                  </h4>
                  <p className="text-sm text-sky-700 mb-4">Você pode usar funções matemáticas padrão do JavaScript, como <code className="font-mono font-bold">Math.round()</code>, <code className="font-mono font-bold">Math.max()</code>, etc.</p>
                  <div className="text-xs text-sky-600 space-y-1">
                     <div><code>Math.round(x)</code> - Arredonda</div>
                     <div><code>Math.max(a, b)</code> - Maior valor</div>
                     <div><code>Math.min(a, b)</code> - Menor valor</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default FormulasView;
