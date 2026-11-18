
import { Funcionario, EventoFolha, Competencia, Lancamento, StatusFuncionario, StatusCompetencia, AuditLog, Unidade, DsrCalculado, User, Setor, Cargo } from '../types';
import { MANDATORY_EVENTS } from '../constants';
import { CONFIG } from '../config';
import { findValue } from '../utils/dataHelpers';


const STORAGE_KEYS = {
  USER: 'fq_user',
  FUNCIONARIOS: 'fq_funcionarios',
  LANCAMENTOS: 'fq_lancamentos'
};

const getStorage = <T,>(key: string, defaultValue: T): T => {
  const data = sessionStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setStorage = <T,>(key: string, data: T): void => {
  sessionStorage.setItem(key, JSON.stringify(data));
};

// Variável para armazenar o contexto de empresa do SuperAdmin
let companyContextId: number | null = getStorage('fq_company_context', null);

/**
 * v4.58.0 (A3): a sessão viaja no cookie HttpOnly (o JS não tem acesso ao token).
 * Use em todo fetch direto à API, junto com `credentials: 'include'`.
 * - X-Requested-With: exigido pelo backend em POST/PUT/DELETE via cookie (proteção CSRF)
 * - Authorization: só para sessões abertas antes da v4.58.0 (transição; some no próximo login)
 */
export const authHeaders = (): Record<string, string> => {
  const legacyToken = getStorage<any>(STORAGE_KEYS.USER, null)?.token;
  return {
    'X-Requested-With': 'XMLHttpRequest',
    ...(legacyToken ? { 'Authorization': `Bearer ${legacyToken}` } : {}),
    ...(companyContextId ? { 'X-Company-Context': companyContextId.toString() } : {}),
  };
};

/** Guarda o usuário da sessão SEM o token (o token fica só no cookie HttpOnly). */
const salvarUsuarioSessao = (user: any) => {
  if (!user) return user;
  const { token: _token, ...semToken } = user;
  setStorage(STORAGE_KEYS.USER, semToken);
  return semToken;
};

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  if (CONFIG.IS_MOCK) return { data: [], status: 'mock' };

  const url = `${CONFIG.API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders(),
        ...options.headers,
      },
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Resposta inválida do servidor: ${text}`);
    }

    // v4.58.0: sessão expirada/encerrada (cookie vencido ou revogado) → volta ao login
    const rotaDeSessao = endpoint.startsWith('/login') || endpoint.startsWith('/logout');
    if (response.status === 401 && !rotaDeSessao && sessionStorage.getItem(STORAGE_KEYS.USER)) {
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      window.location.assign('/login');
    }

    if (!response.ok || data.error) {
      // Prioritize message as it contains the detailed Glass Engine debug info
      throw new Error(data.message || data.error || `Erro ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error("Erro na API:", error);
    throw error;
  }
};

export const api = {
  getCompanyContext: () => companyContextId,
  setCompanyContext: (id: number | null) => {
    companyContextId = id;
    setStorage('fq_company_context', id);
  },

  getServerStatus: async () => {
    if (CONFIG.IS_MOCK) return { connected: true, ip: 'MODO DEMO', db: 'LocalStorage' };
    return fetchApi('/status');
  },

  getStats: async () => {
    if (CONFIG.IS_MOCK) return {
      total_funcionarios: getStorage(STORAGE_KEYS.FUNCIONARIOS, []).length || 12,
      custo_total: 45800.50,
      competencia: '06/2024',
      total_lancamentos: getStorage(STORAGE_KEYS.LANCAMENTOS, []).length || 84,
      status_competencia: 'ABERTA',
      maior_centro_custo: 'Produção',
      evolucao_custo: [
        { name: '01/24', total: 42000 },
        { name: '02/24', total: 45800.50 }
      ],
      investimento_por_setor: [
        { name: 'Produção', valor: 25000 },
        { name: 'Administrativo', valor: 12000 },
        { name: 'Comercial', valor: 8800.50 }
      ],
      distribuicao_folha: [
        { name: 'Salário Base', value: 38000 },
        { name: 'Horas Extras', value: 4500.50 },
        { name: 'Prêmios', value: 3300 }
      ]
    };
    return fetchApi('/stats');
  },

  login: async (email: string, senha: string): Promise<any> => {
    if (CONFIG.IS_MOCK) {
      if (email === 'admin@empresa.com.br' && senha === 'admin123') {
        const user = { id: 1, id_empresa: 1, nome: 'Administrador', email: 'admin@empresa.com.br', perfil: 'ADMIN', token: 'mock-jwt-admin' };
        setStorage(STORAGE_KEYS.USER, user);
        return user;
      }
      if (email === 'saas@master.com' && senha === 'saas123') {
        const user = { id: 0, id_empresa: 0, nome: 'Super Admin', email: 'saas@master.com', perfil: 'SUPERADMIN', token: 'mock-jwt-super' };
        setStorage(STORAGE_KEYS.USER, user);
        return user;
      }
      throw new Error('Credenciais inválidas');
    }
    const user = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
    return salvarUsuarioSessao(user);
  },

  getCurrentUser: () => getStorage(STORAGE_KEYS.USER, null),

  getCompanies: async () => {
    if (CONFIG.IS_MOCK) return {
      data: [
        { id: 1, razao_social: 'Supermercado Bem Vindo', cnpj: '41.403.240/0001-14', slug: 'bemvindo', ativa: true, data_cadastro: '2024-01-01', total_funcionarios: 12 },
        { id: 2, razao_social: 'Supermercado Modelo', cnpj: '22.333.444/0001-55', slug: 'modelo', ativa: true, data_cadastro: '2024-02-10', total_funcionarios: 45 },
        { id: 3, razao_social: 'Transportadora Veloz', cnpj: '33.444.555/0001-66', slug: 'veloz', ativa: false, data_cadastro: '2024-02-12', total_funcionarios: 0 }
      ]
    };
    return fetchApi('/companies');
  },

  // Bem Vindo: razão social, CNPJ e cidade da empresa logada (cabeçalho do contracheque)
  getEmpresaAtual: async (): Promise<{ razao_social: string; cnpj: string; nome_cidade?: string | null; uf?: string | null }> => {
    if (CONFIG.IS_MOCK) return { razao_social: 'Supermercado Bem Vindo', cnpj: '41.403.240/0001-14', nome_cidade: 'Luziânia', uf: 'GO' };
    const res = await fetchApi('/empresa_atual');
    return res.data;
  },

  logout: () => {
    // v4.57.0 (A2): revoga o token no servidor (v4.58.0: + apaga o cookie). fetchApi monta os
    // cabeçalhos de forma síncrona antes do primeiro await, então a sessão local pode ser limpa logo em seguida.
    if (!CONFIG.IS_MOCK && getStorage<any>(STORAGE_KEYS.USER, null)) {
      fetchApi('/logout', { method: 'POST' }).catch(() => { /* token já expirado/revogado */ });
    }
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  },

  /** v4.57.0 (C5): troca a própria senha; servidor devolve sessão nova (token novo). */
  changePassword: async (senhaAtual: string, novaSenha: string): Promise<User> => {
    if (CONFIG.IS_MOCK) {
      const current = getStorage<any>(STORAGE_KEYS.USER, null);
      const updated = { ...current, must_change_password: false };
      setStorage(STORAGE_KEYS.USER, updated);
      return updated;
    }
    const user = await fetchApi('/change_password', {
      method: 'POST',
      body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
    });
    return salvarUsuarioSessao(user);
  },

  getLogs: async (): Promise<AuditLog[]> => {
    if (CONFIG.IS_MOCK) return [
      { id: 1, usuario: 'Sistema', acao: 'LOGIN', entidade: 'USUARIO', detalhes: 'Acesso via modo demonstração', data: new Date().toISOString() }
    ];
    const res = await fetchApi('/logs');
    return res || [];
  },

  getUsers: async (): Promise<any[]> => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<any[]>(STORAGE_KEYS.USER + '_list', []);
      if (items.length === 0) {
        const defaults = [
          { id: 1, nome: 'Administrador', email: 'admin@empresa.com.br', perfil: 'ADMIN', ativo: 1 },
          { id: 2, nome: 'Analista RH', email: 'rh@empresa.com.br', perfil: 'RH', ativo: 1 },
        ];
        setStorage(STORAGE_KEYS.USER + '_list', defaults);
        return defaults;
      }
      return items;
    }
    const res = await fetchApi('/users');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  saveUser: async (data: any) => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<any[]>(STORAGE_KEYS.USER + '_list', []);
      const newItem = { ...data, id: data.id || Date.now() };
      const exists = items.findIndex(u => u.id === newItem.id);
      if (exists >= 0) items[exists] = newItem;
      else items.push(newItem);
      setStorage(STORAGE_KEYS.USER + '_list', items);
      return newItem;
    }
    return fetchApi('/users', { method: 'POST', body: JSON.stringify(data) });
  },

  deleteUser: async (id: number) => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<any[]>(STORAGE_KEYS.USER + '_list', []);
      const filtered = items.filter(u => u.id !== id);
      setStorage(STORAGE_KEYS.USER + '_list', filtered);
      return true;
    }
    return fetchApi(`/users?id=${id}`, { method: 'DELETE' });
  },

  // --- Atestados (perda de Assiduidade por competência) ---
  getAtestados: async (competenciaId: number): Promise<number[]> => {
    if (CONFIG.IS_MOCK) return [];
    const res = await fetchApi(`/atestados?competencia_id=${competenciaId}`);
    return (res?.data as number[]) ?? [];
  },
  setAtestado: (funcionarioId: number, competenciaId: number, temAtestado: boolean) =>
    fetchApi('/atestados', {
      method: 'POST',
      body: JSON.stringify({ funcionario_id: funcionarioId, competencia_id: competenciaId, tem_atestado: temAtestado })
    }),

  // --- Setores e cargos (Bem Vindo, Fase A.1) ---
  getSetores: async (): Promise<Setor[]> => {
    if (CONFIG.IS_MOCK) return [];
    const res = await fetchApi('/setores');
    return (res?.data as Setor[]) ?? [];
  },
  criarSetor: (nome: string) => fetchApi('/setores', { method: 'POST', body: JSON.stringify({ nome }) }),
  atualizarSetor: (id: number, data: { nome?: string; ativo?: boolean }) =>
    fetchApi(`/setores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reordenarSetores: (ids: number[]) => fetchApi('/setores/reordenar', { method: 'POST', body: JSON.stringify({ ids }) }),

  getCargos: async (): Promise<Cargo[]> => {
    if (CONFIG.IS_MOCK) return [];
    const res = await fetchApi('/cargos');
    return (res?.data as Cargo[]) ?? [];
  },
  criarCargo: (data: { nome: string; id_setor: number | null; cbo?: string; piso_salarial?: number | null }) =>
    fetchApi('/cargos', { method: 'POST', body: JSON.stringify(data) }),
  atualizarCargo: (id: number, data: Partial<Pick<Cargo, 'nome' | 'cbo' | 'piso_salarial' | 'id_setor'>> & { ativo?: boolean }) =>
    fetchApi(`/cargos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reordenarCargos: (ids: number[]) => fetchApi('/cargos/reordenar', { method: 'POST', body: JSON.stringify({ ids }) }),
  excluirCargo: (id: number) => fetchApi(`/cargos/${id}`, { method: 'DELETE' }),

  // --- Feriados ---
  getHolidays: () => fetchApi('/feriados'),
  saveHoliday: (data: any) => {
    const isUpdate = !!data.id;
    return fetchApi(`/feriados${isUpdate ? '/' + data.id : ''}`, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(data)
    });
  },
  deleteHoliday: (id: number | string) => fetchApi(`/feriados/${id}`, { method: 'DELETE' }),

  getFuncionarios: async (): Promise<Funcionario[]> => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      if (items.length === 0) {
        const defaults = [
          { id: 1, id_contrato: 101, nome: 'João da Silva (Demo)', status: StatusFuncionario.ATIVO, cargo: 'Analista' },
          { id: 2, id_contrato: 102, nome: 'Maria Oliveira (Demo)', status: StatusFuncionario.ATIVO, cargo: 'Gerente' }
        ];
        setStorage(STORAGE_KEYS.FUNCIONARIOS, defaults);
        return defaults;
      }
      return items;
    }
    const res = await fetchApi('/funcionarios');
    const data = res.data || [];
    return data.map((f: any) => ({
      ...f,
      id: Number(f.id),
      id_contrato: Number(f.id_contrato)
    }));
  },

  saveFuncionario: async (data: Partial<Funcionario>) => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      const newItem = { ...data, id: data.id || Date.now() } as Funcionario;
      const exists = items.findIndex(f => f.id === newItem.id);
      if (exists >= 0) items[exists] = newItem;
      else items.push(newItem);
      setStorage(STORAGE_KEYS.FUNCIONARIOS, items);
      return newItem;
    }
    return fetchApi('/funcionarios', { method: 'POST', body: JSON.stringify(data) });
  },

  importFuncionarios: async (data: any[]) => {
    const mapped = data.map(d => {
      const matricula = findValue(d, ['Contrato', 'Matricula', 'Matrícula', 'Matrcula', 'ID', 'IdContrato', 'Codigo', 'Matr']);
      const nome = findValue(d, ['Nome', 'Funcionario', 'nome', 'Colaborador', 'Empregado']);
      const cpf = findValue(d, ['CPF', 'cpf', 'Documento']);
      const cargo = findValue(d, ['Cargo', 'Funcao', 'cargo', 'Ocupacao']);
      const status = findValue(d, ['Status', 'situacao', 'status']);
      const dataAdmissao = findValue(d, ['Admissao', 'data_admissao', 'data adm', 'Dta Adm']);
      const cbo = findValue(d, ['CBO', 'cbo']);
      const depart = findValue(d, ['Departamento', 'Setor', 'Depto']);

      // Helper p/ converter DD/MM/YYYY -> YYYY-MM-DD
      const normalizeDate = (val: any) => {
        if (!val) return null;
        const s = String(val).trim();
        if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = s.split('/');
          return `${y}-${m}-${d}`;
        }
        return s;
      };

      return {
        id_contrato: String(matricula || '').replace(/\D/g, ''),
        nome: String(nome || '').trim().substring(0, 255),
        cpf: cpf ? String(cpf).replace(/\D/g, '').substring(0, 11) : null,
        status: status ? (String(status).toUpperCase().includes('DESL') ? 'DESLIGADO' : 'ATIVO') : 'ATIVO',
        cargo: cargo ? String(cargo).trim() : 'Não Informado',
        data_admissao: normalizeDate(dataAdmissao),
        cbo: cbo ? String(cbo).replace(/\D/g, '') : null,
        departamento: depart ? String(depart).trim() : null
      };
    }).filter(m => m.id_contrato.length > 0 && m.nome.length > 0);

    if (mapped.length === 0) {
      throw new Error("Nenhum dado válido encontrado. Verifique se as colunas 'Matrícula' e 'Nome' estão presentes.");
    }

    if (CONFIG.IS_MOCK) {
      const items = getStorage<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      const withIds = mapped.map(m => ({ ...m, id: Date.now() + Math.random() }));
      const combined = [...items, ...withIds];
      setStorage(STORAGE_KEYS.FUNCIONARIOS, combined);
      return { success: true, count: mapped.length };
    }

    // Atomic Chunked Import for Employees (v4.34.3 Resilience)
    const CHUNK_SIZE = 8;
    let successCount = 0;
    let errors: any[] = [];

    for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
      const chunk = mapped.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetchApi('/funcionarios/import', {
          method: 'POST',
          body: JSON.stringify(chunk)
        });
        if (Array.isArray(res)) {
          res.forEach(r => {
            if (r.status === 'success') successCount++;
            else errors.push(r);
          });
        } else if (res && (res.success || res.status === 'success')) {
          successCount += res.count || chunk.length;
        } else if (res && (res.error || res.status === 'error')) {
          errors.push(res);
        }
      } catch (e: any) {
        errors.push({ error: e.message || "Timeout/Erro Servidor", chunk_index: i, data: chunk[0] });
      }
    }

    return { success: true, count: successCount, errors };
  },

  bulkInsertFuncionarios: async (count: number) => {
    if (CONFIG.IS_MOCK) return { success: true };
    return fetchApi('/stress/bulk-funcionarios', {
      method: 'POST',
      body: JSON.stringify({ count })
    });
  },

  deleteFuncionario: async (id: number) => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      const filtered = items.filter(f => f.id !== id);
      setStorage(STORAGE_KEYS.FUNCIONARIOS, filtered);
      return true;
    }
    return fetchApi(`/funcionarios?id=${id}`, { method: 'DELETE' });
  },

  getEventos: async (): Promise<EventoFolha[]> => {
    if (CONFIG.IS_MOCK) return MANDATORY_EVENTS;
    try {
      const res = await fetchApi('/eventos');
      const apiEvents = (res.data || []).map((e: any) => ({
        ...e,
        id: Number(e.id),
        codigo_evento: Number(e.codigo_evento),
        ordem_exportacao: Number(e.ordem_exportacao || 0),
        // Converter campos de incidência para boolean (banco retorna 0/1 ou "0"/"1")
        incide_inss: e.incide_inss === 1 || e.incide_inss === '1' || e.incide_inss === true,
        incide_fgts: e.incide_fgts === 1 || e.incide_fgts === '1' || e.incide_fgts === true,
        incide_irrf: e.incide_irrf === 1 || e.incide_irrf === '1' || e.incide_irrf === true
      }));

      // Senior Force: Garantir que Assiduidade (833) e Insalubridade (62) existam e sejam PERCENTUAL
      const result = [...apiEvents];
      [62, 833].forEach(code => {
        const apiIdx = result.findIndex(ev => ev.codigo_evento === code);
        const local = MANDATORY_EVENTS.find(m => m.codigo_evento === code);

        if (apiIdx !== -1) {
          result[apiIdx] = {
            ...result[apiIdx],
            unidade: Unidade.PERCENTUAL,
            ordem_exportacao: local?.ordem_exportacao ?? result[apiIdx].ordem_exportacao
          };
        } else if (local) {
          result.push(local);
        }
      });

      // Rubrica 59 (DSR s/ HE Diurnas): garantir posição IMEDIATAMENTE após o evento 49
      // Independe de migration rodada ou não — funciona sempre.
      const ev49 = result.find(ev => ev.codigo_evento === 49);
      const ordem59 = ev49 ? (ev49.ordem_exportacao ?? 5) + 0.5 : 5.5;
      const local59 = MANDATORY_EVENTS.find(m => m.codigo_evento === 59);
      // Remove qualquer entrada 59 que viesse do banco (evita duplicata)
      const semDsr59 = result.filter(ev => ev.codigo_evento !== 59);
      // Adiciona com a ordem calculada dinamicamente
      semDsr59.push({
        ...(local59 ?? { id: 59, codigo_evento: 59, nome_evento: 'DSR s/ Horas Extras Diurnas', tipo: 'CREDITO' as any, natureza: 'PROVENTO' as any, unidade: Unidade.VALOR, obrigatorio: true }),
        ordem_exportacao: ordem59,
      });

      // Garantir ordenação final (Proventos primeiro, depois exportação)
      return semDsr59.sort((a, b) => {
        if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
        return (a.ordem_exportacao || 0) - (b.ordem_exportacao || 0) || (a.codigo_evento - b.codigo_evento);
      });
    } catch (e) {
      console.warn("Falha ao buscar eventos, usando padrão:", e);
      return MANDATORY_EVENTS;
    }
  },

  saveEvento: async (data: Partial<EventoFolha>) => {
    if (CONFIG.IS_MOCK) return data;
    return fetchApi('/eventos', { method: 'POST', body: JSON.stringify(data) });
  },

  updateEvento: async (data: EventoFolha) => {
    if (CONFIG.IS_MOCK) return data;
    return fetchApi(`/eventos?id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  getCompetencias: async (): Promise<Competencia[]> => {
    if (CONFIG.IS_MOCK) return [
      { id: 1, mes: 6, ano: 2024, status: StatusCompetencia.ABERTA }
    ];
    const res = await fetchApi('/competencias');
    const data = res.data || [];
    return data.map((c: any) => ({
      ...c,
      id: Number(c.id),
      mes: Number(c.mes),
      ano: Number(c.ano)
    }));
  },

  addCompetencia: async (mes: number, ano: number) => {
    if (CONFIG.IS_MOCK) return { id: Date.now(), mes, ano, status: 'ABERTA' };
    return fetchApi('/competencias', { method: 'POST', body: JSON.stringify({ mes, ano }) });
  },

  closeCompetencia: async (id: number) => {
    if (CONFIG.IS_MOCK) return true;
    return fetchApi(`/competencias/${id}/close`, { method: 'POST' });
  },

  deleteCompetencia: async (id: number, justificativa: string) => {
    if (CONFIG.IS_MOCK) return true;
    return fetchApi(`/competencias/${id}`, { 
      method: 'DELETE',
      body: JSON.stringify({ justificativa })
    });
  },

  reopenCompetencia: async (id: number, justificativa: string) => {
    if (CONFIG.IS_MOCK) return true;
    return fetchApi(`/competencias/${id}/reopen`, { 
      method: 'POST',
      body: JSON.stringify({ justificativa })
    });
  },

  getLancamentos: async (competencia_id: number): Promise<Lancamento[]> => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, []);
      return items.filter(l => l.competencia_id === competencia_id);
    }
    const res = await fetchApi(`/lancamentos?competencia_id=${competencia_id}`);
    const data = Array.isArray(res) ? res : [];
    return data.map((l: any) => ({
      ...l,
      id: Number(l.id),
      funcionario_id: Number(l.funcionario_id),
      competencia_id: Number(l.competencia_id),
      evento_id: Number(l.evento_id),
      quantidade: Number(l.quantidade || 0),
      valor_unitario: Number(l.valor_unitario || 0),
      valor_total: Number(l.valor_total || 0)
    }));
  },

  saveLancamento: async (data: Omit<Lancamento, 'id'>) => {
    if (CONFIG.IS_MOCK) {
      const items = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, []);
      const newItem = { ...data, id: Date.now() + Math.random() } as Lancamento;
      items.push(newItem);
      setStorage(STORAGE_KEYS.LANCAMENTOS, items);
      return true;
    }
    return fetchApi('/lancamentos', { method: 'POST', body: JSON.stringify(data) });
  },

  bulkSaveLancamentos: async (items: any[]) => {
    if (CONFIG.IS_MOCK) return { success: true };
    return fetchApi('/lancamentos/import', { method: 'POST', body: JSON.stringify(items) });
  },

  getExpressClosing: async (id_competencia: number) => {
    return fetchApi(`/fechamento_expresso?id_competencia=${id_competencia}`);
  },

  syncExpressClosing: async (id_competencia: number) => {
    return fetchApi('/fechamento_expresso', { method: 'POST', body: JSON.stringify({ action: 'SYNC', id_competencia }) });
  },

  processExpressClosing: async (id_competencia: number, id_snapshot: number) => {
    return fetchApi('/fechamento_expresso', { method: 'POST', body: JSON.stringify({ action: 'PROCESS_BATCH', id_snapshot, id_competencia }) });
  },

  importLancamentos: async (data: any[], events?: EventoFolha[]) => {
    // Se não passarem a lista de eventos, tenta usar a padrão (fallback)
    const activeEvents = events && events.length > 0 ? events : MANDATORY_EVENTS;

    // Helper to find an event by name OR code (robustly)
    // Helper to find an event by name OR code (robustly)
    const findEventMatch = (columnLabel: string) => {
      const clean = (s: string) => String(s || "").toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "") // Remove symbols
        .trim();

      const query = clean(columnLabel);
      if (!query) return null;

      return activeEvents.find(e => {
        const name = clean(e.nome_evento);
        const code = String(e.codigo_evento);
        const id = String(e.id);

        // 1. Match by code exactly if it's numeric (PRIORITY)
        if (query === code || query === id) return true;

        // 2. Match name if it contains or is contained by query (long enough)
        if (name.length > 2 && (name.includes(query) || query.includes(name))) return true;

        // 3. Support partial matches for codes in merged headers (e.g., "833 Premio")
        // Improved: ensure it matches contextually (start/end or with space) to avoid substring collision (e.g. 33 vs 833)
        if (code.length >= 2) {
          const regex = new RegExp(`(^|\\D)${code}(\\D|$)`, 'i');
          if (regex.test(columnLabel)) return true;
        }

        return false;
      });
    };

    const finalLancamentos: any[] = [];

    data.forEach(d => {
      const funcId = findValue(d, ['Contrato do Empregado', 'Contrato', 'Matricula', 'id_contrato', 'ID']);
      if (!funcId) return;

      const funcionario_id = Number(funcId);

      // Look for multiple event columns (Horizontal Format)
      Object.keys(d).forEach(key => {
        const event = findEventMatch(key);
        if (event) {
          const rawValue = d[key];
          if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
            let valorTotal = Number(String(rawValue).replace(',', '.'));

            // Improved indicator detection: V, X, H, R, S, SIM, or if value matches event name
            const normalizedTag = String(rawValue).trim().toUpperCase();
            const clean = (s: string) => s.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
            const cleanValue = clean(String(rawValue));
            const cleanEventName = clean(event.nome_evento);

            if (isNaN(valorTotal) && typeof rawValue === 'string' && rawValue.trim() !== '') {
              if (['V', 'X', 'H', 'R', 'S', 'SIM'].includes(normalizedTag) ||
                (cleanEventName.length > 3 && (cleanValue.includes(cleanEventName) || cleanEventName.includes(cleanValue)))) {
                valorTotal = 1;
              }
            }

            if (valorTotal !== 0 && !isNaN(valorTotal)) {
              finalLancamentos.push({
                funcionario_id,
                competencia_id: 1, // Will be overridden in backend by the active competence
                evento_id: event.id,
                codigo_evento: event.codigo_evento,
                quantidade: ['HORA', 'DIA', 'UNIDADE'].includes(event.unidade) ? valorTotal : 0,
                valor_unitario: 0,
                valor_total: event.unidade === 'VALOR' ? valorTotal : 0,
                origem: 'IMPORTADO'
              });
            }
          }
        }
      });

      // Support for Vertical Format (Legacy/Standard)
      const eventId = findValue(d, ['EventoID', 'Evento', 'evento_id', 'CodigoEvento']);
      if (eventId && !finalLancamentos.some(l => l.funcionario_id === funcionario_id)) {
        const total = findValue(d, ['ValorTotal', 'Total', 'Valor', 'valor_total']);
        const qtd = findValue(d, ['Quantidade', 'Qtd', 'quantidade', 'Horas']);

        // Find real event ID if it's a code
        const matchedEvent = findEventMatch(String(eventId));

        finalLancamentos.push({
          funcionario_id,
          competencia_id: 1,
          evento_id: matchedEvent ? matchedEvent.id : Number(eventId),
          quantidade: Number(qtd || 0),
          valor_unitario: 0,
          valor_total: Number(String(total || 0).replace(',', '.')),
          origem: 'IMPORTADO'
        });
      }
    });

    if (finalLancamentos.length === 0) {
      throw new Error("Nenhum dado de lançamento válido encontrado. Verifique se as colunas correspondem aos eventos do sistema (ex: Faltas, Gratificação ou os códigos 191, 719, etc).");
    }

    if (CONFIG.IS_MOCK) {
      const items = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, []);
      const withIds = finalLancamentos.map(m => ({ ...m, id: Date.now() + Math.random() }));
      const combined = [...items, ...withIds];
      setStorage(STORAGE_KEYS.LANCAMENTOS, combined);
      return { success: true, count: finalLancamentos.length };
    }
    return fetchApi('/lancamentos/import', { method: 'POST', body: JSON.stringify(finalLancamentos) });
  },

  async importLancamentosAtomic(dataRows: any[], events: EventoFolha[]) {
    // This is a special mode that returns the mapped data without sending it yet
    // Or we can process it here. Let's process it here for simplicity.
    const activeEvents = events && events.length > 0 ? events : MANDATORY_EVENTS;
    const finalLancamentos: any[] = [];

    const findEventMatch = (columnLabel: string) => {
      const clean = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
      const query = clean(columnLabel);
      if (!query) return null;
      return activeEvents.find(e => {
        const name = clean(e.nome_evento);
        const code = String(e.codigo_evento);
        // Priority to exact code match
        if (query === code) return true;
        // Search for code with boundaries to avoid collision (e.g. 33 in 833)
        if (code.length >= 2) {
          const regex = new RegExp(`(^|\\D)${code}(\\D|$)`, 'i');
          if (regex.test(columnLabel)) return true;
        }
        // Name matching
        if (name.length > 2 && (name.includes(query) || query.includes(name))) return true;
        return false;
      });
    };

    dataRows.forEach(d => {
      const funcionario_id = findValue(d, ['Contrato', 'Matricula', 'Matrícula', 'Matrcula', 'ID', 'IdContrato', 'Matr']);
      const nome_funcionario = findValue(d, ['Nome', 'Funcionario', 'nome', 'Colaborador', 'Empregado']);

      if (!funcionario_id) return;

      Object.keys(d).forEach(key => {
        const event = findEventMatch(key);
        if (event) {
          const rawValue = d[key];
          if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
            // Limpa espaços e formatação numérica rigorosamente
            let cleanStr = String(rawValue).replace(/[^\d.,]/g, '').replace(',', '.');
            let val = parseFloat(cleanStr);

            // Heurística para indicadores de presença (X, V, OK, etc)
            if (isNaN(val)) {
              const tag = String(rawValue).trim().toUpperCase();
              if (['V', 'X', 'H', 'R', 'S', 'SIM', 'OK', 'PRESENTE', 'P', '1'].includes(tag)) {
                val = 1;
              }
            }

            if (!isNaN(val) && val !== 0) {
              finalLancamentos.push({
                funcionario_id: String(funcionario_id).replace(/\D/g, ''),
                nome_funcionario: nome_funcionario ? String(nome_funcionario).trim() : null,
                evento_id: event.id,
                codigo_evento: event.codigo_evento, // Add for calc helper
                unidade: event.unidade,             // Add for calc helper
                quantidade: ['HORA', 'DIA', 'UNIDADE'].includes(event.unidade) ? val : 0,
                valor_total: event.unidade === 'VALOR' ? val : 0
              });
            }
          }
        }
      });
    });

    // Chunk size for HostGator
    const CHUNK_SIZE = 10;
    let successCount = 0;
    let errors: any[] = [];

    for (let i = 0; i < finalLancamentos.length; i += CHUNK_SIZE) {
      const chunk = finalLancamentos.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetchApi('/lancamentos/import/atomic', {
          method: 'POST',
          body: JSON.stringify(chunk)
        });
        // res is an array of results from saveAtomicBatch
        if (Array.isArray(res)) {
          res.forEach(r => {
            if (r.status === 'success') successCount++;
            else errors.push(r);
          });
        }
      } catch (e: any) {
        errors.push({ error: e.message, chunk_index: i });
      }
    }

    return { success: true, count: successCount, errors };
  },

  getSettings: async () => {
    if (CONFIG.IS_MOCK) return {
      data: {
        RAZAO_SOCIAL: { valor: 'Supermercado Bem Vindo', descricao: 'Razão Social da Empresa' },
        CNPJ: { valor: '19.953.437/0001-78', descricao: 'CNPJ da Empresa' },
        CODIGO_SERIAL_ERP: { valor: '0001', descricao: 'Código para exportação contábil' }
      }
    };
    return fetchApi('/parametros');
  },

  saveSetting: async (chave: string, valor: string | number | boolean, descricao?: string, tipo: 'TEXTO' | 'NUMERO' | 'BOOLEANO' = 'TEXTO') => {
    if (CONFIG.IS_MOCK) return { success: true };
    return fetchApi('/parametros', {
      method: 'POST',
      body: JSON.stringify({ chave, valor, descricao, tipo })
    });
  },

  /**
   * Retorna todos os eventos ativos que entram na base de cálculo do DSR.
   * Consome: GET /dsr/eventos_base  →  { data: [{ evento_id, tipo_dsr }] }
   */
  buscarEventosQueGeramDSR: async (): Promise<DsrConfigEvento[]> => {
    if (CONFIG.IS_MOCK) return [];
    const res = await fetchApi('/dsr/eventos_base');
    return (res?.data ?? []) as DsrConfigEvento[];
  },

  /**
   * Calcula a base monetária do DSR para um funcionário em uma competência.
   * Soma os valor_total dos lançamentos cujos eventos estão ativos em dsr_config_eventos.
   *
   * Consome: GET /dsr/base_calculo?funcionario_id=X&competencia_id=Y
   */
  calcularBaseDSR: async (funcionarioId: number, competenciaId: number): Promise<BaseDSRResult> => {
    if (CONFIG.IS_MOCK) return { base_dsr: 0, por_tipo: {}, eventos_encontrados: 0 };
    const res = await fetchApi(`/dsr/base_calculo?funcionario_id=${funcionarioId}&competencia_id=${competenciaId}`);
    return res?.data as BaseDSRResult;
  },

  /**
   * Retorna os dias úteis do mês de uma competência.
   * Dias úteis = dias do mês menos domingos e feriados nacionais.
   *
   * Consome: GET /dsr/dias_uteis?competencia_id=X
   */
  calcularDiasUteisMes: async (competenciaId: number): Promise<DiasCalendarioResult | null> => {
    if (CONFIG.IS_MOCK) return { dias_uteis: 22, dias_dsr: 9, mes: 3, ano: 2026 };
    const res = await fetchApi(`/dsr/dias_uteis?competencia_id=${competenciaId}`);
    return res?.data as DiasCalendarioResult ?? null;
  },

  /**
   * Retorna os dias de DSR do mês de uma competência.
   * Dias DSR = domingos + feriados nacionais do mês.
   *
   * Consome: GET /dsr/dias_dsr?competencia_id=X
   */
  calcularDiasDSRMes: async (competenciaId: number): Promise<DiasCalendarioResult | null> => {
    if (CONFIG.IS_MOCK) return { dias_uteis: 22, dias_dsr: 9, mes: 3, ano: 2026 };
    const res = await fetchApi(`/dsr/dias_dsr?competencia_id=${competenciaId}`);
    return res?.data as DiasCalendarioResult ?? null;
  },

  /**
   * Busca as faltas que causam perda de DSR para o funcionário na competência.
   * Consulta dsr_faltas_pre_dsr e retorna a contagem e as datas individuais.
   *
   * Consome: GET /dsr/faltas_dsr?funcionario_id=X&competencia_id=Y
   */
  buscarFaltasQuePerdemDSR: async (funcionarioId: number, competenciaId: number): Promise<FaltasDSRResult> => {
    if (CONFIG.IS_MOCK) return { total_faltas: 0, datas_faltas: [] };
    const res = await fetchApi(`/dsr/faltas_dsr?funcionario_id=${funcionarioId}&competencia_id=${competenciaId}`);
    return res?.data as FaltasDSRResult;
  },

  /**
   * Calcula o DSR de um funcionário na competência, persiste em dsr_calculado e
   * retorna valor_dsr + memória de cálculo completa.
   *
   * Fórmula: valor_dsr = (base_dsr / dias_uteis) × max(dias_dsr - faltas, 0)
   *
   * Consome: POST /dsr/calcular  { funcionario_id, competencia_id }
   */
  calcularDSR: async (funcionarioId: number, competenciaId: number): Promise<ResultadoDSR | null> => {
    if (CONFIG.IS_MOCK) return {
      valor_dsr: 0,
      base_dsr: 0,
      dias_uteis: 22,
      dias_dsr: 9,
      faltas: 0,
      dias_dsr_final: 9,
      memoria_calculo: 'BASE DSR: R$ 0,00 | Dias Úteis: 22 | Dias DSR: 9 | Faltas: 0 | Dias DSR Final: 9 | VALOR DSR: R$ 0,00',
    };
    const res = await fetchApi('/dsr/calcular', {
      method: 'POST',
      body: JSON.stringify({ funcionario_id: funcionarioId, competencia_id: competenciaId }),
    });
    return res?.data as ResultadoDSR ?? null;
  },

  /**
   * DSR já calculado de todos os funcionários da competência (tabela dsr_calculado).
   * Consome: GET /dsr/competencia/{id}
   * v4.56.0: usado pelo DsrModal (antes fazia fetch sem token válido).
   */
  getDsrCompetencia: async (competenciaId: number): Promise<DsrCalculado[]> => {
    if (CONFIG.IS_MOCK) return [];
    const res = await fetchApi(`/dsr/competencia/${competenciaId}`);
    return (res?.data ?? []) as DsrCalculado[];
  },

  /** Consome: POST /dsr/falta  { funcionario_id, competencia_id, data_falta } */
  registrarFaltaDsr: async (funcionarioId: number, competenciaId: number, dataFalta: string) => {
    if (CONFIG.IS_MOCK) return { success: true };
    return fetchApi('/dsr/falta', {
      method: 'POST',
      body: JSON.stringify({ funcionario_id: funcionarioId, competencia_id: competenciaId, data_falta: dataFalta }),
    });
  },

  /** Consome: POST /dsr/recalcular_individual  { funcionario_id, competencia_id } */
  recalcularDsrIndividual: async (funcionarioId: number, competenciaId: number) => {
    if (CONFIG.IS_MOCK) return { success: true };
    return fetchApi('/dsr/recalcular_individual', {
      method: 'POST',
      body: JSON.stringify({ funcionario_id: funcionarioId, competencia_id: competenciaId }),
    });
  },

  /**
   * Gera o PDF da Relação de Cálculo via Servidor (TCPDF / PHP)
   * v4.45.0 High Fidelity
   */
  downloadRelacaoCalculoPDF: async (competencia: string, tipoFolha: string = 'Mensal', funcionarioIds: number[] | null = null, resumoApenas: boolean = false) => {
    if (CONFIG.IS_MOCK) {
      throw new Error("Geração de PDF TCPDF não disponível em modo MOCK.");
    }

    const url = `${CONFIG.API_BASE_URL}/pdf-relatorio`; // Simplificando path

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ 
        competencia, 
        tipo_folha: tipoFolha, 
        funcionario_ids: funcionarioIds,
        resumo_apenas: resumoApenas
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao gerar PDF: ${errorText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Gera o PDF dos Contracheques via Servidor (TCPDF / PHP)
   * 3 por página A4 com guia de corte
   */
  downloadContrachequesPDF: async (competencia: string, funcionarioIds: number[] | null = null, tipoFolha: string = 'Mensal') => {
    if (CONFIG.IS_MOCK) {
      throw new Error("Geração de PDF TCPDF não disponível em modo MOCK.");
    }

    const url = `${CONFIG.API_BASE_URL}/pdf-contracheque`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ 
        competencia, 
        tipo_folha: tipoFolha, 
        funcionario_ids: funcionarioIds
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao gerar PDF: ${errorText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }
};

/** Representa um evento configurado para compor a base de cálculo do DSR. */
export interface DsrConfigEvento {
  evento_id: number;
  tipo_dsr: 'horas_extras' | 'comissao' | 'producao';
}

/** Resultado do cálculo da base monetária do DSR. */
export interface BaseDSRResult {
  /** Soma de todos os lançamentos DSR — valor a ser usado como base de cálculo. */
  base_dsr: number;
  /** Subtotais por tipo: horas_extras, comissao, producao. */
  por_tipo: Partial<Record<'horas_extras' | 'comissao' | 'producao', number>>;
  /** Quantidade de lançamentos que compõem a base. */
  eventos_encontrados: number;
}

/** Resultado do calendário mensal de uma competência para cálculo do DSR. */
export interface DiasCalendarioResult {
  /** Dias úteis = total do mês menos domingos e feriados nacionais. */
  dias_uteis: number;
  /** Dias DSR = domingos + feriados nacionais do mês. */
  dias_dsr: number;
  /** Mês da competência (1–12). */
  mes: number;
  /** Ano da competência. */
  ano: number;
}

/** Resultado da busca de faltas que causam perda de DSR. */
export interface FaltasDSRResult {
  /** Quantidade de faltas que fazem o funcionário perder DSR no mês. */
  total_faltas: number;
  /** Datas individuais das faltas no formato YYYY-MM-DD. */
  datas_faltas: string[];
}

/** Resultado completo do cálculo do DSR. */
export interface ResultadoDSR {
  /** Valor final do DSR a ser pago (líquido após desconto de faltas). */
  valor_dsr: number;
  /** Soma dos lançamentos de eventos configurados em dsr_config_eventos. */
  base_dsr: number;
  /** Dias úteis do mês (exceto domingos e feriados). */
  dias_uteis: number;
  /** Domingos + feriados do mês. */
  dias_dsr: number;
  /** Faltas que causaram perda de DSR. */
  faltas: number;
  /** dias_dsr - faltas (mínimo 0). */
  dias_dsr_final: number;
  /** Memória de cálculo em texto legível para auditoria. */
  memoria_calculo: string;
}
