import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Lock,
  Globe,
  Save,
  ShieldCheck,
  Server,
  Code,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { CONFIG } from '../config';
import { api } from '../services/mockApi';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'geral' | 'api' | 'seguranca'>('geral');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    RAZAO_SOCIAL: '',
    CNPJ: '',
    CODIGO_SERIAL_ERP: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await api.getSettings();
        if (res?.data) {
          setFormData({
            RAZAO_SOCIAL: res.data.RAZAO_SOCIAL?.valor || '',
            CNPJ: res.data.CNPJ?.valor || '',
            CODIGO_SERIAL_ERP: res.data.CODIGO_SERIAL_ERP?.valor || ''
          });
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await Promise.all([
        api.saveSetting('RAZAO_SOCIAL', formData.RAZAO_SOCIAL, 'Razão Social da Empresa', 'TEXTO'),
        api.saveSetting('CNPJ', formData.CNPJ, 'CNPJ da Empresa', 'TEXTO'),
        api.saveSetting('CODIGO_SERIAL_ERP', formData.CODIGO_SERIAL_ERP, 'Código para exportação contábil', 'TEXTO')
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie parâmetros globais e integrações.</p>
        </div>
        {success && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 animate-in zoom-in duration-300">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Dados salvos com sucesso!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <nav className="flex flex-col p-2 space-y-1">
              <button
                onClick={() => setActiveTab('geral')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'geral' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Globe size={18} />
                <span>Geral</span>
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'api' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Code size={18} />
                <span>API & Integrações</span>
              </button>
              <button
                onClick={() => setActiveTab('seguranca')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'seguranca' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <ShieldCheck size={18} />
                <span>Segurança</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'geral' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                  <Loader2 className="animate-spin text-sky-600" size={32} />
                </div>
              )}

              <h2 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100">Informações da Empresa</h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Razão Social</label>
                    <input
                      type="text"
                      className="input-clean"
                      value={formData.RAZAO_SOCIAL}
                      onChange={(e) => setFormData({ ...formData, RAZAO_SOCIAL: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">CNPJ</label>
                    <input
                      type="text"
                      className="input-clean"
                      value={formData.CNPJ}
                      onChange={(e) => setFormData({ ...formData, CNPJ: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Código Serial ERP (Folha)</label>
                  <input
                    type="text"
                    className="input-clean w-full md:w-1/3"
                    value={formData.CODIGO_SERIAL_ERP}
                    onChange={(e) => setFormData({ ...formData, CODIGO_SERIAL_ERP: e.target.value })}
                  />
                  <p className="text-xs text-slate-400">Utilizado para identificação na importação contábil.</p>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="btn-primary flex items-center gap-2 min-w-[160px] justify-center"
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100">Status da API</h2>

              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-600 break-all">
                  {CONFIG.API_BASE_URL}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-emerald-100 bg-emerald-50 rounded-lg">
                    <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Status do Serviço</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <Server size={18} />
                      <span>Operacional (99.9%)</span>
                    </div>
                  </div>
                  <div className="p-4 border border-slate-200 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Latência Média</p>
                    <p className="text-xl font-bold text-slate-800">45ms</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100">Políticas de Segurança</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">Autenticação em Dois Fatores (2FA)</p>
                    <p className="text-sm text-slate-500">Obrigatório para administradores.</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200">
                    <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">Log de Auditoria Completo</p>
                    <p className="text-sm text-slate-500">Registrar IP e Geo-localização de acessos.</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-500">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
