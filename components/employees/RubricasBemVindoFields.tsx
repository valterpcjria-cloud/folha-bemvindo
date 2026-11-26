import React from 'react';
import { Percent, Bus } from 'lucide-react';
import { Funcionario } from '../../types';
import { VT_DESCONTO_MAX_PERC } from '../../constants/payroll';
import { maskBRL, parseBRL, formatBRL } from '../../utils/currency';

interface Props {
  valor: Partial<Funcionario>;
  onChange: (patch: Partial<Funcionario>) => void;
}

const limitar = (v: string, max: number) => Math.min(max, Math.max(0, Number(v) || 0));

/**
 * Bem Vindo v1.2.0: rubricas do cadastro confirmadas pela contabilidade.
 *  - Gratificação de função (82): % sobre o salário (P4). Substitui a Gratificação 88 da Frimelo.
 *  - Desconto do vale-transporte (816): até 6% do salário, limitado ao custo mensal do VT (P10).
 */
const RubricasBemVindoFields: React.FC<Props> = ({ valor, onChange }) => (
  <>
    <div className="space-y-1">
      <label htmlFor="func-grat-funcao" className="text-xs font-medium text-slate-600 flex items-center gap-1">
        <Percent size={12} className="text-green-500" />
        Grat. de Função <span className="text-[9px] text-slate-400">(82)</span>
      </label>
      <div className="relative">
        <input
          id="func-grat-funcao"
          type="number"
          step="0.01"
          min="0"
          max="100"
          className="input-clean text-right pr-8 text-sm"
          placeholder="0"
          value={valor.gratificacao_funcao_perc ?? 0}
          onChange={(e) => onChange({ gratificacao_funcao_perc: limitar(e.target.value, 100) })}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
      </div>
    </div>

    <div className="space-y-1">
      <label htmlFor="func-vt-perc" className="text-xs font-medium text-slate-600 flex items-center gap-1">
        <Bus size={12} className="text-amber-500" />
        Desc. VT <span className="text-[9px] text-slate-400">(816 · máx. {VT_DESCONTO_MAX_PERC}%)</span>
      </label>
      <div className="relative">
        <input
          id="func-vt-perc"
          type="number"
          step="0.01"
          min="0"
          max={VT_DESCONTO_MAX_PERC}
          className="input-clean text-right pr-8 text-sm"
          placeholder="0"
          value={valor.vt_desconto_perc ?? 0}
          onChange={(e) => onChange({ vt_desconto_perc: limitar(e.target.value, VT_DESCONTO_MAX_PERC) })}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
      </div>
    </div>

    <div className="space-y-1">
      <label htmlFor="func-vt-custo" className="text-xs font-medium text-slate-600 flex items-center gap-1">
        <Bus size={12} className="text-amber-500" />
        Custo do VT <span className="text-[9px] text-slate-400">(teto do 816)</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">R$</span>
        <input
          id="func-vt-custo"
          type="text"
          inputMode="numeric"
          className="input-clean pl-10 text-right font-mono text-sm"
          placeholder="sem teto"
          value={valor.vt_custo_mensal ? formatBRL(valor.vt_custo_mensal) : ''}
          onChange={(e) => onChange({ vt_custo_mensal: parseBRL(maskBRL(e.target.value)) })}
        />
      </div>
    </div>
  </>
);

export default RubricasBemVindoFields;
