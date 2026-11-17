import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Funcionario, EventoFolha, Lancamento } from '../types';
import { calcularTodosEncargos } from '../utils/taxCalculations';

interface PaystubViewProps {
  employee?: Funcionario;
  batchEmployees?: Funcionario[];
  events: EventoFolha[];
  lancamentos?: Partial<Lancamento>[];
  lancamentosMap?: Record<string, Partial<Lancamento>>;
  onClose: () => void;
  onPrint?: () => void;
  competenciaLabel: string;
  isPrintMode?: boolean;
  isPreviewMode?: boolean;
}

const PaystubView: React.FC<PaystubViewProps> = ({
  employee,
  batchEmployees,
  events,
  lancamentos,
  lancamentosMap,
  onClose,
  onPrint,
  competenciaLabel,
  isPrintMode = false,
  isPreviewMode = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const employeesToRender = batchEmployees || (employee ? [employee] : []);
  const currentEmp = employeesToRender[currentIndex];

  if (!currentEmp && !isPrintMode) return null;

  const getEmpLancs = (emp: Funcionario) => {
    if (lancamentosMap) {
      return Object.keys(lancamentosMap)
        .filter(k => k.startsWith(`${emp.id}_`))
        .map(k => lancamentosMap[k]);
    }
    return lancamentos || [];
  };

  const renderSinglePaystub = (emp: Funcionario, isForPrint: boolean = false) => {
    const empLancs = getEmpLancs(emp);
    const encargos = calcularTodosEncargos(empLancs, events, 0);

    const proventos = empLancs.filter(l => {
        const ev = events.find(e => Number(e.id) === Number(l.evento_id));
        return ev?.tipo === 'CREDITO' && Number(ev.codigo_evento) !== 1900;
    });
    const descontosBase = empLancs.filter(l => {
        const ev = events.find(e => Number(e.id) === Number(l.evento_id));
        return ev?.tipo === 'DEBITO' && Number(ev.codigo_evento) !== 1900;
    });

    // v4.52.13: só adiciona linha sintética se NÃO existir lançamento real (evita duplicação após v4.52.11)
    const hasINSSLancamento = descontosBase.some(l =>
        events.find(e => Number(e.id) === Number(l.evento_id))?.codigo_evento === 35
    );
    const hasIRRFLancamento = descontosBase.some(l =>
        events.find(e => Number(e.id) === Number(l.evento_id))?.codigo_evento === 1920
    );
    const autoDescontos: any[] = [];
    if (encargos.inss > 0 && !hasINSSLancamento) autoDescontos.push({ codigo: 35, nome: 'INSS', valor_total: encargos.inss });
    if (encargos.irrf > 0 && !hasIRRFLancamento) autoDescontos.push({ codigo: 1920, nome: 'IRRF', valor_total: encargos.irrf });

    const totalProventos = proventos.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
    const totalDescontos = descontosBase.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0) + autoDescontos.reduce((acc, curr) => acc + curr.valor_total, 0);
    const liquido = totalProventos - totalDescontos;

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '--/--/----';
      try {
        const parts = dateStr.includes(' ') ? dateStr.split(' ')[0].split('-') : dateStr.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
      } catch (e) { return dateStr; }
    };

    const formatCPF = (cpf?: string) => {
      if (!cpf) return '';
      const clean = cpf.replace(/\D/g, '');
      return clean.length === 11 ? clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
    };

    const salarioEv = empLancs.find(l => events.find(e => Number(e.id) === Number(l.evento_id) && Number(e.codigo_evento) === 33));
    const salarioBaseValue = salarioEv ? Number(salarioEv.valor_total) : 0;

    return (
      <div className={`Paystub-Document ${isForPrint ? 'print:m-0 print:shadow-none' : 'bg-white shadow-xl rounded-sm'} border border-black text-[10px] font-serif text-black leading-tight max-w-[210mm] mx-auto p-[1px]`}>
        {/* Header */}
        <div className="grid grid-cols-[3.5fr_2fr] border-b border-black">
          <div className="p-1.5 border-r border-black flex flex-col justify-center">
            <h1 className="font-bold text-[11px] uppercase tracking-tight">0165-FRIGORIFICO FRIMELO LTDA</h1>
            <p className="uppercase text-[9px] font-medium">FRIGORIFICO FRIMELO LTDA Luziania-GO</p>
            <div className="mt-1 grid grid-cols-[auto_1fr_auto_1fr] gap-x-2">
              <span className="font-bold">CNPJ</span>
              <span>19.953.437/0001-78</span>
              <span className="font-bold border-l border-black pl-2">CPF:</span>
              <span>{formatCPF(emp.cpf)}</span>
            </div>
          </div>
          <div className="p-1 flex flex-col justify-between">
            <h2 className="font-bold text-center uppercase text-[11px] leading-tight mb-1">Demonstrativo de Pagamento de Salário</h2>
            <div className="grid grid-cols-2 border-t border-black pt-1">
              <span className="text-center font-bold border-r border-black">{competenciaLabel}</span>
              <span className="text-center font-bold">Mensal</span>
            </div>
          </div>
        </div>

        {/* Employee Info */}
        <div className="border-b border-black">
          <div className="grid grid-cols-[50px_1fr_60px_60px_60px_100px_30px] border-b border-black bg-zinc-100/30">
            <div className="p-0.5 border-r border-black font-bold text-center">Cadastro</div>
            <div className="p-0.5 border-r border-black font-bold pl-2">Nome do Funcionário</div>
            <div className="p-0.5 border-r border-black font-bold text-center">CBO</div>
            <div className="p-0.5 border-r border-black font-bold text-center">Empresa</div>
            <div className="p-0.5 border-r border-black font-bold text-center">Local</div>
            <div className="p-0.5 border-r border-black font-bold text-center">Departamento</div>
            <div className="p-0.5 font-bold text-center">FL</div>
          </div>
          <div className="grid grid-cols-[50px_1fr_60px_60px_60px_100px_30px] border-b border-black min-h-[1.5rem] items-center">
            <div className="p-0.5 border-r border-black font-bold text-center">{emp.id_contrato}</div>
            <div className="p-0.5 border-r border-black font-bold pl-2 uppercase">{emp.nome}</div>
            <div className="p-0.5 border-r border-black text-center">{emp.cbo || '784205'}</div>
            <div className="p-0.5 border-r border-black text-center">{emp.empresa_codigo || '165'}</div>
            <div className="p-0.5 border-r border-black text-center">{emp.local || '1'}</div>
            <div className="p-0.5 border-r border-black text-center">{emp.departamento || '999'}</div>
            <div className="p-0.5 text-center">01</div>
          </div>
          <div className="grid grid-cols-[1fr_120px_1.5fr]">
            <div className="p-0.5 pl-14 font-bold border-r border-black italic">{emp.cargo || 'Auxiliar de Produção'}</div>
            <div className="p-0.5 pl-2 font-bold border-r border-black text-right pr-2">Data Admissão:</div>
            <div className="p-0.5 pl-4 font-bold">{formatDate(emp.data_admissao)}</div>
          </div>
        </div>

        {/* Main Table */}
        <div className="grid grid-cols-[50px_1fr_80px_100px_100px] border-r border-black min-h-[280px] content-start">
          <div className="border-r border-b border-black p-1 font-bold">Ev</div>
          <div className="border-r border-b border-black p-1 font-bold">Descrição</div>
          <div className="border-r border-b border-black p-1 font-bold text-right">Referência</div>
          <div className="border-r border-b border-black p-1 font-bold text-right">Proventos</div>
          <div className="border-b border-black p-1 font-bold text-right">Descontos</div>

          {empLancs.filter(l => {
            const ev = events.find(e => Number(e.id) === Number(l.evento_id));
            return Number(l.valor_total || 0) > 0 && ev?.codigo_evento !== 1900;
          }).map((l, i) => {
            const ev = events.find(e => Number(e.id) === Number(l.evento_id));
            const isCredit = ev?.tipo === 'CREDITO';
            return (
              <React.Fragment key={i}>
                <div className="p-1 text-right pr-2 border-r border-black">{ev?.codigo_evento}</div>
                <div className="p-1 pl-2 border-r border-black">{ev?.nome_evento}</div>
                <div className="p-1 text-right border-r border-black">
                  {l.quantidade && l.quantidade > 0
                    ? (ev?.unidade === 'HORA' ? `${Math.floor(l.quantidade)}:00` : l.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                    : ''}
                </div>
                <div className="p-1 text-right border-r border-black">{isCredit ? (l.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}</div>
                <div className="p-1 text-right">{!isCredit ? (l.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}</div>
              </React.Fragment>
            );
          })}
          {autoDescontos.map((d, i) => (
            <React.Fragment key={`auto-${i}`}>
              <div className="p-1 text-right pr-2 border-r border-black">{d.codigo}</div>
              <div className="p-1 pl-2 border-r border-black">{d.nome}</div>
              <div className="p-1 text-right border-r border-black"></div>
              <div className="p-1 text-right border-r border-black"></div>
              <div className="p-1 text-right">{d.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </React.Fragment>
          ))}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-[1fr_100px_100px] border-t border-black">
          <div className="p-1 font-bold text-right pr-2">Total</div>
          <div className="p-1 border-l border-black font-bold text-right">{totalProventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="p-1 border-l border-black font-bold text-right">{totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="grid grid-cols-[1fr_100px] border-t border-black">
          <div className="p-1 font-bold text-right pr-2 uppercase">Total Líquido</div>
          <div className="p-1 border-l border-black font-bold text-right text-base bg-zinc-100 uppercase">
            {liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="grid grid-cols-6 border-t border-black text-center">
          <div className="border-r border-black">
            <div className="font-bold border-b border-black p-0.5">Salário Base</div>
            <div className="p-1">{salarioBaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="border-r border-black">
            <div className="font-bold border-b border-black p-0.5">Sal Cont INSS</div>
            <div className="p-1">{encargos.baseINSS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="border-r border-black">
            <div className="font-bold border-b border-black p-0.5">Bas Cálc FGTS</div>
            <div className="p-1">{encargos.baseFGTS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="border-r border-black">
            <div className="font-bold border-b border-black p-0.5">FGTS Mês</div>
            <div className="p-1">{encargos.fgts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="border-r border-black">
            <div className="font-bold border-b border-black p-0.5">Bas Cálc IRRF</div>
            <div className="p-1">{encargos.baseIRRF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="grid grid-cols-[1fr_40px] border-b border-black">
              <div className="border-r border-black font-bold p-0.5">Faixa</div>
              <div className="font-bold p-0.5">Dep</div>
            </div>
            <div className="grid grid-cols-[1fr_40px]">
              <div className="border-r border-black p-1">{encargos.faixaIRRF.toFixed(1)}%</div>
              <div className="p-1">00</div>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="mt-6 border-t border-black p-2 flex items-end justify-between gap-4">
          <div className="flex gap-2 items-baseline whitespace-nowrap">
            <span className="font-bold">Recebi em:</span>
            <div className="border-b border-black w-32 h-4"></div>
          </div>
          <div className="flex gap-2 items-baseline w-full">
            <span className="font-bold">Assinatura:</span>
            <div className="border-b border-black w-full h-4"></div>
          </div>
        </div>
      </div>
    );
  };

  if (isPrintMode) {
    return (
      <div className="w-full bg-white">
        {employeesToRender.map((emp, i) => (
          <div key={emp.id} className={i > 0 ? "mt-8 break-before-page pt-4" : ""}>
            {renderSinglePaystub(emp, true)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col bg-slate-900 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Premium Toolbar */}
      <header className="h-20 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <FileText className="text-sky-400" size={24} />
              Pré-visualização Premium
            </h2>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
              {employeesToRender.length > 1
                ? `${employeesToRender.length} Documentos Selecionados`
                : `${currentEmp?.nome} • ${competenciaLabel}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {employeesToRender.length > 1 && (
            <div className="flex items-center gap-2 mr-6 bg-white/5 p-1.5 rounded-xl border border-white/5">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white disabled:opacity-20 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-black text-white/60 px-2 min-w-[60px] text-center">
                {currentIndex + 1} / {employeesToRender.length}
              </span>
              <button
                disabled={currentIndex === employeesToRender.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white disabled:opacity-20 hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <button
            onClick={onPrint}
            className="flex items-center gap-3 px-6 h-12 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-500 transition-all shadow-xl shadow-sky-600/20 active:scale-95"
          >
            <Printer size={18} />
            Imprimir / PDF
          </button>
        </div>
      </header>

      {/* Preview Area */}
      <main className="flex-1 overflow-y-auto p-12 flex justify-center bg-[#0a0a0c] pattern-grid">
        <div className="animate-in zoom-in-95 fade-in duration-700">
          {currentEmp && renderSinglePaystub(currentEmp)}

          <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/5 max-w-[210mm] mx-auto">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Informações Legais</h4>
            <p className="text-[10px] text-white/30 leading-relaxed italic">
              Este documento é uma representação digital fiel do demonstrativo de pagamento gerado pelo Sistema RH. A formatação segue os padrões exigidos pela legislação trabalhista brasileira (CLT), incluindo bases de cálculo de IRRF, INSS e FGTS.
            </p>
          </div>
        </div>
      </main>

      <style>{`
        .pattern-grid {
          background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0);
          background-size: 32px 32px;
        }
        @media print {
          .Paystub-Document { 
            box-shadow: none !important; 
            margin: 0 !important; 
            border: 1px solid black !important;
          }
          .break-before-page { page-break-before: always; }
        }
      `}</style>
    </div>
  );
};

export default PaystubView;
