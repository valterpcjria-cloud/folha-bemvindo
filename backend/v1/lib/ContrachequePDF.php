<?php
// /backend/v1/lib/ContrachequePDF.php

require_once __DIR__ . '/tcpdf/tcpdf.php';

/**
 * Gerador de PDF — Contracheques (Demonstrativo de Pagamento de Salário)
 * 
 * Layout fiel ao modelo de referência:
 * - Blocos com bordas (tabela visual)
 * - 3 contracheques por página A4
 * - Linha pontilhada separadora (guia de corte)
 * - Fonte monospace (Courier)
 */
class ContrachequePDF extends TCPDF
{
    protected $empresa = [];
    protected $competencia = '';
    protected $tipoFolha = 'Mensal';

    // Layout (medidas em mm)
    const FONT = 'courier';
    const FONT_SIZE = 7;
    const FONT_SIZE_SM = 6;
    const FONT_SIZE_LG = 8;
    const LINE_H = 3.2;
    const MARGIN_L = 8;
    const MARGIN_R = 8;
    const MARGIN_T = 8;

    // Cada contracheque ocupa esta altura
    const BLOCO_HEIGHT = 88;
    const BLOCOS_POR_PAGINA = 3;

    // Largura útil da página
    const PAGE_W = 210;  // A4

    protected $blocoCount = 0;

    public function __construct($empresa, $competencia, $tipoFolha = 'Mensal')
    {
        parent::__construct('P', 'mm', 'A4', true, 'UTF-8');

        $this->empresa = $empresa;
        $this->competencia = $competencia;
        $this->tipoFolha = $tipoFolha;

        $this->SetCreator('Sistema Folha');
        $this->SetTitle("Contracheques - {$competencia}");
        $this->SetMargins(self::MARGIN_L, self::MARGIN_T, self::MARGIN_R);
        $this->SetAutoPageBreak(false);
        $this->setPrintHeader(false);
        $this->setPrintFooter(false);
    }

    // ============================================================
    // HELPERS
    // ============================================================
    protected function fmtMoney($valor)
    {
        return number_format((float)$valor, 2, ',', '.');
    }

    protected function larguraUtil()
    {
        return self::PAGE_W - self::MARGIN_L - self::MARGIN_R;
    }

    // ============================================================
    // CONTROLE DE POSIÇÃO — 3 por página
    // ============================================================
    protected function posicaoInicioBloco()
    {
        $indexNaPagina = $this->blocoCount % self::BLOCOS_POR_PAGINA;

        if ($indexNaPagina === 0) {
            // Nova página
            $this->AddPage();
        }

        $y = self::MARGIN_T + ($indexNaPagina * (self::BLOCO_HEIGHT + 4)); // 4mm de gap entre blocos
        return $y;
    }

    // ============================================================
    // IMPRIMIR UM CONTRACHEQUE
    // ============================================================
    public function printContracheque($func)
    {
        $y = $this->posicaoInicioBloco();
        $this->blocoCount++;

        $x = self::MARGIN_L;
        $w = $this->larguraUtil();
        $e = $this->empresa;

        // -------------------------------------------------------
        // CABEÇALHO DO CONTRACHEQUE (empresa + competência)
        // -------------------------------------------------------
        $headerH = self::LINE_H * 4;

        // Borda externa do cabeçalho
        $this->Rect($x, $y, $w, $headerH);

        // Lado esquerdo — dados da empresa
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE_LG);
        $this->SetXY($x + 1, $y + 0.5);
        $codEmpresa = $e['id_empresa_formated'] ?? $e['id'];
        $this->Cell($w * 0.55, self::LINE_H, "{$codEmpresa}-{$e['razao_social']}", 0, 0, 'L');

        // Lado direito — título
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE_LG);
        $this->SetXY($x + $w * 0.55, $y + 0.5);
        $this->Cell($w * 0.45 - 1, self::LINE_H, 'DEMONSTRATIVO DE PAGAMENTO DE SALÁRIO', 0, 0, 'R');

        // Linha 2 — endereço
        $this->SetFont(self::FONT, '', self::FONT_SIZE);
        $this->SetXY($x + 1, $y + self::LINE_H + 0.5);
        $this->Cell($w * 0.55, self::LINE_H, "{$e['razao_social']} - {$e['cidade']}-{$e['uf']}", 0, 0, 'L');

        // Linha 3 — CNPJ
        $this->SetXY($x + 1, $y + self::LINE_H * 2 + 0.5);
        $this->Cell($w * 0.55, self::LINE_H, "CNPJ: {$e['cnpj']}  |  CPF: {$func['info']['cpf']}", 0, 0, 'L');

        // Competência (lado direito)
        $this->SetFont(self::FONT, '', self::FONT_SIZE);
        $this->SetXY($x + $w * 0.7, $y + self::LINE_H * 2 + 0.5);
        $this->Cell(20, self::LINE_H, $this->competencia, 0, 0, 'C');
        $this->Cell(25, self::LINE_H, $this->tipoFolha, 0, 0, 'R');

        $y += $headerH;

        // -------------------------------------------------------
        // DADOS DO FUNCIONÁRIO (linha com CBO, Empresa, Local, etc.)
        // -------------------------------------------------------
        // Definir larguras das colunas
        $colCadas = 18;
        $colNome = $w * 0.38;
        $colCBO = 20;
        $colEmpresa = 18;
        $colLocal = 14;
        $colDepto = 22;
        $restW = $w - $colCadas - $colNome - $colCBO - $colEmpresa - $colLocal - $colDepto;

        // Cabeçalho da linha
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE_SM);

        $this->SetXY($x, $y);
        $this->Cell($colCadas, self::LINE_H, ' Cadas.', 1, 0, 'L');
        $this->Cell($colNome, self::LINE_H, ' Nome do Funcionário', 1, 0, 'L');
        $this->Cell($colCBO, self::LINE_H, 'CBO', 1, 0, 'C');
        $this->Cell($colEmpresa, self::LINE_H, 'Empresa', 1, 0, 'C');
        $this->Cell($colLocal, self::LINE_H, 'Local', 1, 0, 'C');
        $this->Cell($colDepto, self::LINE_H, 'Departamento', 1, 0, 'C');
        $this->Cell($restW, self::LINE_H, 'FL', 1, 1, 'C');

        // Dados
        $this->SetFont(self::FONT, '', self::FONT_SIZE);
        $this->SetX($x);
        $this->Cell($colCadas, self::LINE_H, ' ' . $func['info']['matricula'], 1, 0, 'L');
        $this->Cell($colNome, self::LINE_H, ' ' . mb_strtoupper($func['info']['nome']), 1, 0, 'L');
        $this->Cell($colCBO, self::LINE_H, $func['info']['cbo'], 1, 0, 'C');
        $this->Cell($colEmpresa, self::LINE_H, $codEmpresa, 1, 0, 'C');
        $this->Cell($colLocal, self::LINE_H, '1', 1, 0, 'C');
        $this->Cell($colDepto, self::LINE_H, $func['info']['departamento_codigo'] ?? '999', 1, 0, 'C');
        $this->Cell($restW, self::LINE_H, '01', 1, 1, 'C');

        $y = $this->GetY();

        // Cargo + Data Admissão
        $this->SetXY($x, $y);
        $cargo = $func['info']['cargo'] ?? 'Não Informado';
        $dataAdm = $func['info']['admissao'] ?? '--/--/----';
        $this->Cell($w, self::LINE_H, " {$cargo}           Data Admissão:{$dataAdm}", 1, 1, 'L');

        $y = $this->GetY();

        // -------------------------------------------------------
        // TABELA DE EVENTOS
        // -------------------------------------------------------
        $colEv = 14;
        $colDesc = $w * 0.42;
        $colRef = 22;
        $colProv = 25;
        $colDesconto = $w - $colEv - $colDesc - $colRef - $colProv;

        // Cabeçalho
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE_SM);
        $this->SetXY($x, $y);
        $this->Cell($colEv, self::LINE_H, ' Ev', 1, 0, 'L');
        $this->Cell($colDesc, self::LINE_H, ' Descrição', 1, 0, 'L');
        $this->Cell($colRef, self::LINE_H, 'Referência', 1, 0, 'C');
        $this->Cell($colProv, self::LINE_H, 'Proventos', 1, 0, 'C');
        $this->Cell($colDesconto, self::LINE_H, 'Descontos', 1, 1, 'C');

        $y = $this->GetY();

        // Número fixo de linhas de eventos para manter altura consistente
        $maxLinhas = 10;
        $this->SetFont(self::FONT, '', self::FONT_SIZE);

        $eventos = $func['eventos'];
        for ($i = 0; $i < $maxLinhas; $i++) {
            $this->SetX($x);
            if ($i < count($eventos)) {
                $ev = $eventos[$i];
                $this->Cell($colEv, self::LINE_H, $ev['codigo'], 'LR', 0, 'R');
                $this->Cell($colDesc, self::LINE_H, ' ' . $ev['nome'], 0, 0, 'L');
                $this->Cell($colRef, self::LINE_H, $ev['qtd'], 0, 0, 'R');
                
                $vProv = ($ev['tipo_num'] == 1) ? $this->fmtMoney($ev['valor']) : '';
                $vDesc = ($ev['tipo_num'] >= 3) ? $this->fmtMoney($ev['valor']) : '';
                
                $this->Cell($colProv, self::LINE_H, $vProv, 0, 0, 'R');
                $this->Cell($colDesconto, self::LINE_H, $vDesc, 'R', 1, 'R');
            } else {
                // Linha vazia (mantém a borda)
                $this->Cell($colEv, self::LINE_H, '', 'LR', 0, 'L');
                $this->Cell($colDesc, self::LINE_H, '', 0, 0, 'L');
                $this->Cell($colRef, self::LINE_H, '', 0, 0, 'L');
                $this->Cell($colProv, self::LINE_H, '', 0, 0, 'L');
                $this->Cell($colDesconto, self::LINE_H, '', 'R', 1, 'L');
            }
        }

        $y = $this->GetY();

        // -------------------------------------------------------
        // TOTAIS
        // -------------------------------------------------------
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE);

        // Linha Total
        $colTotalLabel = $colEv + $colDesc + $colRef;
        $this->SetXY($x, $y);
        $this->Cell($colTotalLabel, self::LINE_H, 'Total', 1, 0, 'R');
        $this->Cell($colProv, self::LINE_H, $this->fmtMoney($func['totais']['proventos']), 1, 0, 'R');
        $this->Cell($colDesconto, self::LINE_H, $this->fmtMoney($func['totais']['descontos']), 1, 1, 'R');

        // Linha Total Líquido
        $this->SetX($x);
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE_LG);
        $this->Cell($colTotalLabel, self::LINE_H + 1, 'TOTAL LÍQUIDO', 1, 0, 'R');
        $this->Cell($colProv + $colDesconto, self::LINE_H + 1, $this->fmtMoney($func['totais']['liquido']), 1, 1, 'R');

        $y = $this->GetY();

        // -------------------------------------------------------
        // RODAPÉ — Bases de cálculo
        // -------------------------------------------------------
        $this->SetFont(self::FONT, '', self::FONT_SIZE_SM);

        $colBase = $w / 7;

        // Cabeçalho bases
        $this->SetXY($x, $y);
        $this->SetFont(self::FONT, 'B', self::FONT_SIZE_SM);
        $this->Cell($colBase, self::LINE_H, 'Salário Base', 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, 'Sal Cont INSS', 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, 'Bas Cálc FGTS', 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, 'FGTS Mês', 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, 'Bas Cálc IRRF', 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, 'Faixa', 1, 0, 'C');
        $restBase = $w - ($colBase * 6);
        $this->Cell($restBase, self::LINE_H, 'Dep', 1, 1, 'C');

        // Valores bases
        $this->SetFont(self::FONT, '', self::FONT_SIZE_SM);
        $b = $func['bases'];
        $this->SetX($x);
        $this->Cell($colBase, self::LINE_H, $this->fmtMoney($func['info']['salario_base']), 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, $this->fmtMoney($b['inss']), 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, $this->fmtMoney($b['fgts']), 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, $this->fmtMoney($b['fgts'] * 0.08), 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, $this->fmtMoney($b['irrf']), 1, 0, 'C');
        $this->Cell($colBase, self::LINE_H, '0.0%', 1, 0, 'C');
        $this->Cell($restBase, self::LINE_H, str_pad((string)$func['info']['dep_ir'], 2, '0', STR_PAD_LEFT), 1, 1, 'C');

        $y = $this->GetY();

        // -------------------------------------------------------
        // LINHA DE ASSINATURA
        // -------------------------------------------------------
        $this->SetFont(self::FONT, '', self::FONT_SIZE);
        $this->SetXY($x, $y);
        $this->Cell($w, self::LINE_H + 2, '  Recebi em: ______________    Assinatura: ________________________________________', 1, 1, 'L');

        $y = $this->GetY();

        // -------------------------------------------------------
        // LINHA PONTILHADA (guia de corte) — exceto no último da página
        // -------------------------------------------------------
        $indexNaPagina = ($this->blocoCount) % self::BLOCOS_POR_PAGINA;
        if ($indexNaPagina !== 0) {
            $y += 1;
            $this->SetLineStyle(['width' => 0.2, 'dash' => '2,2']);
            $this->Line($x, $y, $x + $w, $y);
            $this->SetLineStyle(['width' => 0.2, 'dash' => 0]); // Reset para linha sólida
        }
    }

    // ============================================================
    // MÉTODO PRINCIPAL — GERAR TODOS OS CONTRACHEQUES
    // ============================================================
    public function gerar($funcionarios)
    {
        // Ordenar (já vem ordenado do banco, mas garantir)
        usort($funcionarios, function ($a, $b) {
            return strcasecmp($a['info']['nome'], $b['info']['nome']);
        });

        foreach ($funcionarios as $func) {
            $this->printContracheque($func);
        }
    }
}
