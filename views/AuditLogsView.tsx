import React, { useState, useEffect } from 'react';
import { History, Search, User, Tag, Calendar, Filter } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';

const AuditLogsView: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = api.getCurrentUser();
  const isSuper = currentUser?.perfil === 'SUPERADMIN';

  useEffect(() => {
    setLoading(true);
    api.getLogs().then(data => {
      if (Array.isArray(data)) setLogs(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Não foi possível carregar os logs. Verifique sua conexão.');
      setLoading(false);
    });
  }, [selectedCompanyId]);

  const filtered = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.detalhes || '').toLowerCase().includes(term) ||
      (l.usuario || '').toLowerCase().includes(term) ||
      (l.acao || '').toLowerCase().includes(term) ||
      (l.entidade || '').toLowerCase().includes(term) ||
      (l.empresa || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auditoria do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Histórico completo de ações e alterações realizadas.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar por usuário ou ação..."
            className="input-clean pl-10 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Filter size={16} />
          <span>Filtros Avançados</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-600">Ação</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Entidade</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Detalhes</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Usuário</th>
                {isSuper && <th className="px-6 py-4 font-semibold text-slate-600">Empresa</th>}
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                      <span>Carregando logs...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-500 font-medium">
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhum registro encontrado. Tente fazer login novamente para gerar logs.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${['CREATE', 'CRIACAO', 'ADMISSAO', 'ABERTURA'].includes(log.acao) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        ['DELETE', 'EXCLUSAO', 'DESLIGAMENTO'].includes(log.acao) ? 'bg-red-50 text-red-700 border-red-100' :
                          ['UPDATE', 'ALTERACAO', 'ATUALIZACAO', 'FECHAMENTO', 'LANCAMENTO'].includes(log.acao) ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            log.acao === 'LOGIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              log.acao === 'IMPORTACAO' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {log.entidade}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-md truncate" title={log.detalhes}>
                      {log.detalhes}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User size={14} className="text-slate-400" />
                        <span>{log.usuario}</span>
                      </div>
                    </td>
                    {isSuper && (
                      <td className="px-6 py-4 font-bold text-sky-600 uppercase text-[10px]">
                        {log.empresa || 'Global'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right text-slate-500 text-xs font-mono">
                      {log.data ? new Date(log.data).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsView;
