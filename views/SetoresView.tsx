import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, AlertCircle, Loader2 } from 'lucide-react';
import { Cargo, Setor } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import SetoresPainel from '../components/setores/SetoresPainel';
import CargosHierarquia, { DadosCargo } from '../components/setores/CargosHierarquia';

/** Troca a posição de um item com o vizinho e devolve os ids na nova ordem. */
const moverIds = <T extends { id: number }>(lista: T[], id: number, direcao: -1 | 1): number[] | null => {
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return null;
  const ids = lista.map((x) => x.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
};

/** Bem Vindo (Fase A.1): cadastro de setores e da hierarquia de cargos de cada setor. */
const SetoresView: React.FC = () => {
  const { user, selectedCompanyId } = useAuth();
  const podeEditar = ['SUPERADMIN', 'ADMIN', 'RH'].includes(user?.perfil ?? '');
  const [setores, setSetores] = useState<Setor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Cargo | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.getSetores(), api.getCargos()]);
      setSetores(s);
      setCargos(c);
      setSelecionadoId((atual) => (atual && s.some((x) => x.id === atual) ? atual : s[0]?.id ?? null));
      setErro(null);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar os setores.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar, selectedCompanyId]);

  /** Executa uma alteração, mostra o erro na tela se falhar e recarrega. */
  const executar = async (acao: () => Promise<unknown>) => {
    try {
      await acao();
      setErro(null);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar a alteração.');
    }
    await carregar();
  };

  const setorSelecionado = setores.find((s) => s.id === selecionadoId) ?? null;
  const cargosDoSetor = useMemo(
    () => cargos.filter((c) => c.id_setor === selecionadoId).sort((a, b) => a.ordem_hierarquia - b.ordem_hierarquia || a.nome.localeCompare(b.nome)),
    [cargos, selecionadoId]
  );

  if (carregando) {
    return <div className="flex items-center justify-center py-24 text-slate-500 gap-2"><Loader2 className="animate-spin" size={18} /> Carregando setores…</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"><Layers size={20} /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Setores e Cargos</h1>
          <p className="text-sm text-slate-500">Organize os setores e a hierarquia de cada um. Setores e cargos não são apagados: são desativados, para preservar os meses já encerrados.</p>
        </div>
      </div>

      {erro && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5" /> <span>{erro}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 items-start">
        <SetoresPainel
          setores={setores}
          selecionadoId={selecionadoId}
          podeEditar={podeEditar}
          onSelecionar={setSelecionadoId}
          onMover={(id, d) => { const ids = moverIds(setores, id, d); if (ids) executar(() => api.reordenarSetores(ids)); }}
          onCriar={(nome) => executar(() => api.criarSetor(nome))}
          onRenomear={(id, nome) => executar(() => api.atualizarSetor(id, { nome }))}
          onAlternarAtivo={(s) => executar(() => api.atualizarSetor(s.id, { ativo: !Number(s.ativo) }))}
        />
        <CargosHierarquia
          setor={setorSelecionado}
          cargos={cargosDoSetor}
          podeEditar={podeEditar}
          onMover={(id, d) => { const ids = moverIds(cargosDoSetor, id, d); if (ids) executar(() => api.reordenarCargos(ids)); }}
          onCriar={(dados: DadosCargo) => executar(() => api.criarCargo({ nome: dados.nome, cbo: dados.cbo, id_setor: selecionadoId }))}
          onSalvar={(id, dados) => executar(() => api.atualizarCargo(id, { nome: dados.nome, cbo: dados.cbo }))}
          onAlternarAtivo={(c) => executar(() => api.atualizarCargo(c.id, { ativo: !Number(c.ativo) }))}
          onExcluir={setExcluir}
        />
      </div>

      <ConfirmModal
        isOpen={!!excluir}
        title="Excluir cargo"
        message={`Excluir o cargo "${excluir?.nome ?? ''}"? Ele não tem ninguém vinculado. Se preferir manter no histórico, use desativar.`}
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => { const c = excluir; setExcluir(null); if (c) executar(() => api.excluirCargo(c.id)); }}
        onCancel={() => setExcluir(null)}
      />
    </div>
  );
};

export default SetoresView;
