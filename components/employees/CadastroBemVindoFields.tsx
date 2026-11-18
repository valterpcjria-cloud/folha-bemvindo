import React from 'react';
import { Layers } from 'lucide-react';
import { Cargo, Funcionario, Setor, TipoContrato } from '../../types';

interface Props {
  valor: Partial<Funcionario>;
  setores: Setor[];
  cargos: Cargo[];
  onChange: (patch: Partial<Funcionario>) => void;
}

const ESCOLARIDADES = ['Fundamental incompleto', 'Fundamental', 'Médio incompleto', 'Médio', 'Técnico', 'Superior incompleto', 'Superior', 'Pós-graduação'];
const VINCULOS: { v: TipoContrato; l: string }[] = [
  { v: 'CLT', l: 'Efetivo (CLT)' }, { v: 'ESTAGIO', l: 'Estágio' }, { v: 'PJ', l: 'PJ' }, { v: 'OUTRO', l: 'Outro' }
];

/** Bem Vindo (Fase A.1): setor, cargo na hierarquia, vínculo e dados pessoais pedidos pelo DP. */
const CadastroBemVindoFields: React.FC<Props> = ({ valor, setores, cargos, onChange }) => {
  const setoresAtivos = setores.filter((s) => Number(s.ativo) || s.id === valor.id_setor);
  const cargosDoSetor = cargos
    .filter((c) => c.id_setor === (valor.id_setor ?? null) && (Number(c.ativo) || c.id === valor.id_cargo))
    .sort((a, b) => a.ordem_hierarquia - b.ordem_hierarquia);
  const cargoSemVinculo = !valor.id_cargo && valor.cargo;

  const escolherCargo = (id: number) => {
    const c = cargos.find((x) => x.id === id);
    if (!c) { onChange({ id_cargo: null }); return; }
    onChange({ id_cargo: c.id, cargo: c.nome, ...(c.id_setor ? { id_setor: c.id_setor } : {}), ...(!valor.cbo && c.cbo ? { cbo: c.cbo } : {}) });
  };

  return (
    <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/30">
      <div className="flex items-center gap-2">
        <Layers size={14} className="text-sky-600" />
        <span className="text-sm font-semibold text-slate-700">Setor, cargo e dados pessoais</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="func-setor" className="text-xs font-medium text-slate-600">Setor</label>
          <select id="func-setor" className="input-clean text-sm" value={valor.id_setor ?? ''}
            onChange={(e) => onChange({ id_setor: e.target.value ? Number(e.target.value) : null, id_cargo: null })}>
            <option value="">Sem setor</option>
            {setoresAtivos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="func-cargo" className="text-xs font-medium text-slate-600">Cargo (hierarquia do setor)</label>
          <select id="func-cargo" className="input-clean text-sm" value={valor.id_cargo ?? ''} disabled={!valor.id_setor}
            onChange={(e) => escolherCargo(Number(e.target.value))}>
            <option value="">{valor.id_setor ? (cargosDoSetor.length ? 'Escolha o cargo' : 'Setor sem cargos cadastrados') : 'Escolha o setor primeiro'}</option>
            {cargosDoSetor.map((c) => <option key={c.id} value={c.id}>{c.ordem_hierarquia}. {c.nome}</option>)}
          </select>
          {cargoSemVinculo && <p className="text-[11px] text-amber-700">Cargo atual "{valor.cargo}" ainda não está na hierarquia. Escolha um cargo do setor.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label htmlFor="func-vinculo" className="text-xs font-medium text-slate-600">Vínculo</label>
          <select id="func-vinculo" className="input-clean text-sm" value={valor.tipo_contrato ?? 'CLT'} onChange={(e) => onChange({ tipo_contrato: e.target.value as TipoContrato })}>
            {VINCULOS.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="func-nasc" className="text-xs font-medium text-slate-600">Nascimento</label>
          <input id="func-nasc" type="date" className="input-clean text-sm" value={valor.data_nascimento ?? ''} onChange={(e) => onChange({ data_nascimento: e.target.value || null })} />
        </div>
        <div className="space-y-1">
          <label htmlFor="func-sexo" className="text-xs font-medium text-slate-600">Sexo</label>
          <select id="func-sexo" className="input-clean text-sm" value={valor.sexo ?? ''} onChange={(e) => onChange({ sexo: (e.target.value || null) as Funcionario['sexo'] })}>
            <option value="">Não informado</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="func-escolaridade" className="text-xs font-medium text-slate-600">Escolaridade</label>
          <select id="func-escolaridade" className="input-clean text-sm" value={valor.escolaridade ?? ''} onChange={(e) => onChange({ escolaridade: e.target.value || null })}>
            <option value="">Não informada</option>
            {ESCOLARIDADES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CadastroBemVindoFields;
