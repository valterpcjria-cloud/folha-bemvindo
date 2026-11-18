import React from 'react';
import { Landmark, QrCode, Store, ShieldCheck } from 'lucide-react';
import { Funcionario, ModalidadePagamento } from '../../types';

interface Props {
  valor: Partial<Funcionario>;
  onChange: (patch: Partial<Funcionario>) => void;
}

const OPCOES: { v: ModalidadePagamento; l: string; icon: React.ElementType }[] = [
  { v: 'BANCO', l: 'Banco / conta salário', icon: Landmark },
  { v: 'PIX', l: 'Pix', icon: QrCode },
  { v: 'LOJA', l: 'Na loja (em mãos)', icon: Store },
];

/** Bem Vindo (Fase A.1): forma de pagamento preferida e dados bancários/Pix. Visível só para ADMIN e RH. */
const PagamentoFields: React.FC<Props> = ({ valor, onChange }) => {
  const modo = valor.modalidade_pagamento ?? 'BANCO';
  return (
    <fieldset className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/30">
      <legend className="px-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <ShieldCheck size={14} className="text-emerald-600" /> Pagamento
        <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Dado restrito: só ADMIN e RH veem</span>
      </legend>

      <div role="radiogroup" aria-label="Forma de pagamento preferida" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {OPCOES.map(({ v, l, icon: Icon }) => (
          <label key={v} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer ${modo === v ? 'border-sky-500 bg-sky-50 text-sky-800 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            <input type="radio" name="modalidade_pagamento" value={v} checked={modo === v} onChange={() => onChange({ modalidade_pagamento: v })} className="sr-only" />
            <Icon size={16} /> {l}
          </label>
        ))}
      </div>

      {modo === 'BANCO' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1 md:col-span-1">
            <label htmlFor="pg-banco" className="text-xs font-medium text-slate-600">Banco</label>
            <input id="pg-banco" className="input-clean text-sm" maxLength={80} placeholder="Ex.: Caixa" value={valor.banco ?? ''} onChange={(e) => onChange({ banco: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="pg-agencia" className="text-xs font-medium text-slate-600">Agência</label>
            <input id="pg-agencia" className="input-clean text-sm font-mono" maxLength={20} value={valor.agencia ?? ''} onChange={(e) => onChange({ agencia: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="pg-conta" className="text-xs font-medium text-slate-600">Conta</label>
            <input id="pg-conta" className="input-clean text-sm font-mono" maxLength={30} value={valor.conta ?? ''} onChange={(e) => onChange({ conta: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="pg-tipo" className="text-xs font-medium text-slate-600">Tipo de conta</label>
            <select id="pg-tipo" className="input-clean text-sm" value={valor.tipo_conta ?? ''} onChange={(e) => onChange({ tipo_conta: (e.target.value || null) as Funcionario['tipo_conta'] })}>
              <option value="">Não informado</option>
              <option value="SALARIO">Conta salário</option>
              <option value="CORRENTE">Corrente</option>
              <option value="POUPANCA">Poupança</option>
            </select>
          </div>
        </div>
      )}

      {modo === 'PIX' && (
        <div className="space-y-1">
          <label htmlFor="pg-pix" className="text-xs font-medium text-slate-600">Chave Pix</label>
          <input id="pg-pix" className="input-clean text-sm font-mono" maxLength={140} placeholder="CPF, celular, e-mail ou chave aleatória" value={valor.chave_pix ?? ''} onChange={(e) => onChange({ chave_pix: e.target.value })} />
        </div>
      )}

      {modo === 'LOJA' && (
        <p className="text-xs text-slate-500">Pagamento em mãos na loja. Na relação de pagamentos, esta pessoa entra na coluna "Na loja".</p>
      )}
    </fieldset>
  );
};

export default PagamentoFields;
