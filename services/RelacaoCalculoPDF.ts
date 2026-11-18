import { jsPDF } from 'jspdf';
import { formatCurrency } from '../utils/dataHelpers';

export interface RelacaoCalculoData {
  empresa: any;
  competencia: string;
  data: any[];
  gerado_em: string;
}

export class RelacaoCalculoPDF {
  private doc: jsPDF;
  private currentY: number = 0;
  private readonly margin: number = 10;
  private readonly pageWidth: number = 210; // A4
  private readonly pageHeight: number = 297;
  private pageNumber: number = 1;

  constructor() {
    this.doc = new jsPDF();
    this.doc.setFont('Courier');
    this.doc.setFontSize(8);
  }

  public async generate(data: RelacaoCalculoData) {
    this.drawHeader(data);

    for (const funcionario of data.data) {
      this.checkNewPage(40, data); // Pass data for header repetition
      this.drawEmployeeHeader(funcionario);
      this.drawEvents(funcionario);
      this.drawEmployeeFooter(funcionario);
      this.currentY += 5; // Espaço entre funcionários
    }

    this.drawSummarySections(data);

    this.doc.save(`Relacao_Calculo_${data.competencia.replace('/', '_')}.pdf`);
  }

  private drawHeader(data: RelacaoCalculoData, isSummary: boolean = false) {
    const { empresa, competencia, gerado_em } = data;
    this.currentY = this.margin;

    this.doc.setFont('Courier', 'bold');
    this.doc.setFontSize(8);
    
    // Linha 1: Empresa e Título
    this.doc.text((empresa.razao_social || '').substring(0, 40), this.margin, this.currentY);
    this.doc.text(isSummary ? "RESUMO GERAL DA FOLHA" : "RELAÇÃO DE CÁLCULO MENSAL", this.pageWidth / 2, this.currentY, { align: 'center' });
    this.doc.text(`FOLHA: ${competencia}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

    this.currentY += 4;
    // Linha 2: Endereço e Emissão
    const endereco = `${empresa.logradouro || 'Rua BRASFRIGO 41'}, ${empresa.bairro || 'ZONA RURAL'} - ${empresa.cidade || 'Luziânia'}/${empresa.uf || 'GO'}`;
    this.doc.setFont('Courier', 'normal');
    this.doc.text(endereco, this.margin, this.currentY);
    this.doc.text(`Emissão: ${gerado_em}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

    this.currentY += 4;
    // Linha 3: CNPJ e Página
    this.doc.text(`CNPJ: ${empresa.cnpj || '19.953.437/0001-78'}  Tel: ${empresa.telefone || '(61) 3621-4470'}`, this.margin, this.currentY);
    this.doc.text(`Pág: ${this.pageNumber}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

    this.currentY += 2;
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;
  }

  private drawEmployeeHeader(func: any) {
    const info = func.info;
    this.doc.setFont('Courier', 'bold');
    this.doc.text(`${info.matricula.toString().padStart(5, '0')} ${info.nome}`, this.margin, this.currentY);
    
    this.doc.setFont('Courier', 'normal');
    this.currentY += 4;
    const line1 = `Admissão: ${info.admissao}  Cargo: ${info.cargo}  CBO: ${info.cbo}  CHM: ${info.chm}`;
    this.doc.text(line1, this.margin, this.currentY);

    this.currentY += 4;
    const line2 = `Sindicato: ${info.sindicato}  Dep.IR: ${info.dep_ir}  Dep.SF: ${info.dep_sf}  Deduc.IR: ${formatCurrency(info.deducao_ir)}`;
    this.doc.text(line2, this.margin, this.currentY);

    this.currentY += 2;
    this.doc.setLineDashPattern([1, 1], 0);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.doc.setLineDashPattern([], 0);
    this.currentY += 4;
  }

  private drawEvents(func: any) {
    const proventos = func.eventos.filter((e: any) => e.tipo_num === 1);
    const descontos = func.eventos.filter((e: any) => e.tipo_num === 3);
    const informativos = func.eventos.filter((e: any) => e.tipo_num === 4);

    const maxLines = Math.max(proventos.length, descontos.length + informativos.length);
    const colWidth = (this.pageWidth - (2 * this.margin)) / 2;

    for (let i = 0; i < maxLines; i++) {
        this.checkNewPage(5);
        
        // Coluna Proventos (Esquerda)
        if (proventos[i]) {
            const e = proventos[i];
            const text = `${e.codigo.toString().padStart(4, '0')} ${e.nome.substring(0, 20).padEnd(20, ' ')} ${formatCurrency(e.valor).padStart(12, ' ')}`;
            this.doc.text(text, this.margin, this.currentY);
        }

        // Coluna Descontos/Informativos (Direita)
        const dIndex = i;
        const eD = descontos[dIndex] || informativos[dIndex - descontos.length];
        if (eD) {
            const text = `${eD.codigo.toString().padStart(4, '0')} ${eD.nome.substring(0, 20).padEnd(20, ' ')} ${formatCurrency(eD.valor).padStart(12, ' ')}`;
            this.doc.text(text, this.margin + colWidth, this.currentY);
        }

        this.currentY += 4;
    }
  }

  private drawEmployeeFooter(func: any) {
    this.checkNewPage(15);
    this.doc.setLineDashPattern([1, 1], 0);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.doc.setLineDashPattern([], 0);
    this.currentY += 4;

    const bases = func.bases;
    const totais = func.totais;

    const lineBases = `Base INSS: ${formatCurrency(bases.inss).padStart(10)}  Base FGTS: ${formatCurrency(bases.fgts).padStart(10)}  Base IRRF: ${formatCurrency(bases.irrf).padStart(10)}`;
    this.doc.text(lineBases, this.margin, this.currentY);

    this.currentY += 4;
    const lineTotais = `Total Proventos: ${formatCurrency(totais.proventos).padStart(10)}  Total Descontos: ${formatCurrency(totais.descontos).padStart(10)}  Líquido: ${formatCurrency(totais.liquido).padStart(10)}`;
    this.doc.setFont('Courier', 'bold');
    this.doc.text(lineTotais, this.margin, this.currentY);
    this.doc.setFont('Courier', 'normal');

    this.currentY += 4;
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  private drawSummarySections(data: RelacaoCalculoData) {
    this.doc.addPage();
    this.pageNumber++;
    this.drawHeader(data, true);
    
    this.doc.setFontSize(9);
    this.doc.setFont('Courier', 'bold');
    this.doc.text("RESUMO CONSOLIDADO DA EMPRESA", this.pageWidth / 2, this.currentY, { align: 'center' });
    this.doc.setFontSize(8);
    this.currentY += 10;

    // Cálculo dos totais globais
    let totalProventos = 0;
    let totalDescontos = 0;
    let totalFGTSBase = 0;
    let totalINSSBase = 0;
    let totalIRRFBase = 0;
    let totalFuncs = data.data.length;

    data.data.forEach(f => {
        totalProventos += f.totais.proventos;
        totalDescontos += f.totais.descontos;
        totalFGTSBase += f.bases.fgts;
        totalINSSBase += f.bases.inss;
        totalIRRFBase += f.bases.irrf;
    });

    const rows = [
        ["TOTAL DE FUNCIONÁRIOS", totalFuncs.toString()],
        ["TOTAL DE PROVENTOS", formatCurrency(totalProventos)],
        ["TOTAL DE DESCONTOS", formatCurrency(totalDescontos)],
        ["VALOR LÍQUIDO GERAL", formatCurrency(totalProventos - totalDescontos)],
        ["", ""],
        ["TOTAL BASE FGTS", formatCurrency(totalFGTSBase)],
        ["VLR FGTS A RECOLHER (8%)", formatCurrency(totalFGTSBase * 0.08)],
        ["TOTAL BASE INSS MENSAL", formatCurrency(totalINSSBase)],
        ["TOTAL BASE IRRF MENSAL", formatCurrency(totalIRRFBase)]
    ];

    rows.forEach(row => {
        this.doc.text(row[0], this.margin, this.currentY);
        this.doc.text(row[1], this.pageWidth - this.margin, this.currentY, { align: 'right' });
        this.currentY += 5;
    });

    this.currentY += 15;
    this.doc.setLineDashPattern([2, 2], 0);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.doc.setLineDashPattern([], 0);
    this.currentY += 10;
    
    this.doc.text("Eu confirmo que os dados acima representam fielmente o cálculo mensal desta competência.", this.margin, this.currentY);
    this.currentY += 15;
    this.doc.text("__________________________________________", this.margin, this.currentY);
    this.doc.text("Assinatura do Responsável / RH", this.margin, this.currentY + 5);
  }

  private checkNewPage(neededHeight: number, data?: RelacaoCalculoData) {
    if (this.currentY + neededHeight > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.pageNumber++;
      this.currentY = this.margin;
      if (data) {
          this.drawHeader(data);
      }
    }
  }
}
