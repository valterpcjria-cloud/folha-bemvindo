/**
 * PayrollTableRow - Linha individual da tabela de folha
 * Mostra dados do funcionário e inputs para cada evento
 */

import React, { useState } from 'react';
import { Eye, CheckSquare, Square, Lock, FileCheck2 } from 'lucide-react';
import { Funcionario, EventoFolha, Lancamento, Unidade } from '../../types';
import { FuncTotals } from '../../hooks/usePayrollData';
import { decimalToHM, parseHMToDecimal } from '../../utils/timeHM';
import { maskBRL, parseBRL, formatBRL } from '../../utils/currency';

/**
 * Rubricas (codigo_evento) cujas células de valor usam máscara monetária
 * automática estilo R$ (digite "15050" → vira "150,50").
 * v4.52.6: Desc Vale (191), Mensalidade Sindical (936), Empréstimo Consignado (4004).
 * v4.52.9: Gratificação (88).
 */
const CURRENCY_MASK_CODES = new Set<number>([88, 191, 936, 4004]);

/**
 * Input especializado para horas em formato HH:MM.
 * Armazenamento continua em decimal (ex: 2.5) — apenas a UI formata.
 * Aceita também decimal puro como fallback ("2,5" ou "2.5").
 */
const HoursInput: React.FC<{
    value: number | undefined;
    onCommit: (decimalAsString: string) => void;
    className?: string;
    placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');

    const displayValue = editing
        ? text
        : (value && Number(value) > 0 ? decimalToHM(Number(value)) : '');

    return (
        <input
            type="text"
            inputMode="numeric"
            className={className}
            placeholder={placeholder}
            value={displayValue}
            onFocus={() => {
                setEditing(true);
                setText(value && Number(value) > 0 ? decimalToHM(Number(value)) : '');
            }}
            onChange={(e) => {
                // Máscara automática: usuário digita 230 → "2:30"; 1500 → "15:00"
                // Sempre re-deriva o display a partir dos dígitos puros (max 5: até 999:59)
                const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                if (digits.length === 0) setText('');
                else if (digits.length <= 2) setText(digits);
                else setText(`${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`);
            }}
            onBlur={() => {
                const decimal = parseHMToDecimal(text);
                onCommit(String(decimal));
                setEditing(false);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            title="Digite só números: 230 vira 2:30, 1500 vira 15:00. Aceita também 2,5 ou 2.5."
        />
    );
};

/**
 * Input com máscara monetária BR (R$). Usuário digita só dígitos e o ponto/vírgula
 * são inseridos automaticamente: "15050" → "150,50"; "1500050" → "15.000,50".
 * Armazenamento continua em decimal (150.5) — apenas a UI formata.
 */
const CurrencyInput: React.FC<{
    value: number | undefined;
    onCommit: (decimalAsString: string) => void;
    className?: string;
    placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');

    const displayValue = editing
        ? text
        : (value && Number(value) > 0 ? formatBRL(Number(value)) : '');

    return (
        <input
            type="text"
            inputMode="numeric"
            className={className}
            placeholder={placeholder}
            value={displayValue}
            onFocus={() => {
                setEditing(true);
                setText(value && Number(value) > 0 ? formatBRL(Number(value)) : '');
            }}
            onChange={(e) => {
                // Máscara automática: dígitos puros viram R$ formatado (último 2 dígitos = centavos)
                setText(maskBRL(e.target.value));
            }}
            onBlur={() => {
                const decimal = parseBRL(text);
                onCommit(String(decimal));
                setEditing(false);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            title="Digite só números: 15050 vira 150,50; 1500050 vira 15.000,50"
        />
    );
};

interface PayrollTableRowProps {
    funcionario: Funcionario;
    eventos: EventoFolha[];
    lancamentos: Record<string, Partial<Lancamento>>;
    totals: FuncTotals;
    isSelected: boolean;
    onToggleSelect: (id: number) => void;
    onUpdateLancamento: (funcId: number, eventId: number, field: keyof Lancamento, value: string) => void;
    onViewPaystub: (func: Funcionario) => void;
    temAtestado: boolean;
    onToggleAtestado: (funcId: number) => void;
    compAberta: boolean;
}

const PayrollTableRow: React.FC<PayrollTableRowProps> = ({
    funcionario,
    eventos,
    lancamentos,
    totals,
    isSelected,
    onToggleSelect,
    onUpdateLancamento,
    onViewPaystub,
    temAtestado,
    onToggleAtestado,
    compAberta,
}) => {
    const liquido = (totals.proventos || 0) - (totals.descontos || 0);

    return (
        <tr className={`group/row hover:bg-slate-50 transition-colors ${isSelected ? 'bg-sky-50/50' : ''}`}>
            {/* Checkbox */}
            <td className={`px-4 py-3 border-r border-slate-100 sticky left-0 z-20 text-center ${isSelected ? 'bg-sky-50' : 'bg-white group-hover/row:bg-slate-50'}`}>
                <button
                    onClick={() => onToggleSelect(funcionario.id)}
                    className={isSelected ? 'text-sky-600' : 'text-slate-300 hover:text-slate-400'}
                >
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
            </td>

            {/* Info do Funcionário */}
            <td className={`px-6 py-3 border-r border-slate-100 sticky left-12 z-20 shadow-[4px_0_8px_rgba(0,0,0,0.06)] ${isSelected ? 'bg-sky-50' : 'bg-white group-hover/row:bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-800">{funcionario.nome}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                            MAT: {funcionario.id_contrato}
                            {/* Bem Vindo (Fase A.2): cargo visível para conferir a hierarquia do setor */}
                            {funcionario.cargo && <span className="font-sans text-slate-500"> · {funcionario.cargo}</span>}
                        </span>
                        {/* v4.54.0: Atestado — zera Assiduidade (833) na competência. Só em comp aberta. */}
                        {compAberta && (
                            <button
                                onClick={() => onToggleAtestado(funcionario.id)}
                                title={temAtestado ? 'Atestado informado — Assiduidade perdida. Clique para remover.' : 'Marcar atestado (perde Assiduidade)'}
                                className={`mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all w-fit active:scale-95 ${
                                    temAtestado
                                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-600 hover:border-amber-200'
                                }`}
                            >
                                <FileCheck2 size={12} />
                                {temAtestado ? 'Atestado ✓' : 'Atestado'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => onViewPaystub(funcionario)}
                        className="text-slate-400 hover:text-emerald-600 p-1.5 transition-colors bg-slate-50 hover:bg-slate-100 rounded border border-slate-200"
                        title="Ver Contracheque"
                    >
                        <Eye size={16} />
                    </button>
                </div>
            </td>

            {/* Células de Eventos */}
            {eventos.map(ev => {
                const key = `${funcionario.id}_${ev.id}`;
                const l = lancamentos[key] || {};
                const isVal = ev.unidade === Unidade.VALOR;
                // Rubrica 59 é somente leitura — calculada automaticamente
                const isCalculado = ev.codigo_evento === 59;
                // v4.52.0: Rubrica 33 (Salário) travada — alterar via cadastro do funcionário
                const isSalario = ev.codigo_evento === 33;
                // v4.52.11: Rubrica 35 (INSS) travada — auto-calculada pela tabela progressiva
                const isINSS = ev.codigo_evento === 35;
                // v4.52.20: Rúbricas do cadastro — travadas, alterar via ficha do funcionário
                const isCadastroLocked = [62, 833, 1000, 936, 4004, 88].includes(ev.codigo_evento);
                // v4.52.21: FGTS Visual (1900) travada — informativo para o empregador
                const isFGTSVisual = ev.codigo_evento === 1900;
                // v4.53.0: Rubrica 1920 (IRRF) travada — auto-calculada pela tabela progressiva + redutor
                const isIRRF = ev.codigo_evento === 1920;

                return (
                    <td key={ev.id} className="p-0 border-r border-slate-100 relative group/cell">
                        {[49, 719, 1080].includes(ev.codigo_evento) && (
                            <span className="absolute -top-2 left-1 z-10 bg-indigo-100 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Base DSR</span>
                        )}
                        {ev.codigo_evento === 59 && (
                            <span className="absolute -top-2 left-1 z-10 bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Auto</span>
                        )}
                        {isSalario && (
                            <span className="absolute -top-2 left-1 z-10 bg-slate-200 text-slate-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Cadastro</span>
                        )}
                        {isCadastroLocked && (
                            <span className="absolute -top-2 left-1 z-10 bg-slate-200 text-slate-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Cadastro</span>
                        )}
                        {isINSS && (
                            <span className="absolute -top-2 left-1 z-10 bg-rose-100 text-rose-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Auto</span>
                        )}
                        {isFGTSVisual && (
                            <span className="absolute -top-2 left-1 z-10 bg-indigo-100 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Encargo</span>
                        )}
                        {isIRRF && (
                            <span className="absolute -top-2 left-1 z-10 bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">Auto</span>
                        )}
                        {isINSS ? (
                            /* Rubrica 35 — INSS: cálculo automático pela tabela progressiva 2026 */
                            <div
                                className="w-full h-full py-3 px-4 flex items-center justify-center gap-1.5 bg-rose-50/40 border-l-2 border-rose-200 cursor-not-allowed"
                                title="INSS calculado automaticamente pela tabela progressiva oficial 2026."
                            >
                                <Lock size={10} className="text-rose-400" />
                                <span className={`text-sm font-semibold ${(l.valor_total || 0) > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                    {(l.valor_total || 0) > 0
                                        ? Number(l.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                        : '0,00'}
                                </span>
                            </div>
                        ) : isIRRF ? (
                            /* Rubrica 1920 — IRRF: auto-calculado, aparece quando salário está na faixa tributável */
                            <div
                                className="w-full h-full py-3 px-4 flex items-center justify-center gap-1.5 bg-amber-50/40 border-l-2 border-amber-200 cursor-not-allowed"
                                title="IRRF calculado automaticamente pela tabela progressiva 2026 + redutor Lei 15.270/2025. Aparece quando salário está na faixa tributável."
                            >
                                <Lock size={10} className="text-amber-400" />
                                <span className={`text-sm font-semibold ${(l.valor_total || 0) > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                    {(l.valor_total || 0) > 0
                                        ? Number(l.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                        : '0,00'}
                                </span>
                            </div>
                        ) : isFGTSVisual ? (
                            /* Rubrica 1900 — FGTS Visual: somente informativo, não afeta o líquido */
                            <div
                                className="w-full h-full py-3 px-4 flex items-center justify-center gap-1.5 bg-indigo-50/40 border-l-2 border-indigo-200 cursor-not-allowed"
                                title="FGTS (8%) calculado apenas para visualização do empregador. Não afeta o líquido do funcionário."
                            >
                                <Lock size={10} className="text-indigo-400" />
                                <span className={`text-sm font-semibold ${(l.valor_total || 0) > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                    {(l.valor_total || 0) > 0
                                        ? Number(l.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                        : '0,00'}
                                </span>
                            </div>
                        ) : isSalario ? (
                            /* Rubrica 33 — Salário: alimentado pelo cadastro do funcionário (salario_base) */
                            <div
                                className="w-full h-full py-3 px-4 flex items-center justify-center gap-1.5 bg-slate-100/80 border-l-2 border-slate-300 cursor-not-allowed"
                                title="Salário é definido no cadastro do funcionário. Para alterar, edite o cadastro."
                            >
                                <Lock size={10} className="text-slate-400" />
                                <span className={`text-sm font-semibold ${(l.valor_total || 0) > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                    {(l.valor_total || 0) > 0
                                        ? Number(l.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                        : '—'}
                                </span>
                            </div>
                        ) : isCadastroLocked ? (
                            /* v4.52.20: Rúbricas do cadastro (62, 833, 1000, 936, 4004) — travadas */
                            <div
                                className="w-full h-full py-3 px-4 flex items-center justify-center gap-1.5 bg-slate-100/80 border-l-2 border-slate-300 cursor-not-allowed"
                                title="Valor definido no cadastro do funcionário. Para alterar, edite a ficha de cadastro."
                            >
                                <Lock size={10} className="text-slate-400" />
                                <span className={`text-sm font-semibold ${(l.valor_total || 0) > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                    {(l.valor_total || 0) > 0
                                        ? Number(l.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                        : '0,00'}
                                </span>
                            </div>
                        ) : isCalculado ? (
                            /* Rubrica 59 — DSR s/ HE Diurnas: somente leitura */
                            <div className="w-full h-full py-3 px-4 flex items-center justify-center bg-emerald-50/60 border-l-2 border-emerald-300/60">
                                <span className={`text-sm font-semibold ${(l.valor_total || 0) > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                                    {(l.valor_total || 0) > 0
                                        ? Number(l.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                        : '0,00'}
                                </span>
                            </div>
                        ) : isVal ? (
                            CURRENCY_MASK_CODES.has(ev.codigo_evento) ? (
                                /* v4.52.6: máscara R$ automática para Desc Vale, Mensalidade Sindical, Empréstimo Consignado */
                                <CurrencyInput
                                    value={Number(l.valor_total || 0)}
                                    onCommit={(v) => onUpdateLancamento(funcionario.id, ev.id, 'valor_total', v)}
                                    className="w-full h-full py-3 px-4 text-center bg-transparent focus:bg-sky-50 focus:outline-none text-slate-700 placeholder:text-slate-300 font-medium transition-colors"
                                    placeholder="0,00"
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="w-full h-full py-3 px-4 text-center bg-transparent focus:bg-sky-50 focus:outline-none text-slate-700 placeholder:text-slate-300 font-medium transition-colors"
                                    placeholder="0,00"
                                    value={l.valor_total || ''}
                                    onChange={(e) => onUpdateLancamento(funcionario.id, ev.id, 'valor_total', e.target.value)}
                                />
                            )
                        ) : ev.unidade === Unidade.PERCENTUAL ? (
                            <div className="flex h-full">
                                <div className="w-1/2 relative">
                                    <input
                                        type="text"
                                        className="w-full h-full text-center text-xs text-slate-700 border-r border-slate-100 focus:bg-sky-50 focus:outline-none pr-4"
                                        placeholder="0"
                                        value={l.quantidade || ''}
                                        onChange={(e) => onUpdateLancamento(funcionario.id, ev.id, 'quantidade', e.target.value)}
                                    />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                </div>
                                <div className="w-1/2 flex items-center justify-center text-xs text-slate-600 bg-slate-50/50">
                                    {l.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ) : ev.unidade === Unidade.HORA ? (
                            /* HORA: input HH:MM (ex: "2:30" = 2h30min). Armazenamento em decimal. */
                            <div className="flex h-full">
                                <HoursInput
                                    value={Number(l.quantidade || 0)}
                                    onCommit={(v) => onUpdateLancamento(funcionario.id, ev.id, 'quantidade', v)}
                                    className="w-1/2 text-center text-xs text-slate-400 border-r border-slate-100 focus:bg-sky-50 focus:text-slate-700 focus:outline-none"
                                    placeholder="0:00"
                                />
                                <div className="w-1/2 flex items-center justify-center text-xs text-slate-600 bg-slate-50/50">
                                    {l.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full">
                                <input
                                    type="text"
                                    className="w-1/2 text-center text-xs text-slate-400 border-r border-slate-100 focus:bg-sky-50 focus:text-slate-700 focus:outline-none"
                                    placeholder="Qtd"
                                    value={l.quantidade || ''}
                                    onChange={(e) => onUpdateLancamento(funcionario.id, ev.id, 'quantidade', e.target.value)}
                                />
                                <div className="w-1/2 flex items-center justify-center text-xs text-slate-600 bg-slate-50/50">
                                    {l.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}
                    </td>
                );
            })}

            {/* Líquido */}
            <td className="px-6 py-3 text-center sticky right-0 z-20 bg-slate-50 font-bold text-slate-800 border-l border-slate-200 shadow-[-4px_0_8px_rgba(0,0,0,0.06)]">
                {liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
        </tr >
    );
};

export default PayrollTableRow;
