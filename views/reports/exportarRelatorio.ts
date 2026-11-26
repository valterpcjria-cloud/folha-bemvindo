/**
 * Bem Vindo v1.3.0: exportação genérica dos relatórios do DP em Excel (.xlsx), CSV e PDF.
 * Cada relatório monta colunas + linhas; esta função só formata o arquivo.
 */
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { decimalToHM } from '../../utils/timeHM';

export type TipoColuna = 'texto' | 'moeda' | 'qtd' | 'hora'; // hora = horas decimais exibidas em H:MM
export type FormatoExportacao = 'xlsx' | 'csv' | 'pdf';

export interface ColunaRelatorio {
  titulo: string;
  tipo: TipoColuna;
  largura?: number; // em caracteres (Excel)
}

export type Celula = string | number | null;

export interface LinhaRelatorio {
  celulas: Celula[];
  estilo?: 'grupo' | 'subtotal' | 'total';
}

export interface RelatorioParaExportar {
  arquivo: string;     // nome sem extensão
  titulo: string;
  subtitulo: string;   // empresa · competência
  colunas: ColunaRelatorio[];
  linhas: LinhaRelatorio[];
  rodape?: string;
  paisagem?: boolean;
}

const fmt = (v: number, dec = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtQtd = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function formatarCelula(c: Celula, tipo: TipoColuna): string {
  if (c === null || c === undefined || c === '') return '';
  if (typeof c === 'string') return c;
  if (tipo === 'hora') return decimalToHM(c);
  return tipo === 'qtd' ? fmtQtd(c) : tipo === 'moeda' ? fmt(c) : String(c);
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportarXlsx(r: RelatorioParaExportar) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(r.titulo.slice(0, 31));
  ws.addRow([r.titulo]).font = { bold: true, size: 14 };
  ws.addRow([r.subtitulo]).font = { color: { argb: 'FF475569' } };
  ws.addRow([]);
  const head = ws.addRow(r.colunas.map(c => c.titulo));
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  r.colunas.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.largura ?? (c.tipo === 'texto' ? 28 : 13);
    if (c.tipo === 'moeda') col.numFmt = '#,##0.00';
    if (c.tipo === 'qtd') col.numFmt = '#,##0.##';
    if (c.tipo === 'hora') col.alignment = { horizontal: 'right' };
  });
  for (const l of r.linhas) {
    const row = ws.addRow(l.celulas.map((c, i) =>
      c === '' ? null : r.colunas[i]?.tipo === 'hora' && typeof c === 'number' ? decimalToHM(c) : c));
    if (l.estilo) {
      row.font = { bold: true };
      const cor = l.estilo === 'grupo' ? 'FFE0F2FE' : l.estilo === 'subtotal' ? 'FFF1F5F9' : 'FFCBD5E1';
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cor } };
      });
    }
  }
  if (r.rodape) {
    ws.addRow([]);
    ws.addRow([r.rodape]).font = { italic: true, color: { argb: 'FF64748B' } };
  }
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  const buf = await wb.xlsx.writeBuffer();
  baixar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${r.arquivo}.xlsx`);
}

function exportarCsv(r: RelatorioParaExportar) {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const linhas = [
    r.colunas.map(c => esc(c.titulo)).join(';'),
    ...r.linhas.map(l => l.celulas.map((c, i) => esc(formatarCelula(c, r.colunas[i]?.tipo ?? 'texto'))).join(';')),
  ];
  baixar(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${r.arquivo}.csv`);
}

function exportarPdf(r: RelatorioParaExportar) {
  const doc = new jsPDF({ orientation: r.paisagem === false ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(r.titulo, 10, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(r.subtitulo, 10, 18);
  const emitido = `Emitido em ${new Date().toLocaleString('pt-BR')}`;
  doc.text(emitido, largura - 10 - doc.getTextWidth(emitido), 18);

  const muitasColunas = r.colunas.length > 14;
  autoTable(doc, {
    startY: 22,
    head: [r.colunas.map(c => c.titulo)],
    body: r.linhas.map(l => l.celulas.map((c, i) => formatarCelula(c, r.colunas[i]?.tipo ?? 'texto'))),
    theme: 'grid',
    margin: { left: 8, right: 8 },
    styles: { fontSize: muitasColunas ? 5.5 : 7, cellPadding: 1, overflow: 'linebreak' },
    headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    columnStyles: Object.fromEntries(r.colunas.map((c, i) => [i, { halign: c.tipo === 'texto' ? 'left' : 'right' }])),
    didParseCell: data => {
      if (data.section !== 'body') return;
      const estilo = r.linhas[data.row.index]?.estilo;
      if (!estilo) return;
      data.cell.styles.fontStyle = 'bold';
      data.cell.styles.fillColor = estilo === 'grupo' ? [224, 242, 254] : estilo === 'subtotal' ? [241, 245, 249] : [203, 213, 225];
    },
    didDrawPage: () => {
      const n = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.text(`Folha Bem Vindo · página ${n}`, 10, doc.internal.pageSize.getHeight() - 5);
    },
  });
  if (r.rodape) {
    const y = (doc as any).lastAutoTable?.finalY ?? 30;
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(r.rodape, largura - 20), 10, Math.min(y + 6, doc.internal.pageSize.getHeight() - 10));
  }
  doc.save(`${r.arquivo}.pdf`);
}

export async function exportarRelatorio(r: RelatorioParaExportar, formato: FormatoExportacao) {
  if (formato === 'xlsx') return exportarXlsx(r);
  if (formato === 'csv') return exportarCsv(r);
  return exportarPdf(r);
}
