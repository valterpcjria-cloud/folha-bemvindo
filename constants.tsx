
import { EventType, Natureza, Unidade, EventoFolha } from './types';

export const MANDATORY_EVENTS: EventoFolha[] = [
  { id: 33, codigo_evento: 33, nome_evento: 'Salário', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 0 },
  { id: 1, codigo_evento: 883, nome_evento: 'Pontualidade', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 1 },
  { id: 2, codigo_evento: 88, nome_evento: 'Gratificação', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 2 },
  { id: 3, codigo_evento: 719, nome_evento: 'Prêmio Domingo', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 3 },
  { id: 4, codigo_evento: 49, nome_evento: 'Horas Extras 100%', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.HORA, obrigatorio: true, ordem_exportacao: 4 },
  { id: 59, codigo_evento: 59, nome_evento: 'DSR s/ Horas Extras Diurnas', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 5.5 },
  { id: 12, codigo_evento: 48, nome_evento: 'Horas Extras 50%', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.HORA, obrigatorio: true, ordem_exportacao: 5 },
  { id: 5, codigo_evento: 1080, nome_evento: 'Feriado Trabalhado', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.DIA, obrigatorio: true, ordem_exportacao: 6 },
  { id: 10, codigo_evento: 62, nome_evento: 'Insalubridade s/ Mínimo', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.PERCENTUAL, obrigatorio: true, ordem_exportacao: 7 },
  { id: 11, codigo_evento: 833, nome_evento: 'Prêmio Assiduidade', tipo: EventType.CREDITO, natureza: Natureza.PROVENTO, unidade: Unidade.PERCENTUAL, obrigatorio: true, ordem_exportacao: 8 },
  { id: 6, codigo_evento: 71, nome_evento: 'Faltas', tipo: EventType.DEBITO, natureza: Natureza.DESCONTO, unidade: Unidade.DIA, obrigatorio: true, ordem_exportacao: 9 },
  { id: 7, codigo_evento: 191, nome_evento: 'Desc Vale', tipo: EventType.DEBITO, natureza: Natureza.DESCONTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 10 },
  { id: 8, codigo_evento: 936, nome_evento: 'Mensalidade Sindical', tipo: EventType.DEBITO, natureza: Natureza.DESCONTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 11 },
  { id: 9, codigo_evento: 4004, nome_evento: 'Empréstimo Consignado', tipo: EventType.DEBITO, natureza: Natureza.DESCONTO, unidade: Unidade.VALOR, obrigatorio: true, ordem_exportacao: 12 },
];

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
