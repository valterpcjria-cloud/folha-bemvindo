/**
 * Bem Vindo v1.5.0 (Fase D): indicadores do mês por setor — quadro de pessoal, absenteísmo e custo.
 * Só usa dados que o sistema já tem (cadastro + folha calculada). Encargos patronais e faturamento
 * por setor (custo ÷ receita) entram quando houver a regra da contabilidade / o dado do faturamento.
 */
import { Funcionario } from '../../types';
import { EVENT_CODES, MONTHLY_WORKING_HOURS } from '../../constants/payroll';
import { agruparPorSetor } from '../payroll/agruparPorSetor';
import { FolhaCalculada, quantidadeDe, valorDe, ehFgtsVisual } from './folhaCalculada';
import { LinhaRelatorio, TipoColuna } from './exportarRelatorio';
import { TabelaRelatorio } from './montarRelatorios';
import { decimalToHM } from '../../utils/timeHM';

const HORAS_POR_DIA = MONTHLY_WORKING_HOURS / 30; // 7h20: jornada CLT de 220 h/mês
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (n: number, dec = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const pct = (parte: number, todo: number) => (todo > 0 ? `${num((parte / todo) * 100)}%` : '—');

/** Ligado à empresa em algum dia do mês da competência. */
function vinculadoNoMes(f: Funcionario, inicio: string, fim: string): boolean {
  if (f.data_admissao && f.data_admissao.slice(0, 10) > fim) return false;
  if (f.data_demissao) return f.data_demissao.slice(0, 10) >= inicio;
  return f.status !== 'DESLIGADO';
}

function anosEntre(de: string, ate: string): number {
  const a = new Date(de.slice(0, 10) + 'T00:00:00');
  const b = new Date(ate + 'T00:00:00');
  return (b.getTime() - a.getTime()) / (365.25 * 24 * 3600 * 1000);
}

const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null);

export function montarIndicadores(folha: FolhaCalculada): TabelaRelatorio {
  const { competencia: c, eventos, lancamentos, totais } = folha;
  const mm = String(c.mes).padStart(2, '0');
  const inicio = `${c.ano}-${mm}-01`;
  const fim = `${c.ano}-${mm}-${String(new Date(c.ano, c.mes, 0).getDate()).padStart(2, '0')}`;

  // Pessoas do mês: vinculadas pelo cadastro + quem teve movimento na folha (sem repetir)
  const porId = new Map<number, Funcionario>();
  folha.todosFuncionarios.filter(f => vinculadoNoMes(f, inicio, fim)).forEach(f => porId.set(f.id, f));
  folha.funcionarios.forEach(f => porId.set(f.id, f));
  const pessoas = [...porId.values()];
  const blocos = [...agruparPorSetor(pessoas).map(g => ({ nome: g.nome, funcs: g.funcionarios })), { nome: 'Total geral', funcs: pessoas }];

  const ev = (codigo: number) => eventos.find(e => Number(e.codigo_evento) === codigo);
  const evFaltas = ev(EVENT_CODES.FALTAS);
  const evHorasFaltas = ev(EVENT_CODES.HORAS_FALTAS);
  const evFgts = eventos.find(ehFgtsVisual);

  const soma = (fs: Funcionario[], f: (x: Funcionario) => number) => fs.reduce((s, x) => s + f(x), 0);
  const faltasDias = (fs: Funcionario[]) => (evFaltas ? soma(fs, x => quantidadeDe(lancamentos, x.id, evFaltas)) : 0);
  const horasFaltas = (fs: Funcionario[]) => (evHorasFaltas ? soma(fs, x => quantidadeDe(lancamentos, x.id, evHorasFaltas)) : 0);
  const atestadoPessoas = (fs: Funcionario[]) => fs.filter(x => folha.atestados.has(x.id)).length;
  const atestadoDias = (fs: Funcionario[]) => soma(fs, x => Number(folha.atestadoDias[x.id] || 0));
  const bruto = (fs: Funcionario[]) => soma(fs, x => totais[x.id]?.proventos || 0);
  // Custo só de quem está na folha do mês (no mês aberto o desligado sai do grid, como na tela de Lançamentos)
  const naFolha = (x: Funcionario) => !!totais[x.id];
  const fgts = (fs: Funcionario[]) => (evFgts ? soma(fs, x => (naFolha(x) ? valorDe(lancamentos, x.id, evFgts) : 0)) : 0);
  const custo = (fs: Funcionario[]) => r2(bruto(fs) + fgts(fs));
  const custoTotal = custo(pessoas);

  const diasPerdidos = (fs: Funcionario[]) => faltasDias(fs) + atestadoDias(fs) + horasFaltas(fs) / HORAS_POR_DIA;
  const absenteismo = (fs: Funcionario[]) => pct(diasPerdidos(fs), fs.length * folha.diasUteis);

  const contaSexo = (fs: Funcionario[], s: 'F' | 'M' | null) =>
    fs.filter(x => (s ? x.sexo === s : !x.sexo || x.sexo === 'O')).length;
  const noMes = (d?: string | null) => !!d && d.slice(0, 10) >= inicio && d.slice(0, 10) <= fim;

  const linha = (titulo: string, f: (fs: Funcionario[]) => number | string, estilo?: LinhaRelatorio['estilo']): LinhaRelatorio =>
    ({ celulas: [titulo, ...blocos.map(b => f(b.funcs))], estilo });
  const grupo = (titulo: string) => linha(titulo, () => '', 'grupo');
  const qtd = (f: (fs: Funcionario[]) => number) => (fs: Funcionario[]) => String(f(fs));
  const anos = (f: (x: Funcionario) => string | null | undefined) => (fs: Funcionario[]) => {
    const m = media(fs.map(f).filter((d): d is string => !!d).map(d => anosEntre(d, fim)));
    return m === null ? '—' : num(m);
  };

  const linhas: LinhaRelatorio[] = [
    grupo('QUADRO DE PESSOAL'),
    linha('Pessoas no mês', qtd(fs => fs.length), 'subtotal'),
    linha('Mulheres', fs => `${contaSexo(fs, 'F')} (${pct(contaSexo(fs, 'F'), fs.length)})`),
    linha('Homens', fs => `${contaSexo(fs, 'M')} (${pct(contaSexo(fs, 'M'), fs.length)})`),
    linha('Sexo não informado / outro', qtd(fs => contaSexo(fs, null))),
    linha('Estagiários', qtd(fs => fs.filter(x => x.tipo_contrato === 'ESTAGIO').length)),
    linha('Admissões no mês', qtd(fs => fs.filter(x => noMes(x.data_admissao)).length)),
    linha('Desligamentos no mês', qtd(fs => fs.filter(x => noMes(x.data_demissao)).length)),
    linha('Idade média (anos)', anos(x => x.data_nascimento)),
    linha('Tempo médio de casa (anos)', anos(x => x.data_admissao)),
    grupo('ABSENTEÍSMO'),
    linha('Faltas (dias)', fs => num(faltasDias(fs), 0)),
    linha('Horas faltas (h:min)', fs => decimalToHM(horasFaltas(fs)) || '0:00'),
    linha('Pessoas com atestado', qtd(atestadoPessoas)),
    linha('Dias de atestado', qtd(atestadoDias)),
    linha('Taxa de absenteísmo', absenteismo, 'subtotal'),
    grupo('CUSTO (R$)'),
    linha('Proventos (bruto)', fs => r2(bruto(fs))),
    linha('FGTS 8%', fs => r2(fgts(fs))),
    linha('Custo total (bruto + FGTS)', custo, 'subtotal'),
    linha('Custo médio por pessoa', fs => (fs.length ? r2(custo(fs) / fs.length) : 0)),
    linha('Participação no custo total', fs => pct(custo(fs), custoTotal)),
  ];

  return {
    colunas: [
      { titulo: 'Indicador', tipo: 'texto', largura: 34 },
      ...blocos.map(b => ({ titulo: b.nome, tipo: 'moeda' as TipoColuna, largura: 15 })),
    ],
    linhas,
    destaques: [
      { rotulo: 'Pessoas no mês', valor: String(pessoas.length) },
      { rotulo: 'Mulheres', valor: pct(contaSexo(pessoas, 'F'), pessoas.length) },
      { rotulo: 'Absenteísmo', valor: absenteismo(pessoas) },
      { rotulo: 'Custo total (bruto + FGTS)', valor: custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    ],
    rodape: `Pessoas no mês = vínculo em algum dia de ${mm}/${c.ano} pelo cadastro (admissão/desligamento) ou com lançamento na folha. `
      + `Absenteísmo = (faltas em dias + dias de atestado + horas faltas ÷ 7h20) ÷ (pessoas × ${folha.diasUteis} dias úteis). `
      + 'Custo = prévia da folha (bruto + FGTS); encargos patronais e custo ÷ faturamento por setor entram quando houver a regra e o dado. '
      + 'Idade e tempo de casa contam só quem tem a data no cadastro.',
  };
}
