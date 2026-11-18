/**
 * PayrollGridView - Componente principal da folha de pagamento
 * Refatorado para usar componentes menores e hook customizado
 * 
 * Estrutura:
 * - usePayrollData: Hook com toda lógica de dados
 * - PayrollHeader: Cards de totais
 * - PayrollControls: Seletor e busca
 * - PayrollTableRow: Linhas individuais
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { Funcionario, Lancamento } from '../types';
import { CONFIG } from '../config';
import PaystubView from './PaystubView';
import DsrModal from './payroll/DsrModal';
import NotificationCenter, { Notification } from '../components/NotificationCenter';

// Componentes extraídos
import { usePayrollData } from '../hooks/usePayrollData';
import PayrollHeader from './payroll/PayrollHeader';
import PayrollControls from './payroll/PayrollControls';
import PayrollTableRow from './payroll/PayrollTableRow';
import PayrollPagination from './payroll/PayrollPagination';
import PayrollGroupedBody from './payroll/PayrollGroupedBody';
import { agruparPorSetor } from './payroll/agruparPorSetor';
import { api } from '../services/mockApi';

/**
 * Rubricas descontinuadas (v4.52.8): aparecem no grid SOMENTE se a competência
 * já tiver lançamento histórico para elas. Para competências novas (sem dados)
 * a coluna fica oculta. Outras telas (contracheque, exportação, relatórios)
 * continuam vendo os dados normalmente.
 */
const DEPRECATED_EVENT_CODES = new Set<number>([719, 883, 1080]);

// Bem Vindo (Fase A.2): preferência de visão (por setor / lista) guardada só neste navegador
const CHAVE_VISAO = 'bv_matriz_visao';
const lerVisaoPorSetor = (): boolean => {
  try { return localStorage.getItem(CHAVE_VISAO) !== 'lista'; } catch { return true; }
};

const PayrollGridView: React.FC = () => {
  // Hook customizado com toda lógica de dados
  const {
    competencias,
    selectedComp,
    funcionarios,
    eventos,
    lancamentos,
    isSaving,
    lastSaved,
    loadError,
    totalsByFunc,
    globalTotals,
    handleCompChange,
    updateLancamento,
    handleSave,
    getLancamentosForEmployee,
    atestados,
    toggleAtestado,
    temAlteracoesNaoSalvas,
  } = usePayrollData();

  const isCompAberta = selectedComp?.status === 'ABERTA';

  // Eventos visíveis no grid: oculta rubricas descontinuadas que não têm lançamento na competência atual.
  const visibleEventos = useMemo(() => {
    return eventos.filter(ev => {
      if (!DEPRECATED_EVENT_CODES.has(ev.codigo_evento)) return true;
      // Rubrica descontinuada: só mostra se algum funcionário tem lançamento com valor/quantidade nesta competência
      return Object.keys(lancamentos).some(k => {
        if (!k.endsWith(`_${ev.id}`)) return false;
        const l = lancamentos[k];
        return (Number(l?.quantidade) || 0) > 0 || (Number(l?.valor_total) || 0) > 0;
      });
    });
  }, [eventos, lancamentos]);

  // Estado local para UI
  const [viewingPaystub, setViewingPaystub] = useState<{ emp: Funcionario, lancs: Partial<Lancamento>[] } | null>(null);

  // v4.58.0: "Imprimir / PDF" da pré-visualização nunca teve ação ligada aqui.
  // Usa o mesmo PDF oficial (servidor/TCPDF) da tela Contracheques — gerado com os valores SALVOS.
  const handlePrintPaystub = async (funcionarioId: number) => {
    if (!selectedComp) return;
    if (temAlteracoesNaoSalvas) {
      alert('Há alterações não salvas na folha. Salve antes de imprimir — o PDF é gerado com os valores salvos.');
      return;
    }
    const compStr = `${selectedComp.mes.toString().padStart(2, '0')}/${selectedComp.ano}`;
    try {
      await api.downloadContrachequesPDF(compStr, [funcionarioId]);
    } catch (e: any) {
      alert('Erro ao gerar PDF: ' + (e?.message || 'falha desconhecida'));
    }
  };
  const [viewingDsr, setViewingDsr] = useState<Funcionario | null>(null);
  const [selectedEmps, setSelectedEmps] = useState<Set<number>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Bem Vindo (Fase A.2): matriz agrupada por setor (hierarquia + subtotais)
  const [agrupar, setAgrupar] = useState<boolean>(lerVisaoPorSetor);
  const [setorFiltro, setSetorFiltro] = useState('');
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const mudarVisao = (v: boolean) => {
    setAgrupar(v);
    try { localStorage.setItem(CHAVE_VISAO, v ? 'setor' : 'lista'); } catch { /* sem storage: só não lembra */ }
  };
  const toggleGrupo = (chave: string) => setRecolhidos(prev => {
    const n = new Set(prev);
    if (n.has(chave)) n.delete(chave); else n.add(chave);
    return n;
  });

  // Estado para Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Refs para scroll sincronizado
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(0);

  // Sync scrolling
  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;

    if (!top || !bottom) return;

    const handleTopScroll = () => {
      if (bottom.scrollLeft !== top.scrollLeft) {
        bottom.scrollLeft = top.scrollLeft;
      }
    };

    const handleBottomScroll = () => {
      if (top.scrollLeft !== bottom.scrollLeft) {
        top.scrollLeft = bottom.scrollLeft;
      }
    };

    top.addEventListener('scroll', handleTopScroll);
    bottom.addEventListener('scroll', handleBottomScroll);

    const resizeObserver = new ResizeObserver(() => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.offsetWidth);
      }
    });

    if (tableRef.current) resizeObserver.observe(tableRef.current);

    return () => {
      top.removeEventListener('scroll', handleTopScroll);
      bottom.removeEventListener('scroll', handleBottomScroll);
      resizeObserver.disconnect();
    };
  }, [funcionarios, eventos]);

  // Handlers de notificação
  const addNotification = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Handlers de seleção
  const toggleSelectAll = () => {
    if (selectedEmps.size === funcionarios.length) setSelectedEmps(new Set());
    else setSelectedEmps(new Set(funcionarios.map(f => f.id)));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedEmps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmps(next);
  };

  // Bulk apply
  const handleBulkApply = () => {
    if (selectedEmps.size === 0) {
      addNotification("Atenção", "Selecione funcionários para aplicar em lote.", "warning");
      return;
    }
    const valor = 100;
    selectedEmps.forEach(empId => {
      updateLancamento(empId, eventos[0].id, 'valor_total', valor.toString());
    });
    addNotification("Sucesso", `${selectedEmps.size} funcionários atualizados.`, "success");
    setSelectedEmps(new Set());
  };

  // Salvar com feedback
  const onSave = async () => {
    try {
      await handleSave();
      addNotification("Sucesso", "Dados salvos com sucesso.", "success");
    } catch (e: any) {
      addNotification("Erro", e.message || "Falha ao salvar dados.", "warning");
    }
  };

  // Ver contracheque
  const handleViewPaystub = (emp: Funcionario) => {
    const empLancs = getLancamentosForEmployee(emp.id);
    setViewingPaystub({ emp, lancs: empLancs });
  };

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filtro de busca
  const filteredFuncionarios = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id_contrato.toString().includes(searchTerm)
  );

  // Paginação Lógica
  const totalPages = Math.ceil(filteredFuncionarios.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFuncionarios = filteredFuncionarios.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Visão por setor: sem paginação (o setor inteiro fica junto com o subtotal)
  const todosGrupos = useMemo(() => agruparPorSetor(funcionarios), [funcionarios]);
  const opcoesSetor = todosGrupos.map(g => ({ chave: g.chave, nome: g.nome }));
  const gruposVisiveis = useMemo(() => {
    const filtrados = new Set(filteredFuncionarios.map(f => f.id));
    return todosGrupos
      .filter(g => !setorFiltro || g.chave === setorFiltro)
      .map(g => ({ ...g, funcionarios: g.funcionarios.filter(f => filtrados.has(f.id)) }))
      .filter(g => g.funcionarios.length > 0);
  }, [todosGrupos, filteredFuncionarios, setorFiltro]);

  const renderRow = (func: Funcionario) => (
    <PayrollTableRow
      key={func.id}
      funcionario={func}
      eventos={visibleEventos}
      lancamentos={lancamentos}
      totals={totalsByFunc[func.id] || { proventos: 0, descontos: 0 }}
      isSelected={selectedEmps.has(func.id)}
      onToggleSelect={toggleSelect}
      onUpdateLancamento={updateLancamento}
      onViewPaystub={handleViewPaystub}
      temAtestado={atestados.has(func.id)}
      onToggleAtestado={toggleAtestado}
      compAberta={isCompAberta}
    />
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />

      {/* Erro de carregamento */}
      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <span className="font-semibold">Erro ao carregar lançamentos:</span> {loadError}
        </div>
      )}

      {/* Header com Totais */}
      <PayrollHeader
        totals={globalTotals}
        isSaving={isSaving}
        isCompetenciaClosed={selectedComp?.status === 'FECHADA'}
        hasUnsavedChanges={temAlteracoesNaoSalvas}
        onSave={onSave}
      />

      {/* Controles */}
      <PayrollControls
        competencias={competencias}
        selectedCompId={selectedComp?.id}
        selectedCount={selectedEmps.size}
        searchTerm={searchTerm}
        onCompChange={handleCompChange}
        onBulkApply={handleBulkApply}
        onSearchChange={setSearchTerm}
        agrupar={agrupar}
        onAgruparChange={mudarVisao}
        setores={opcoesSetor}
        setorFiltro={setorFiltro}
        onSetorFiltroChange={setSetorFiltro}
      />

      {/* Top Sync Scrollbar */}
      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden h-4 bg-slate-50 border-t border-x border-slate-200 rounded-t-xl hidden md:block"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div style={{ width: tableWidth, height: '1px' }}></div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-b-xl md:rounded-t-none rounded-t-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div ref={bottomScrollRef} className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table ref={tableRef} className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center border-r border-slate-100 sticky left-0 z-40 bg-slate-50 w-12">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-sky-600">
                    {selectedEmps.size === funcionarios.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left border-r border-slate-100 sticky left-12 z-40 bg-slate-50 min-w-[300px]">
                  <span className="font-semibold text-slate-600 uppercase tracking-wider text-xs">Funcionário</span>
                </th>
                {visibleEventos.map(ev => (
                  <th key={ev.id} className="px-4 py-3 text-center border-r border-slate-100 min-w-[180px]">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-mono text-slate-400">{ev.codigo_evento}</span>
                      <span className={`font-semibold text-xs ${ev.tipo === 'DEBITO' ? 'text-red-500' : 'text-slate-700'}`}>
                        {ev.nome_evento}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center bg-slate-100 font-bold text-slate-700 sticky right-0 z-40 shadow-[-10px_0_20px_rgba(0,0,0,0.05)]">
                  Líquido
                </th>
              </tr>
            </thead>
            {agrupar ? (
              <PayrollGroupedBody
                grupos={gruposVisiveis}
                eventos={visibleEventos}
                lancamentos={lancamentos}
                totalsByFunc={totalsByFunc}
                recolhidos={recolhidos}
                onToggleGrupo={toggleGrupo}
                renderRow={renderRow}
                rotuloTotal={searchTerm || setorFiltro ? 'Total do que está na tela' : 'Total geral'}
              />
            ) : (
              <tbody className="divide-y divide-slate-100">
                {paginatedFuncionarios.map(renderRow)}
              </tbody>
            )}
          </table>
        </div>

        {/* Paginação só na visão em lista */}
        {!agrupar && (
          <PayrollPagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filteredFuncionarios.length}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sistema Online
          </span>
          <span>Versão {CONFIG.VERSION}</span>
        </div>
        <span>Última sincronização: {lastSaved ? lastSaved.toLocaleTimeString() : 'Pendente'}</span>
      </div>

      {/* Modal Contracheque */}
      {viewingPaystub && (
        <PaystubView
          employee={viewingPaystub.emp}
          events={eventos}
          lancamentos={viewingPaystub.lancs}
          onClose={() => setViewingPaystub(null)}
          onPrint={() => handlePrintPaystub(viewingPaystub.emp.id)}
          competenciaLabel={selectedComp ? `${selectedComp.mes.toString().padStart(2, '0')}/${selectedComp.ano}` : ''}
        />
      )}

      {/* Modal DSR */}
      {viewingDsr && selectedComp && (
        <DsrModal
          employee={viewingDsr}
          competencia={selectedComp}
          onClose={() => setViewingDsr(null)}
          onDescontoFalta={(dataFalta) => {
            // Callback opcional se quisermos repuxar
          }}
        />
      )}
    </div>
  );
};

export default PayrollGridView;
