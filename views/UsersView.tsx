import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Mail, Trash2, Edit2, X, Check, User } from 'lucide-react';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import SenhaTemporariaModal from '../components/SenhaTemporariaModal';

const UsersView: React.FC = () => {
  const { selectedCompanyId } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: 0, nome: '', email: '', perfil: 'RH', ativo: 1, senha: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; user: any | null }>({ show: false, user: null });
  // v4.57.0: senha temporária gerada pelo servidor — exibida uma única vez
  const [senhaTemporaria, setSenhaTemporaria] = useState<{ email: string; senha: string } | null>(null);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
      const user = api.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedCompanyId]);

  const handleEdit = (user: any) => {
    setFormData(user);
    setShowModal(true);
  };

  const handleDelete = (user: any) => {
    setDeleteConfirm({ show: true, user });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.user) return;
    try {
      await api.deleteUser(deleteConfirm.user.id);
      loadUsers();
    } catch (error) {
      alert("Erro ao excluir usuário");
    }
    setDeleteConfirm({ show: false, user: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.saveUser(formData);
      setShowModal(false);
      if (res?.senha_temporaria) {
        setSenhaTemporaria({ email: formData.email, senha: res.senha_temporaria });
      }
      loadUsers();
    } catch (error: any) {
      alert(`Erro ao salvar usuário: ${error?.message || 'falha desconhecida'}`);
    }
  };

  const openNewUserModal = () => {
    setFormData({ id: 0, nome: '', email: '', perfil: 'RH', ativo: 1, senha: '' });
    setShowModal(true);
  };

  const canManage = (targetUser: any) => {
    if (!currentUser) return false;

    // SuperAdmin pode gerenciar tudo
    if (currentUser.perfil === 'SUPERADMIN') return true;

    // Outros usuários não podem gerenciar SuperAdmin
    if (targetUser.perfil === 'SUPERADMIN') return false;

    // Admin pode gerenciar outros usuários
    return currentUser.perfil === 'ADMIN';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">Controle de acesso e permissões do sistema.</p>
        </div>
        <button
          onClick={openNewUserModal}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={18} />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(users) && users
          .filter(u => currentUser?.perfil === 'SUPERADMIN' || u.perfil !== 'SUPERADMIN')
          .map(u => (
            <div key={u.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {u.nome && typeof u.nome === 'string' ? u.nome[0].toUpperCase() : '?'}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${u.perfil === 'SUPERADMIN'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                  : u.perfil === 'ADMIN'
                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                    : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                  {u.perfil}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="font-bold text-slate-800 text-lg">{u.nome}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Mail size={14} />
                  {u.email}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                  <Check size={12} /> Ativo
                </div>
                {canManage(u) ? (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(u)}
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Shield size={10} /> Protegido
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">
                {formData.id ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      className="input-clean pl-10"
                      placeholder="Ex: João Silva"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">E-mail Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      className="input-clean pl-10"
                      placeholder="usuario@empresa.com.br"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nível de Acesso</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      className="input-clean pl-10"
                      value={formData.perfil}
                      onChange={e => setFormData({ ...formData, perfil: e.target.value })}
                      disabled={formData.perfil === 'SUPERADMIN' && currentUser?.perfil !== 'SUPERADMIN'}
                    >
                      <option value="RH">Recursos Humanos (Padrão)</option>
                      <option value="ADMIN">Administrador do Sistema</option>
                      {currentUser?.perfil === 'SUPERADMIN' && (
                        <option value="SUPERADMIN">Super Admin Master</option>
                      )}
                      <option value="LEITURA">Somente Leitura</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Senha de Acesso</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      className="input-clean pl-10"
                      placeholder="Nova senha (opcional)"
                      value={formData.senha || ''}
                      onChange={e => setFormData({ ...formData, senha: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {formData.id
                      ? 'Deixe em branco para manter a senha atual. Se preencher, o usuário terá que trocá-la no próximo acesso.'
                      : 'Deixe em branco para gerar uma senha temporária segura. O usuário troca no primeiro acesso.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {senhaTemporaria && (
        <SenhaTemporariaModal
          email={senhaTemporaria.email}
          senha={senhaTemporaria.senha}
          onClose={() => setSenhaTemporaria(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário ${deleteConfirm.user?.nome}?`}
        confirmText="Excluir"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, user: null })}
      />
    </div>
  );
};

export default UsersView;
