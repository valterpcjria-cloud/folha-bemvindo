import React, { useEffect } from 'react';
import { Funcionario, EventoFolha, Lancamento } from '../types';
import { calcularTodosEncargos } from '../utils/taxCalculations';
import { useEmpresaAtual, EmpresaCabecalho } from '../hooks/useEmpresaAtual';

interface PrintBatchViewProps {
  employees: Funcionario[];
  events: EventoFolha[];
  lancamentosMap: Record<string, Partial<Lancamento>>;
  competenciaLabel: string;
  onClose: () => void;
}

// ─── Contracheque individual (versão para impressão, sem UI chrome) ───────────
function SinglePaystubPrint({
  emp,
  events,
  lancamentosMap,
  competenciaLabel,
  empresa,
}: {
  emp: Funcionario;
  events: EventoFolha[];
  lancamentosMap: Record<string, Partial<Lancamento>>;
  competenciaLabel: string;
  empresa: EmpresaCabecalho | null;
}) {
  const empLancs = Object.keys(lancamentosMap)
    .filter(k => k.startsWith(`${emp.id}_`))
    .map(k => lancamentosMap[k]);

  const encargos = calcularTodosEncargos(empLancs, events, 0);

  const proventos = empLancs.filter(l =>
    events.find(e => Number(e.id) === Number(l.evento_id))?.tipo === 'CREDITO'
  );
  const descontosBase = empLancs.filter(l =>
    events.find(e => Number(e.id) === Number(l.evento_id))?.tipo === 'DEBITO'
  );

  // v4.52.13: só adiciona linha sintética se NÃO existir lançamento real (evita duplicação após v4.52.11)
  const hasINSSLancamento = descontosBase.some(l =>
    events.find(e => Number(e.id) === Number(l.evento_id))?.codigo_evento === 35
  );
  const hasIRRFLancamento = descontosBase.some(l =>
    events.find(e => Number(e.id) === Number(l.evento_id))?.codigo_evento === 1920
  );
  const autoDescontos: { codigo: number; nome: string; valor_total: number }[] = [];
  if (encargos.inss > 0 && !hasINSSLancamento) autoDescontos.push({ codigo: 35, nome: 'INSS', valor_total: encargos.inss });
  if (encargos.irrf > 0 && !hasIRRFLancamento) autoDescontos.push({ codigo: 1920, nome: 'IRRF', valor_total: encargos.irrf });

  const totalProventos = proventos.reduce((acc, l) => acc + Number(l.valor_total || 0), 0);
  const totalDescontos =
    descontosBase.reduce((acc, l) => acc + Number(l.valor_total || 0), 0) +
    autoDescontos.reduce((acc, d) => acc + d.valor_total, 0);
  const liquido = totalProventos - totalDescontos;

  const salarioEv = empLancs.find(l =>
    events.find(e => Number(e.id) === Number(l.evento_id) && Number(e.codigo_evento) === 33)
  );
  const salarioBaseValue = salarioEv ? Number(salarioEv.valor_total) : 0;

  const formatDate = (d?: string) => {
    if (!d) return '--/--/----';
    try {
      const parts = d.includes(' ') ? d.split(' ')[0].split('-') : d.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
    } catch { return d; }
  };

  const formatCPF = (cpf?: string) => {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    return clean.length === 11 ? clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="paystub-slip">
      {/* HEADER */}
      <div className="slip-header">
        <div className="slip-company">
          {/* Bem Vindo: dados da empresa vêm do cadastro (antes: Frimelo fixo no código) */}
          <strong>{empresa?.razao_social || ''}</strong>
          <span>{empresa ? `${empresa.razao_social}${empresa.cidadeUf ? ` – ${empresa.cidadeUf}` : ''}` : ''}</span>
          <span>CNPJ: {empresa?.cnpj || ''} &nbsp;|&nbsp; CPF: {formatCPF(emp.cpf)}</span>
        </div>
        <div className="slip-title">
          <strong>Demonstrativo de Pagamento de Salário</strong>
          <div className="slip-comp-row">
            <span>{competenciaLabel}</span>
            <span>Mensal</span>
          </div>
        </div>
      </div>

      {/* EMPLOYEE INFO */}
      <div className="slip-emp">
        <div className="slip-emp-labels">
          <span>Cadastro</span><span>Nome do Funcionário</span>
          <span>CBO</span><span>Empresa</span><span>Local</span>
          <span>Departamento</span><span>FL</span>
        </div>
        <div className="slip-emp-values">
          <span>{emp.id_contrato}</span>
          <span className="emp-name">{emp.nome}</span>
          <span>{emp.cbo || '784205'}</span>
          <span>{emp.empresa_codigo || ''}</span>
          <span>{emp.local || '1'}</span>
          <span>{emp.departamento || '999'}</span>
          <span>01</span>
        </div>
        <div className="slip-emp-bottom">
          <span className="cargo">{emp.cargo || 'Auxiliar de Produção'}</span>
          <span className="admissao-label">Data Admissão:</span>
          <span>{formatDate(emp.data_admissao)}</span>
        </div>
      </div>

      {/* EVENTS TABLE */}
      <div className="slip-table">
        <div className="slip-table-header">
          <span>Ev</span><span>Descrição</span>
          <span className="right">Referência</span>
          <span className="right">Proventos</span>
          <span className="right">Descontos</span>
        </div>
        <div className="slip-table-body">
          {empLancs.filter(l => Number(l.valor_total || 0) > 0).map((l, i) => {
            const ev = events.find(e => Number(e.id) === Number(l.evento_id));
            const isCredit = ev?.tipo === 'CREDITO';
            return (
              <div key={i} className="slip-row">
                <span>{ev?.codigo_evento}</span>
                <span>{ev?.nome_evento}</span>
                <span className="right">
                  {l.quantidade && l.quantidade > 0
                    ? (ev?.unidade === 'HORA'
                      ? `${Math.floor(l.quantidade)}:00`
                      : l.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                    : ''}
                </span>
                <span className="right">{isCredit ? fmt(Number(l.valor_total || 0)) : ''}</span>
                <span className="right">{!isCredit ? fmt(Number(l.valor_total || 0)) : ''}</span>
              </div>
            );
          })}
          {autoDescontos.map((d, i) => (
            <div key={`auto-${i}`} className="slip-row">
              <span>{d.codigo}</span>
              <span>{d.nome}</span>
              <span></span><span></span>
              <span className="right">{fmt(d.valor_total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TOTALS */}
      <div className="slip-totals">
        <span>Total</span>
        <span className="right">{fmt(totalProventos)}</span>
        <span className="right">{fmt(totalDescontos)}</span>
      </div>
      <div className="slip-liquid">
        <span>Total Líquido</span>
        <span className="right liquid-value">{fmt(liquido)}</span>
      </div>

      {/* FOOTER METRICS */}
      <div className="slip-metrics">
        <div><span>Salário Base</span><strong>{fmt(salarioBaseValue)}</strong></div>
        <div><span>Sal Cont INSS</span><strong>{fmt(encargos.baseINSS)}</strong></div>
        <div><span>Bas Cálc FGTS</span><strong>{fmt(encargos.baseFGTS)}</strong></div>
        <div><span>FGTS Mês</span><strong>{fmt(encargos.fgts)}</strong></div>
        <div><span>Bas Cálc IRRF</span><strong>{fmt(encargos.baseIRRF)}</strong></div>
        <div className="metric-faixa">
          <div><span>Faixa</span><span>Dep</span></div>
          <div><strong>{encargos.faixaIRRF.toFixed(1)}%</strong><strong>00</strong></div>
        </div>
      </div>

      {/* SIGNATURE */}
      <div className="slip-signature">
        <span>Recebi em: <span className="sig-line"></span></span>
        <span>Assinatura: <span className="sig-line sig-full"></span></span>
      </div>
    </div>
  );
}

// ─── Componente principal de impressão em lote ────────────────────────────────
const STUBS_PER_PAGE = 3;

export const PrintBatchView: React.FC<PrintBatchViewProps> = ({
  employees,
  events,
  lancamentosMap,
  competenciaLabel,
  onClose,
}) => {
  // Agrupa em páginas de 3 (tenta 3, cai para 2 se preferir — aqui usamos 3 fixo)
  const pages: Funcionario[][] = [];
  for (let i = 0; i < employees.length; i += STUBS_PER_PAGE) {
    pages.push(employees.slice(i, i + STUBS_PER_PAGE));
  }

  const { empresa, pronto } = useEmpresaAtual();

  // Dispara window.print() automaticamente quando o componente montar
  // (Bem Vindo: espera os dados da empresa do cabeçalho carregarem)
  useEffect(() => {
    if (!pronto) return;
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [pronto]);

  return (
    <>
      {/* ── Barra de controle (oculta na impressão) ── */}
      <div className="print-toolbar no-print">
        <button onClick={onClose} className="btn-back">← Voltar</button>
        <div className="toolbar-info">
          <strong>{employees.length}</strong> contracheques •{' '}
          <strong>{pages.length}</strong> página{pages.length !== 1 ? 's' : ''} A4
          &nbsp;({STUBS_PER_PAGE} por página)
        </div>
        <button onClick={() => window.print()} className="btn-print">🖨️ Imprimir / Salvar PDF</button>
      </div>

      {/* ── Páginas de impressão ── */}
      <div className="print-document">
        {pages.map((pageEmps, pageIdx) => (
          <div key={pageIdx} className="print-page">
            {pageEmps.map((emp, slotIdx) => (
              <div
                key={emp.id}
                className={`print-slot${slotIdx < pageEmps.length - 1 ? ' slot-divider' : ''}`}
              >
                <SinglePaystubPrint
                  emp={emp}
                  events={events}
                  lancamentosMap={lancamentosMap}
                  competenciaLabel={competenciaLabel}
                  empresa={empresa}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Estilos de impressão ── */}
      <style>{`
        /* ── TOOLBAR ── */
        .print-toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 12px 24px;
          background: #1e293b; border-bottom: 2px solid #0ea5e9;
          font-family: system-ui, sans-serif;
        }
        .toolbar-info { color: #94a3b8; font-size: 13px; }
        .toolbar-info strong { color: #e2e8f0; }
        .btn-back {
          padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 13px;
          background: transparent; border: 1px solid #334155; color: #94a3b8; cursor: pointer;
        }
        .btn-back:hover { background: #334155; color: #fff; }
        .btn-print {
          padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 13px;
          background: #0ea5e9; color: white; border: none; cursor: pointer;
        }
        .btn-print:hover { background: #0284c7; }

        /* ── DOCUMENTO DE IMPRESSÃO ── */
        .print-document {
          background: #f1f5f9;
          padding-top: 64px; /* clearance for toolbar */
          min-height: 100vh;
        }

        /* ── PÁGINA A4 (visualização) ── */
        .print-page {
          width: 210mm;
          min-height: 297mm;
          margin: 24px auto;
          background: white;
          box-shadow: 0 4px 32px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── SLOT: cada contracheque ocupa 1/3 da página ── */
        .print-slot {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          overflow: hidden;
          max-height: calc(297mm / 3);
          box-sizing: border-box;
        }
        .slot-divider {
          border-bottom: 1.5px dashed #999;
        }

        /* ── CONTRACHEQUE ── */
        .paystub-slip {
          font-family: 'Courier New', Courier, monospace;
          font-size: 8.5pt;
          line-height: 1.2;
          color: #000;
          border: 1px solid #000;
          margin: 2mm;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* HEADER */
        .slip-header {
          display: grid; grid-template-columns: 3.5fr 2fr;
          border-bottom: 1px solid #000;
        }
        .slip-company {
          padding: 3px 5px; border-right: 1px solid #000;
          display: flex; flex-direction: column; gap: 1px;
        }
        .slip-company strong { font-size: 9pt; text-transform: uppercase; }
        .slip-title {
          padding: 3px 5px; display: flex; flex-direction: column;
          align-items: center; justify-content: space-between;
        }
        .slip-title strong { font-size: 9pt; text-align: center; text-transform: uppercase; }
        .slip-comp-row {
          display: flex; width: 100%; border-top: 1px solid #000;
          padding-top: 2px; justify-content: space-around; font-weight: bold;
        }

        /* EMPLOYEE */
        .slip-emp { border-bottom: 1px solid #000; }
        .slip-emp-labels, .slip-emp-values {
          display: grid;
          grid-template-columns: 50px 1fr 55px 55px 45px 90px 28px;
          border-bottom: 1px solid #000;
        }
        .slip-emp-labels > span, .slip-emp-values > span {
          padding: 1px 3px; overflow: hidden; white-space: nowrap;
          text-overflow: ellipsis;
        }
        .slip-emp-labels { background: #f0f0f0; font-weight: bold; }
        .slip-emp-labels > span:not(:last-child),
        .slip-emp-values > span:not(:last-child) {
          border-right: 1px solid #000;
        }
        .emp-name { font-weight: bold; text-transform: uppercase; }
        .slip-emp-bottom {
          display: grid; grid-template-columns: 1fr 100px 1fr;
          padding: 1px 3px;
        }
        .cargo { font-weight: bold; font-style: italic; }
        .admissao-label { font-weight: bold; text-align: right; }

        /* TABLE */
        .slip-table { flex: 1; border-bottom: 1px solid #000; overflow: hidden; }
        .slip-table-header {
          display: grid; grid-template-columns: 42px 1fr 75px 85px 85px;
          background: #f0f0f0; border-bottom: 1px solid #000; font-weight: bold;
        }
        .slip-table-header > span, .slip-row > span {
          padding: 1px 3px; border-right: 1px solid #000;
          overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
        }
        .slip-table-header > span:last-child, .slip-row > span:last-child {
          border-right: none;
        }
        .slip-table-body { font-size: 8pt; }
        .slip-row {
          display: grid; grid-template-columns: 42px 1fr 75px 85px 85px;
        }
        .slip-row:nth-child(even) { background: #fafafa; }
        .right { text-align: right; }

        /* TOTALS */
        .slip-totals {
          display: grid; grid-template-columns: 1fr 85px 85px;
          border-top: 1px solid #000; font-weight: bold; background: #f5f5f5;
        }
        .slip-totals > span { padding: 2px 4px; border-right: 1px solid #000; }
        .slip-totals > span:last-child { border-right: none; }
        .slip-totals > span:first-child { text-align: right; padding-right: 6px; }

        .slip-liquid {
          display: grid; grid-template-columns: 1fr 85px;
          border-top: 1px solid #000; font-weight: bold;
        }
        .slip-liquid > span { padding: 2px 4px; border-right: 1px solid #000; }
        .slip-liquid > span:last-child { border-right: none; }
        .slip-liquid > span:first-child { text-align: right; padding-right: 6px; text-transform: uppercase; }
        .liquid-value { background: #e8e8e8; text-align: right; font-size: 10pt; }

        /* METRICS */
        .slip-metrics {
          display: grid; grid-template-columns: repeat(6, 1fr);
          border-top: 1px solid #000; text-align: center;
        }
        .slip-metrics > div {
          display: flex; flex-direction: column; border-right: 1px solid #000;
        }
        .slip-metrics > div:last-child { border-right: none; }
        .slip-metrics > div > span { border-bottom: 1px solid #000; padding: 1px 2px; font-weight: bold; font-size: 7pt; }
        .slip-metrics > div > strong { padding: 2px; font-size: 8pt; }
        .metric-faixa { display: flex; flex-direction: column !important; }
        .metric-faixa > div:first-child {
          display: flex; border-bottom: 1px solid #000;
        }
        .metric-faixa > div:first-child > span {
          flex: 1; text-align: center; font-weight: bold; font-size: 7pt;
          padding: 1px; border-bottom: none;
        }
        .metric-faixa > div:first-child > span:first-child { border-right: 1px solid #000; }
        .metric-faixa > div:last-child {
          display: flex; flex: 1;
        }
        .metric-faixa > div:last-child > strong {
          flex: 1; text-align: center; padding: 2px;
        }
        .metric-faixa > div:last-child > strong:first-child { border-right: 1px solid #000; }

        /* SIGNATURE */
        .slip-signature {
          display: flex; gap: 24px; padding: 4px 8px;
          border-top: 1px solid #000; font-size: 8pt; font-weight: bold;
          align-items: flex-end;
        }
        .sig-line {
          display: inline-block; border-bottom: 1px solid #000;
          width: 80px; margin-left: 4px;
        }
        .sig-full { width: 200px; }

        /* ════════════════════════════════════════════
           REGRAS DE IMPRESSÃO — @media print
           ════════════════════════════════════════════ */
        @media print {
          /* Oculta tudo que não é o documento */
          .no-print { display: none !important; }

          /* Remove decoração do body */
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Configura página A4 exata */
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          .print-document {
            background: white;
            padding-top: 0;
          }

          /* Cada .print-page = exatamente 1 folha A4 */
          .print-page {
            width: 100%;
            height: calc(297mm - 12mm); /* desconta margin top+bottom */
            margin: 0;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
          }

          /* Última página não precisa de salto */
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* Cada slot ocupa exatamente 1/3 da página */
          .print-slot {
            flex: 1;
            max-height: calc((297mm - 12mm) / 3);
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Divisor tracejado entre contracheques */
          .slot-divider {
            border-bottom: 1px dashed #666 !important;
          }

          /* Contracheque sem sombras nem margens extras */
          .paystub-slip {
            border: 1px solid #000;
            margin: 1mm;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
};

export default PrintBatchView;
