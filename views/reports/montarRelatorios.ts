/**
 * Bem Vindo v1.3.0: montagem dos 3 relatórios do DP a partir da folha calculada (mesmos valores do grid).
 *   1. Relatório para a contabilidade (alfabético; HE em horas, faltas em dias, atestado em dias, demais em R$)
 *   2. Resumo por setor (bruto, HE + DSR, descontos, líquido, FGTS e total por rubrica)
 *   3. Relação de pagamentos por modalidade (banco / Pix / loja), alfabética
 */
import { EventoFolha, Funcionario, ModalidadePagamento } from '../../types';
import { EVENT_CODES } from '../../constants/payroll';
import { agruparPorSetor } from '../payroll/agruparPorSetor';
import { FolhaCalculada, valorDe, quantidadeDe, ehFgtsVisual, porNome } from './folhaCalculada';
import { ColunaRelatorio, LinhaRelatorio, TipoColuna } from './exportarRelatorio';

export interface TabelaRelatorio {
  colunas: ColunaRelatorio[];
  linhas: LinhaRelatorio[];
  rodape: string;
  destaques?: { rotulo: string; valor: string }[]; // v1.5.0: cartões no alto da tela (indicadores)
}

export const formatarCpf = (cpf?: string | null): string => {
  const d = (cpf || '').replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || '');
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// ─── 1. Relatório para a contabilidade ──────────────────────────────────────

/** Rubricas calculadas pelo escritório: saem do relatório, a menos que se peça a prévia. */
const CALCULADAS: number[] = [EVENT_CODES.INSS, EVENT_CODES.IRRF, EVENT_CODES.DSR_HE_DIURNAS];

/** Como a rubrica vai para a contabilidade: horas, dias ou R$. */
function tipoNaContabilidade(ev: EventoFolha): TipoColuna {
  if (ev.unidade === 'HORA') return 'hora';
  if (ev.unidade === 'DIA' || Number(ev.codigo_evento) === EVENT_CODES.FALTAS) return 'qtd';
  return 'moeda';
}

const sufixo = (t: TipoColuna) => (t === 'hora' ? '(h:min)' : t === 'qtd' ? '(dias)' : '(R$)');

export function montarRelatorioContabilidade(folha: FolhaCalculada, incluirCalculadas: boolean): TabelaRelatorio {
  const { funcionarios, eventos, lancamentos } = folha;
  const funcs = [...funcionarios].sort(porNome);

  const rubricas = eventos
    .filter(ev => !ehFgtsVisual(ev))
    .filter(ev => incluirCalculadas || !CALCULADAS.includes(Number(ev.codigo_evento)))
    .map(ev => ({ ev, tipo: tipoNaContabilidade(ev) }))
    .filter(({ ev, tipo }) => funcs.some(f =>
      (tipo === 'moeda' ? valorDe(lancamentos, f.id, ev) : quantidadeDe(lancamentos, f.id, ev)) !== 0));

  const colunas: ColunaRelatorio[] = [
    { titulo: 'Matrícula', tipo: 'texto', largura: 10 },
    { titulo: 'Nome', tipo: 'texto', largura: 34 },
    { titulo: 'CPF', tipo: 'texto', largura: 15 },
    { titulo: 'Setor', tipo: 'texto', largura: 18 },
    { titulo: 'Cargo', tipo: 'texto', largura: 20 },
    ...rubricas.map(({ ev, tipo }) => ({ titulo: `${ev.codigo_evento} ${ev.nome_evento} ${sufixo(tipo)}`, tipo, largura: 14 })),
    { titulo: 'Atestado (dias)', tipo: 'qtd', largura: 11 },
  ];

  const somas = rubricas.map(() => 0);
  let somaAtestado = 0;
  const linhas: LinhaRelatorio[] = funcs.map(f => {
    const valores = rubricas.map(({ ev, tipo }, i) => {
      const v = tipo === 'moeda' ? valorDe(lancamentos, f.id, ev) : quantidadeDe(lancamentos, f.id, ev);
      somas[i] += v;
      return v === 0 ? '' : r2(v);
    });
    let atestado: string | number = '';
    if (folha.atestados.has(f.id)) {
      const d = folha.atestadoDias[f.id];
      atestado = d ? d : 'sim (dias não informados)';
      if (d) somaAtestado += d;
    }
    return { celulas: [String(f.id_contrato ?? ''), f.nome, formatarCpf(f.cpf), f.setor_nome || '', f.cargo || '', ...valores, atestado] };
  });

  linhas.push({
    estilo: 'total',
    celulas: ['', `TOTAL (${funcs.length} pessoas)`, '', '', '', ...somas.map(s => (s === 0 ? '' : r2(s))), somaAtestado || ''],
  });

  return {
    colunas,
    linhas,
    rodape: 'Prévia interna do DP. Horas extras e horas faltas em horas (h:min); faltas e feriado trabalhado em dias; '
      + 'demais rubricas em R$. ' + (incluirCalculadas
        ? 'INSS, IRRF e DSR aparecem como prévia: os valores oficiais são os da contabilidade.'
        : 'INSS, IRRF, FGTS e DSR ficam de fora: são calculados pela contabilidade.'),
  };
}

// ─── 2. Resumo por setor ────────────────────────────────────────────────────

const CODIGOS_HE_DSR = [EVENT_CODES.HORAS_EXTRAS_60, EVENT_CODES.HORAS_EXTRAS_100, EVENT_CODES.DSR_HE_DIURNAS];

export function montarResumoPorSetor(folha: FolhaCalculada): TabelaRelatorio {
  const { eventos, lancamentos, totais } = folha;
  const grupos = agruparPorSetor(folha.funcionarios);
  const blocos = [...grupos.map(g => ({ nome: g.nome, funcs: g.funcionarios })), { nome: 'Total geral', funcs: folha.funcionarios }];

  const soma = (funcs: Funcionario[], f: (id: number) => number) => r2(funcs.reduce((s, x) => s + f(x.id), 0));
  const somaCodigos = (funcs: Funcionario[], codigos: number[]) => soma(funcs, id =>
    eventos.filter(ev => codigos.includes(Number(ev.codigo_evento))).reduce((s, ev) => s + valorDe(lancamentos, id, ev), 0));
  const fgts = eventos.find(ehFgtsVisual);

  const linha = (titulo: string, f: (funcs: Funcionario[]) => number | string, estilo?: LinhaRelatorio['estilo']): LinhaRelatorio =>
    ({ celulas: [titulo, ...blocos.map(b => f(b.funcs))], estilo });

  const porRubrica = (tipo: 'CREDITO' | 'DEBITO') => eventos
    .filter(ev => ev.tipo === tipo && !ehFgtsVisual(ev))
    .filter(ev => folha.funcionarios.some(f => valorDe(lancamentos, f.id, ev) !== 0))
    .map(ev => linha(`${ev.codigo_evento} ${ev.nome_evento}`, funcs => soma(funcs, id => valorDe(lancamentos, id, ev))));

  const bruto = (funcs: Funcionario[]) => soma(funcs, id => totais[id]?.proventos || 0);
  const valorFgts = (funcs: Funcionario[]) => (fgts ? soma(funcs, id => valorDe(lancamentos, id, fgts)) : 0);

  const linhas: LinhaRelatorio[] = [
    linha('RESUMO', () => '', 'grupo'),
    linha('Pessoas', funcs => String(funcs.length)),
    linha('Proventos (bruto)', bruto),
    linha('Horas extras + DSR (37, 49, 59)', funcs => somaCodigos(funcs, CODIGOS_HE_DSR)),
    linha('Descontos', funcs => soma(funcs, id => totais[id]?.descontos || 0)),
    linha('Líquido', funcs => soma(funcs, id => totais[id]?.liquido || 0), 'subtotal'),
    linha('FGTS 8% (informativo)', valorFgts),
    linha('Custo médio por pessoa (bruto + FGTS)', funcs => (funcs.length ? r2((bruto(funcs) + valorFgts(funcs)) / funcs.length) : 0)),
    linha('PROVENTOS POR RUBRICA', () => '', 'grupo'),
    ...porRubrica('CREDITO'),
    linha('DESCONTOS POR RUBRICA', () => '', 'grupo'),
    ...porRubrica('DEBITO'),
  ];

  return {
    colunas: [
      { titulo: 'Item', tipo: 'texto', largura: 38 },
      ...blocos.map(b => ({ titulo: b.nome, tipo: 'moeda' as TipoColuna, largura: 15 })),
    ],
    linhas,
    rodape: 'Prévia interna do DP, com os mesmos valores da tela de Lançamentos. FGTS informativo (8%); '
      + 'encargos patronais, adiantamentos, 13º, férias e rescisão entram quando a contabilidade confirmar as regras.',
  };
}

// ─── 3. Relação de pagamentos ───────────────────────────────────────────────

const MODALIDADES: { chave: ModalidadePagamento | null; nome: string }[] = [
  { chave: 'BANCO', nome: 'Conta bancária' },
  { chave: 'PIX', nome: 'Pix' },
  { chave: 'LOJA', nome: 'Na loja (em mãos)' },
  { chave: null, nome: 'Modalidade não informada no cadastro' },
];

const TIPO_CONTA: Record<string, string> = { CORRENTE: 'Corrente', POUPANCA: 'Poupança', SALARIO: 'Salário' };

export function montarRelacaoPagamentos(folha: FolhaCalculada): TabelaRelatorio {
  const { totais } = folha;
  const aPagar = folha.funcionarios.filter(f => (totais[f.id]?.liquido || 0) > 0);
  const semSaldo = folha.funcionarios.length - aPagar.length;

  const linhas: LinhaRelatorio[] = [];
  let totalGeral = 0;
  for (const m of MODALIDADES) {
    const funcs = aPagar.filter(f => (f.modalidade_pagamento || null) === m.chave).sort(porNome);
    if (!funcs.length) continue;
    linhas.push({ estilo: 'grupo', celulas: [m.nome, '', '', '', '', '', '', '', ''] });
    let sub = 0;
    for (const f of funcs) {
      const liq = r2(totais[f.id].liquido);
      sub += liq;
      linhas.push({
        celulas: [f.nome, formatarCpf(f.cpf), f.setor_nome || '', f.banco || '', f.agencia || '', f.conta || '',
          f.tipo_conta ? TIPO_CONTA[f.tipo_conta] ?? f.tipo_conta : '', f.chave_pix || '', liq],
      });
    }
    totalGeral += sub;
    linhas.push({ estilo: 'subtotal', celulas: [`Subtotal ${m.nome} (${funcs.length})`, '', '', '', '', '', '', '', r2(sub)] });
  }
  linhas.push({ estilo: 'total', celulas: [`TOTAL A PAGAR (${aPagar.length} pessoas)`, '', '', '', '', '', '', '', r2(totalGeral)] });

  return {
    colunas: [
      { titulo: 'Nome', tipo: 'texto', largura: 34 },
      { titulo: 'CPF', tipo: 'texto', largura: 15 },
      { titulo: 'Setor', tipo: 'texto', largura: 18 },
      { titulo: 'Banco', tipo: 'texto', largura: 14 },
      { titulo: 'Agência', tipo: 'texto', largura: 9 },
      { titulo: 'Conta', tipo: 'texto', largura: 13 },
      { titulo: 'Tipo', tipo: 'texto', largura: 10 },
      { titulo: 'Chave Pix', tipo: 'texto', largura: 26 },
      { titulo: 'Líquido (R$)', tipo: 'moeda', largura: 14 },
    ],
    linhas,
    rodape: 'Líquido = proventos - descontos da tela de Lançamentos (prévia; o oficial é o da contabilidade). '
      + (semSaldo ? `${semSaldo} pessoa(s) sem líquido a receber ficaram fora. ` : '')
      + 'Dados bancários e Pix só aparecem para os perfis ADMIN e RH.',
  };
}
