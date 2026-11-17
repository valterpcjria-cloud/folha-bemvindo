import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, User, CalendarDays, ChevronLeft, ChevronRight, DollarSign, Percent, Lock } from 'lucide-react';
import { Funcionario, StatusFuncionario } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_COMPANY_CODE, DEFAULT_LOCATION, DEFAULT_DEPARTMENT } from '../constants/payroll';
import ConfirmModal from '../components/ConfirmModal';
import { maskBRL, parseBRL, formatBRL } from '../utils/currency';

const EmployeesView: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [employees, setEmployees] = useState<Funcionario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Funcionario> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });

  // Estado para Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadEmployees();
  }, [selectedCompanyId]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await api.getFuncionarios();
      setEmployees(data);
    } catch (error: any) {
      console.error("Erro ao carregar funcionários:", error);
      alert("Erro ao carregar a lista de funcionários. Verifique a conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (emp?: Funcionario) => {
    setEditingEmployee(emp || {
      nome: '',
      id_contrato: undefined,
      cpf: '',
      cargo: '',
      status: StatusFuncionario.ATIVO,
      data_admissao: '',
      cbo: '',
      empresa_codigo: DEFAULT_COMPANY_CODE,
      local: DEFAULT_LOCATION,
      departamento: DEFAULT_DEPARTMENT,
      salario_base: undefined,
      insalubridade_perc: 20,
      assiduidade_perc: 11,
      adic_tempo_servico_perc: 0,
      mensalidade_sindical: 0,
      emprestimo_consignado: 0,
      gratificacao: 0
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    // Validação: salário base obrigatório e > 0
    const salario = Number(editingEmployee.salario_base || 0);
    if (!salario || salario <= 0) {
      alert('⚠️ O campo "Salário Base" é obrigatório e deve ser maior que zero.');
      return;
    }

    try {
      await api.saveFuncionario(editingEmployee);
      setShowModal(false);
      await loadEmployees();
    } catch (error: any) {
      console.error("Erro ao salvar funcionário:", error);
      alert(`⚠️ Falha ao salvar: ${error.message || "Erro desconhecido no servidor"}`);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id !== null) {
      await api.deleteFuncionario(deleteConfirm.id);
      loadEmployees();
    }
    setDeleteConfirm({ show: false, id: null });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não inf.';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filtered = employees.filter(e =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id_contrato.toString().includes(searchTerm)
  );

  // Paginação Lógica
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search & Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Novo Funcionário</span>
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">MAt.</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Funcionário</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Salário</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissão</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">Carregando dados...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : paginatedEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      #{emp.id_contrato}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sky-100 flex items-center justify-center rounded-full text-sky-700 text-xs font-bold">
                        {emp.nome[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 text-sm">{emp.nome}</span>
                        <span className="text-xs text-slate-400">{emp.cpf}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{emp.cargo || 'Não informado'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {emp.salario_base ? (
                      <span className="text-sm font-mono font-semibold text-emerald-700">R$ {formatBRL(emp.salario_base)}</span>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Não definido</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500 font-medium">{formatDate(emp.data_admissao)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.status === 'ATIVO'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(emp)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Componente de Paginação */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{startIndex + 1}</span> até <span className="font-semibold text-slate-700">{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span> de <span className="font-semibold text-slate-700">{filtered.length}</span> registros
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-blue-600 shadow-sm'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-slate-400 px-1">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingEmployee?.id ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form id="employee-form" onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Matrícula</label>
                  <input
                    required
                    type="number"
                    className="input-clean"
                    value={editingEmployee?.id_contrato || ''}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, id_contrato: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    className="input-clean"
                    value={editingEmployee?.status}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, status: e.target.value as StatusFuncionario }))}
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="DESLIGADO">Desligado</option>
                    <option value="AFASTADO">Afastado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="text"
                    className="input-clean pl-10"
                    placeholder="Ex: João da Silva"
                    value={editingEmployee?.nome}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, nome: e.target.value }))}
                  />
                </div>
              </div>

              {/* Salário Base — obrigatório, alimenta rubrica 33 em competências abertas */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  Salário Base <span className="text-red-500">*</span>
                  <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Alimenta rubrica 33 em competências abertas</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-600">R$</span>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    className="input-clean pl-16 font-mono text-right"
                    placeholder="0,00"
                    value={editingEmployee?.salario_base ? formatBRL(editingEmployee.salario_base) : ''}
                    onChange={(e) => {
                      const masked = maskBRL(e.target.value);
                      const numeric = parseBRL(masked);
                      setEditingEmployee(p => ({ ...p!, salario_base: numeric }));
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Exemplo: <span className="font-mono">2.263,25</span>. Para alterar o salário de um funcionário, edite este campo — a rubrica 33 é travada no grid de lançamentos.
                </p>
              </div>

              {/* Seção: Rúbricas do Cadastro — v4.52.20 */}
              <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/30">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={14} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Rúbricas do Cadastro</span>
                  <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Travadas na folha — alterar somente aqui</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Insalubridade 62 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Percent size={12} className="text-amber-500" />
                      Insalubridade <span className="text-[9px] text-slate-400">(62)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input-clean text-right pr-8 text-sm"
                        placeholder="20"
                        value={editingEmployee?.insalubridade_perc ?? 20}
                        onChange={(e) => setEditingEmployee(p => ({ ...p!, insalubridade_perc: Number(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Assiduidade 833 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Percent size={12} className="text-sky-500" />
                      Assiduidade <span className="text-[9px] text-slate-400">(833)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input-clean text-right pr-8 text-sm"
                        placeholder="11"
                        value={editingEmployee?.assiduidade_perc ?? 11}
                        onChange={(e) => setEditingEmployee(p => ({ ...p!, assiduidade_perc: Number(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Adicional Tempo de Serviço 1000 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Percent size={12} className="text-indigo-500" />
                      Adic. Tempo Serv. <span className="text-[9px] text-slate-400">(1000)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input-clean text-right pr-8 text-sm"
                        placeholder="0"
                        value={editingEmployee?.adic_tempo_servico_perc ?? 0}
                        onChange={(e) => setEditingEmployee(p => ({ ...p!, adic_tempo_servico_perc: Number(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mensalidade Sindical 936 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <DollarSign size={12} className="text-red-500" />
                      Mens. Sindical <span className="text-[9px] text-slate-400">(936)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input-clean pl-10 text-right font-mono text-sm"
                        placeholder="0,00"
                        value={editingEmployee?.mensalidade_sindical ? formatBRL(editingEmployee.mensalidade_sindical) : ''}
                        onChange={(e) => {
                          const masked = maskBRL(e.target.value);
                          const numeric = parseBRL(masked);
                          setEditingEmployee(p => ({ ...p!, mensalidade_sindical: numeric }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Empréstimo Consignado 4004 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <DollarSign size={12} className="text-orange-500" />
                      Empréstimo <span className="text-[9px] text-slate-400">(4004)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input-clean pl-10 text-right font-mono text-sm"
                        placeholder="0,00"
                        value={editingEmployee?.emprestimo_consignado ? formatBRL(editingEmployee.emprestimo_consignado) : ''}
                        onChange={(e) => {
                          const masked = maskBRL(e.target.value);
                          const numeric = parseBRL(masked);
                          setEditingEmployee(p => ({ ...p!, emprestimo_consignado: numeric }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Gratificação 88 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <DollarSign size={12} className="text-green-500" />
                      Gratificação <span className="text-[9px] text-slate-400">(88)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input-clean pl-10 text-right font-mono text-sm"
                        placeholder="0,00"
                        value={editingEmployee?.gratificacao ? formatBRL(editingEmployee.gratificacao) : ''}
                        onChange={(e) => {
                          const masked = maskBRL(e.target.value);
                          const numeric = parseBRL(masked);
                          setEditingEmployee(p => ({ ...p!, gratificacao: numeric }));
                        }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Estes valores serão refletidos automaticamente na folha de pagamento. As colunas ficarão travadas (somente leitura) no grid de lançamentos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">CPF</label>
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="000.000.000-00"
                    value={editingEmployee?.cpf}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, cpf: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cargo</label>
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="Ex: Analista"
                    value={editingEmployee?.cargo}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, cargo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Data de Admissão</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    className="input-clean pl-10"
                    value={editingEmployee?.data_admissao || ''}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, data_admissao: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">CBO</label>
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="784205"
                    value={editingEmployee?.cbo || ''}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, cbo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Empresa (Cod)</label>
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="165"
                    value={editingEmployee?.empresa_codigo || ''}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, empresa_codigo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Local</label>
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="1"
                    value={editingEmployee?.local || ''}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, local: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Depto</label>
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="999"
                    value={editingEmployee?.departamento || ''}
                    onChange={(e) => setEditingEmployee(p => ({ ...p!, departamento: e.target.value }))}
                  />
                </div>
              </div>

            </form>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="employee-form"
                className="btn-primary flex-1"
              >
                Salvar Dados
              </button>
            </div>
          </div>
        </div >
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Remover Funcionário"
        message="Tem certeza que deseja remover este funcionário? Esta ação não pode ser desfeita."
        confirmText="Remover"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />
    </div >
  );
};

export default EmployeesView;
