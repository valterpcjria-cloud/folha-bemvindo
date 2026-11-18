/**
 * FuncionarioCell - conteúdo da coluna fixa "Funcionário" da matriz.
 * Extraído do PayrollTableRow (v1.1.0) e acrescido das etiquetas do protótipo do DP:
 *   - Nível (escolaridade do cadastro)
 *   - Aniversariante do mês da competência (alerta; o bônus em si depende da contabilidade)
 *   - Admissão no mês → salário proporcional (só mostra; o cálculo já existia: 30 − dia + 1)
 *   - Atestado: liga/desliga (zera Assiduidade, como antes) + quantidade de dias
 * Nada aqui altera valores da folha.
 */
import React, { useEffect, useState } from 'react';
import { Eye, FileCheck2, Cake, GraduationCap, CalendarPlus } from 'lucide-react';
import { Funcionario } from '../../types';

/** Partes de uma data 'AAAA-MM-DD' (ou com hora). null se inválida. */
const partesData = (data?: string | null): { ano: number; mes: number; dia: number } | null => {
  if (!data) return null;
  const [a, m, d] = String(data).split('T')[0].split('-').map(Number);
  if (!a || !m || !d) return null;
  return { ano: a, mes: m, dia: d };
};

/** Dias pagos no mês de admissão (mesma conta do calcSalarioProporcional). null se não admitido no mês. */
export const diasProporcionaisAdmissao = (dataAdmissao: string | undefined, mes: number, ano: number): number | null => {
  const p = partesData(dataAdmissao);
  if (!p || p.ano !== ano || p.mes !== mes) return null;
  return Math.max(0, Math.min(30, 30 - p.dia + 1));
};

const dd = (n: number) => String(n).padStart(2, '0');

const Etiqueta: React.FC<{ cor: string; titulo: string; children: React.ReactNode }> = ({ cor, titulo, children }) => (
  <span title={titulo} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold leading-none whitespace-nowrap ${cor}`}>
    {children}
  </span>
);

/** Campo pequeno de dias do atestado: grava ao sair do campo ou com Enter. */
const DiasAtestadoInput: React.FC<{ valor: number | null; onCommit: (dias: number | null) => void; nome: string }> = ({ valor, onCommit, nome }) => {
  const [texto, setTexto] = useState(valor ? String(valor) : '');
  useEffect(() => { setTexto(valor ? String(valor) : ''); }, [valor]);
  const confirmar = () => {
    const n = parseInt(texto, 10);
    const dias = Number.isFinite(n) && n > 0 ? Math.min(31, n) : null;
    setTexto(dias ? String(dias) : '');
    onCommit(dias);
  };
  return (
    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
      <input
        type="number"
        min={1}
        max={31}
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="—"
        aria-label={`Dias de atestado de ${nome}`}
        title="Quantidade de dias do atestado (vai em dias para a contabilidade, sem valor)"
        className="w-9 h-5 px-1 text-center rounded border border-amber-200 bg-white text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      dias
    </label>
  );
};

interface Props {
  funcionario: Funcionario;
  compMes?: number;
  compAno?: number;
  compAberta: boolean;
  temAtestado: boolean;
  diasAtestado: number | null;
  onToggleAtestado: (funcId: number) => void;
  onDiasAtestado: (funcId: number, dias: number | null) => void;
  onViewPaystub: (func: Funcionario) => void;
}

const FuncionarioCell: React.FC<Props> = ({
  funcionario, compMes, compAno, compAberta, temAtestado, diasAtestado, onToggleAtestado, onDiasAtestado, onViewPaystub,
}) => {
  const nasc = partesData(funcionario.data_nascimento);
  const aniversariante = !!(nasc && compMes && nasc.mes === compMes);
  const diasAdm = compMes && compAno ? diasProporcionaisAdmissao(funcionario.data_admissao, compMes, compAno) : null;
  const adm = partesData(funcionario.data_admissao);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-medium text-slate-800">{funcionario.nome}</span>
        <span className="text-[10px] text-slate-400 font-mono">
          MAT: {funcionario.id_contrato}
          {/* Bem Vindo (Fase A.2): cargo visível para conferir a hierarquia do setor */}
          {funcionario.cargo && <span className="font-sans text-slate-500"> · {funcionario.cargo}</span>}
        </span>

        {/* Bem Vindo v1.1.0: etiquetas do protótipo (só informação) */}
        {(funcionario.escolaridade || aniversariante || diasAdm !== null) && (
          <div className="flex flex-wrap gap-1">
            {funcionario.escolaridade && (
              <Etiqueta cor="bg-sky-50 text-sky-700 border-sky-200" titulo="Nível (escolaridade do cadastro)">
                <GraduationCap size={11} aria-hidden="true" />{funcionario.escolaridade}
              </Etiqueta>
            )}
            {aniversariante && nasc && (
              <Etiqueta cor="bg-pink-50 text-pink-700 border-pink-200" titulo="Aniversariante no mês da competência — conferir o bônus aniversário antes de liberar">
                <Cake size={11} aria-hidden="true" />Aniversário {dd(nasc.dia)}/{dd(nasc.mes)}
              </Etiqueta>
            )}
            {diasAdm !== null && adm && (
              <Etiqueta cor="bg-violet-50 text-violet-700 border-violet-200" titulo={`Admitido em ${dd(adm.dia)}/${dd(adm.mes)}/${adm.ano}: salário proporcional a ${diasAdm} de 30 dias (já calculado na rubrica 33)`}>
                <CalendarPlus size={11} aria-hidden="true" />Admissão {dd(adm.dia)}/{dd(adm.mes)} · {diasAdm}/30 dias
              </Etiqueta>
            )}
          </div>
        )}

        {/* v4.54.0: Atestado — zera Assiduidade (833) na competência. Só em comp aberta.
            Bem Vindo v1.1.0: + quantidade de dias (informativo; não muda valores). */}
        {compAberta ? (
          <div className="flex items-center gap-1.5">
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
            {temAtestado && (
              <DiasAtestadoInput valor={diasAtestado} nome={funcionario.nome} onCommit={(d) => onDiasAtestado(funcionario.id, d)} />
            )}
          </div>
        ) : temAtestado && (
          <Etiqueta cor="bg-amber-50 text-amber-700 border-amber-200 w-fit" titulo="Atestado registrado nesta competência">
            <FileCheck2 size={11} aria-hidden="true" />Atestado{diasAtestado ? ` ${diasAtestado} ${diasAtestado === 1 ? 'dia' : 'dias'}` : ''}
          </Etiqueta>
        )}
      </div>
      <button
        onClick={() => onViewPaystub(funcionario)}
        className="text-slate-400 hover:text-emerald-600 p-1.5 transition-colors bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 shrink-0"
        title="Ver Contracheque"
      >
        <Eye size={16} />
      </button>
    </div>
  );
};

export default FuncionarioCell;
