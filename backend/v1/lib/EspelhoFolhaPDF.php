<?php
// /backend/v1/lib/EspelhoFolhaPDF.php

// Carregar TCPDF manualmente (sem Composer)
require_once __DIR__ . '/tcpdf/tcpdf.php';

/**
 * Gerador de PDF — Espelho da Folha de Pagamento (Relação de Cálculo)
 * 
 * Layout fiel ao modelo de referência:
 * - Fonte monospace (Courier) para alinhamento em colunas
 * - Cabeçalho repetido em toda página
 * - Eventos em duas colunas: proventos (esquerda) x descontos (direita)
 * - Quebra de página inteligente (não corta bloco de funcionário)
 * - Resumos consolidados no final
 */
class EspelhoFolhaPDF extends TCPDF
{
    protected $empresa = [];
    protected $competenciaInicio = '';
    protected $competenciaFim = '';
    protected $tipoFolha = 'Mensal';
    protected $usuario = 'SISTEMA';
    protected $pageNum = 0;

    // Layout
    const FONT_NAME = 'courier';
    const FONT_SIZE = 7;
    const LINE_H = 3.2;          // Altura da linha em mm
    const COL_MEIO = 105;        // Metade da página (ponto de divisão proventos/descontos)
    const MARGIN_L = 8;
    const MARGIN_R = 8;
    const MARGIN_T = 8;
    const MARGIN_B = 12;

    public function __construct($empresa, $competenciaInicio, $competenciaFim, $tipoFolha, $usuario)
    {
        parent::__construct('P', 'mm', 'A4', true, 'UTF-8');

        $this->empresa = $empresa;
        $this->competenciaInicio = $competenciaInicio;
        $this->competenciaFim = $competenciaFim;
        $this->tipoFolha = $tipoFolha;
        $this->usuario = $usuario;

        $this->SetCreator('Sistema Folha Frimelo');
        $this->SetTitle('Relação de Cálculo - ' . $competenciaInicio . ' a ' . $competenciaFim);
        $this->SetMargins(self::MARGIN_L, self::MARGIN_T + 22, self::MARGIN_R); 
        $this->SetAutoPageBreak(false); 
        $this->SetFont(self::FONT_NAME, '', self::FONT_SIZE);
        $this->setPrintHeader(false);   
        $this->setPrintFooter(false);   
    }

    protected function printCabecalho()
    {
        $e = $this->empresa;
        $dataHora = date('d/m/Y H:i');
        $pag = 'Pág:' . str_pad((string)$this->pageNum, 4, '0', STR_PAD_LEFT);

        $y = self::MARGIN_T;

        $this->SetFont(self::FONT_NAME, '', self::FONT_SIZE);
        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Empresa: {$e['id_empresa_formated']} - {$e['razao_social']}", 0, 0, 'L');
        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "{$dataHora} {$pag}", 0, 0, 'R');
        $y += self::LINE_H;

        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Inscrição Federal: {$e['cnpj']}", 0, 0, 'L');
        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Telefone: " . ($e['telefone'] ?? '(61) 3621-4470'), 0, 0, 'R');
        $y += self::LINE_H;

        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Endereço: " . ($e['endereco'] ?? 'Rua BRASFRIGO 41, ZONA RURAL'), 0, 0, 'L');
        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Complemento: " . ($e['complemento'] ?? ''), 0, 0, 'R');
        $y += self::LINE_H;

        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Bairro: " . ($e['bairro'] ?? 'ZONA RURAL'), 0, 0, 'L');
        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Município: " . ($e['cidade'] ?? 'Luziânia') . " - " . ($e['uf'] ?? 'GO'), 0, 0, 'R');
        $y += self::LINE_H;

        $this->SetXY(self::MARGIN_L, $y);
        $this->Cell(0, self::LINE_H, "Relação de Cálculo - Período: {$this->competenciaInicio} a {$this->competenciaFim} - {$this->tipoFolha}", 0, 0, 'L');
        $y += self::LINE_H;

        $y += 1;
        $this->Line(self::MARGIN_L, $y, 210 - self::MARGIN_R, $y);
        $y += 2;

        $this->SetY($y);
    }

    protected function printRodape()
    {
        $this->SetFont(self::FONT_NAME, '', self::FONT_SIZE);
        $this->SetXY(self::MARGIN_L, 297 - self::MARGIN_B);
        $this->Cell(0, self::LINE_H, "Usuário: {$this->usuario}", 0, 0, 'R');
    }

    protected function novaPagina()
    {
        if ($this->pageNum > 0) {
            $this->printRodape();
        }
        $this->AddPage();
        $this->pageNum++;
        $this->printCabecalho();
    }

    protected function garantirEspaco($alturaNeeded)
    {
        $limiteY = 297 - self::MARGIN_B - 5; 
        if ($this->GetY() + $alturaNeeded > $limiteY) {
            $this->printRodape();
            $this->AddPage();
            $this->pageNum++;
            $this->printCabecalho();
        }
    }

    protected function fmtMoney($valor)
    {
        return number_format((float)$valor, 2, ',', '.');
    }

    protected function textoEsq($texto, $bold = false)
    {
        $this->SetFont(self::FONT_NAME, $bold ? 'B' : '', self::FONT_SIZE);
        $this->SetX(self::MARGIN_L);
        $this->Cell(0, self::LINE_H, $texto, 0, 1, 'L');
    }

    protected function textoPos($texto, $x, $y = null, $bold = false)
    {
        $this->SetFont(self::FONT_NAME, $bold ? 'B' : '', self::FONT_SIZE);
        if ($y !== null) {
            $this->SetXY($x, $y);
        } else {
            $this->SetX($x);
        }
        $this->Cell(0, self::LINE_H, $texto, 0, 0, 'L');
    }

    protected function textoDir($texto, $x, $largura, $y = null)
    {
        $this->SetFont(self::FONT_NAME, '', self::FONT_SIZE);
        if ($y !== null) {
            $this->SetXY($x, $y);
        } else {
            $this->SetX($x);
        }
        $this->Cell($largura, self::LINE_H, $texto, 0, 0, 'R');
    }

    protected function linhaSeparadora()
    {
        $y = $this->GetY();
        $this->Line(self::MARGIN_L, $y, 210 - self::MARGIN_R, $y);
    }

    public function printFuncionario($func)
    {
        $proventos = array_values(array_filter($func['eventos'], fn($e) => $e['tipo_num'] == 1));
        $descontos = array_values(array_filter($func['eventos'], fn($e) => $e['tipo_num'] == 3 || $e['tipo_num'] == 4));
        $maxEventos = max(count($proventos), count($descontos));

        $linhasDadosAdicionais = 0; 

        $alturaBloco = self::LINE_H * (
            3 +                      
            $linhasDadosAdicionais + 
            1 +                      
            $maxEventos +            
            2 +                      
            6 +                      
            2                        
        );

        $this->garantirEspaco($alturaBloco);

        $dem = $func['info']['demissao'] ?? '';
        $depIR = str_pad((string)$func['info']['dep_ir'], 2, '0', STR_PAD_LEFT);
        $depSF = str_pad((string)$func['info']['dep_sf'], 2, '0', STR_PAD_LEFT);
        $dedIR = $this->fmtMoney($func['info']['deducao_ir']);

        $this->SetFont(self::FONT_NAME, 'B', self::FONT_SIZE);
        $this->SetX(self::MARGIN_L);
        $this->Cell(0, self::LINE_H, "Func: {$func['info']['matricula']}  {$func['info']['nome']}    Adm {$func['info']['admissao']}  Dem {$dem}  Dep.IR: {$depIR}  Dedução IR.: {$dedIR}  Dep.SF: {$depSF}", 0, 1, 'L');

        $this->SetFont(self::FONT_NAME, '', self::FONT_SIZE);
        $this->SetX(self::MARGIN_L);
        $salario = $this->fmtMoney($func['info']['salario_base']);
        $this->Cell(0, self::LINE_H, "Cargo: {$func['info']['cargo']}  C.H.M: {$func['info']['chm']}  Salário: {$salario}  Cbo: {$func['info']['cbo']}  Sind: {$func['info']['sindicato']}  F.Reg:  Situação: Trabalhando", 0, 1, 'L');

        $this->SetX(self::MARGIN_L);
        $this->Cell(0, self::LINE_H, "Filial: 0001 - CNPJ/CPF: {$this->empresa['cnpj']}  Organograma: 999 - {$func['info']['departamento']}", 0, 1, 'L');

        $this->textoEsq("Tipo Aula: 0 - Sem Tipo Aula");

        $colEsqX = self::MARGIN_L;
        $colEsqValX = self::COL_MEIO - 8;    
        $colDirX = self::COL_MEIO + 2;        
        $colDirValX = 210 - self::MARGIN_R;   

        for ($i = 0; $i < $maxEventos; $i++) {
            $y = $this->GetY();

            if ($i < count($proventos)) {
                $ev = $proventos[$i];
                $codStr = str_pad((string)$ev['codigo'], 4, ' ', STR_PAD_LEFT);
                $qtdStr = !empty($ev['qtd']) ? "  {$ev['qtd']} {$ev['unid']}" : '';
                $textoEv = "{$codStr} {$ev['tipo_num']} {$ev['nome']}{$qtdStr}";
                $this->textoPos($textoEv, $colEsqX, $y);
                $this->textoDir($this->fmtMoney($ev['valor']), $colEsqValX - 25, 25, $y);
            }

            if ($i < count($descontos)) {
                $ev = $descontos[$i];
                $codStr = str_pad((string)$ev['codigo'], 4, ' ', STR_PAD_LEFT);
                $qtdStr = !empty($ev['qtd']) ? "  {$ev['qtd']} {$ev['unid']}" : '';
                $textoEv = "{$codStr} {$ev['tipo_num']} {$ev['nome']}{$qtdStr}";
                $this->textoPos($textoEv, $colDirX, $y);
                $this->textoDir($this->fmtMoney($ev['valor']), $colDirValX - 25, 25, $y);
            }

            $this->SetY($y + self::LINE_H);
        }

        $this->Ln(1);
        $this->linhaSeparadora();
        $this->Ln(1);
        $prov = $this->fmtMoney($func['totais']['proventos']);
        $vant = $this->fmtMoney(0);
        $desc = $this->fmtMoney($func['totais']['descontos']);
        $liq  = $this->fmtMoney($func['totais']['liquido']);
        $this->SetFont(self::FONT_NAME, 'B', self::FONT_SIZE);
        $this->SetX(self::MARGIN_L);
        $this->Cell(0, self::LINE_H, "Proventos: {$prov}    Vantagens: {$vant}    Descontos: {$desc}    Líquido: {$liq}", 0, 1, 'L');
        $this->Ln(1);

        $this->printBasesImpostos($func['bases']);

        $this->Ln(2);
        $this->linhaSeparadora();
        $this->Ln(2);
    }

    protected function printBasesImpostos($base)
    {
        $this->SetFont(self::FONT_NAME, 'B', self::FONT_SIZE);
        $this->textoEsq('Base Impostos', true);

        $this->SetFont(self::FONT_NAME, '', self::FONT_SIZE);
        $y = $this->GetY();

        $c0 = self::MARGIN_L;       
        $c1 = $c0 + 32;             
        $c2 = $c1 + 24;             
        $c3 = $c2 + 21;             
        $c4 = $c3 + 21;             
        $c5 = $c4 + 27;             
        $c6 = $c5 + 24;             
        $c7 = $c6 + 24;             
        $cw = 21; 

        $this->textoPos('', $c0, $y);
        $this->textoPos('Normal', $c1, $y);
        $this->textoPos('13º', $c2, $y);
        $this->textoPos('Férias', $c3, $y);
        $this->textoPos('Lucro', $c4, $y);
        $this->textoPos('', $c5, $y);
        $this->textoPos('Base', $c6, $y);
        $this->textoPos('Valor', $c7, $y);
        $y += self::LINE_H;

        $this->textoPos('IRRF', $c0, $y);
        $this->textoDir($this->fmtMoney($base['irrf']), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c4, $cw, $y);
        $this->textoPos('FGTS GFIP', $c5, $y);
        $this->textoDir($this->fmtMoney($base['fgts']), $c6, $cw, $y);
        $this->textoDir($this->fmtMoney($base['fgts'] * 0.08), $c7, $cw, $y);
        $y += self::LINE_H;

        $this->textoPos('INSS', $c0, $y);
        $this->textoDir($this->fmtMoney($base['inss']), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoPos('FGTS GRRF', $c5, $y);
        $this->textoDir($this->fmtMoney(0), $c6, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c7, $cw, $y);
        $y += self::LINE_H;

        $this->textoPos('INSS Empresa', $c0, $y);
        $this->textoDir($this->fmtMoney($base['inss'] ), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoPos('PIS', $c5, $y);
        $this->textoDir($this->fmtMoney(0), $c6, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c7, $cw, $y);
        $y += self::LINE_H;

        $this->textoPos('Base Dif. Teto    V.A. 0,00', $c0, $y);
        $y += self::LINE_H;

        $this->SetY($y);
    }

    public function printResumoContrato($funcionarios)
    {
        $this->novaPagina();
        $e = $this->empresa;
        $this->textoEsq("{$e['id_empresa_formated']} - {$e['razao_social']}", true);
        $this->textoEsq('Resumo Contrato', true);
        $this->Ln(self::LINE_H);

        $consolidado = [];
        foreach ($funcionarios as $func) {
            foreach ($func['eventos'] as $ev) {
                $cod = $ev['codigo'];
                if (!isset($consolidado[$cod])) {
                    $consolidado[$cod] = [
                        'evento' => $ev,
                        'total_valor' => 0
                    ];
                }
                $consolidado[$cod]['total_valor'] += $ev['valor'];
            }
        }

        $provConsolidado = array_values(array_filter($consolidado, fn($c) => $c['evento']['tipo_num'] == 1));
        $descConsolidado = array_values(array_filter($consolidado, fn($c) => $c['evento']['tipo_num'] == 3 || $c['evento']['tipo_num'] == 4));
        usort($provConsolidado, fn($a, $b) => (int)$a['evento']['codigo'] - (int)$b['evento']['codigo']);
        usort($descConsolidado, fn($a, $b) => (int)$a['evento']['codigo'] - (int)$b['evento']['codigo']);

        $maxLinhas = max(count($provConsolidado), count($descConsolidado));

        for ($i = 0; $i < $maxLinhas; $i++) {
            $this->garantirEspaco(self::LINE_H);
            $y = $this->GetY();

            if ($i < count($provConsolidado)) {
                $c = $provConsolidado[$i];
                $codStr = str_pad((string)$c['evento']['codigo'], 4, ' ', STR_PAD_LEFT);
                $this->textoPos("{$codStr} {$c['evento']['tipo_num']} {$c['evento']['nome']}", self::MARGIN_L, $y);
                $this->textoDir($this->fmtMoney($c['total_valor']), self::COL_MEIO - 33, 25, $y);
            }
            if ($i < count($descConsolidado)) {
                $c = $descConsolidado[$i];
                $codStr = str_pad((string)$c['evento']['codigo'], 4, ' ', STR_PAD_LEFT);
                $this->textoPos("{$codStr} {$c['evento']['tipo_num']} {$c['evento']['nome']}", self::COL_MEIO + 2, $y);
                $this->textoDir($this->fmtMoney($c['total_valor']), 210 - self::MARGIN_R - 25, 25, $y);
            }
            $this->SetY($y + self::LINE_H);
        }

        $totalProv = array_sum(array_column(array_column($funcionarios, 'totais'), 'proventos'));
        $totalDesc = array_sum(array_column(array_column($funcionarios, 'totais'), 'descontos'));
        $totalLiq  = $totalProv - $totalDesc;

        $this->Ln(2);
        $this->linhaSeparadora();
        $this->Ln(2);
        $this->textoEsq("Totais", true);
        $this->textoEsq("Proventos: {$this->fmtMoney($totalProv)}    Vantagens: {$this->fmtMoney(0)}    Descontos: {$this->fmtMoney($totalDesc)}    Líquido: {$this->fmtMoney($totalLiq)}", true);
        $this->Ln(self::LINE_H);

        $totalDepIR = array_sum(array_column(array_column($funcionarios, 'info'), 'dep_ir'));
        $totalDedIR = array_sum(array_column(array_column($funcionarios, 'info'), 'deducao_ir'));
        $this->textoEsq("Dependentes SF 0    Dependentes IR {$totalDepIR}    Dedução do IRRF {$this->fmtMoney($totalDedIR)}    Total Funcionários " . count($funcionarios));
        $this->Ln(self::LINE_H * 2);
    }
    public function printResumoSituacao($funcionarios)
    {
        $this->garantirEspaco(self::LINE_H * 6);
        $this->textoEsq('Resumo Situação', true);
        $this->Ln(1);
        $this->textoPos('Trabalhando:', self::MARGIN_L);
        $this->textoDir((string)count($funcionarios), 90, 20);
        $this->Ln(self::LINE_H);
        $this->textoPos('Total Geral:', self::MARGIN_L);
        $this->textoDir((string)count($funcionarios), 90, 20);
        $this->Ln(self::LINE_H * 2);
    }

    protected function printResumoFGTS($funcionarios)
    {
        $this->garantirEspaco(self::LINE_H * 14);
        $this->textoEsq('Resumo FGTS', true);
        $this->Ln(1);

        $y = $this->GetY();
        $c0 = self::MARGIN_L;
        $c1 = 90;  // Base
        $c2 = 120; // Valores FGTS
        $c3 = 150; // Contrib.Social
        $c4 = 175; // Total
        $cw = 25;

        // Cabeçalho
        $this->textoPos('', $c0, $y, true);
        $this->textoPos('Base', $c1, $y, true);
        $this->textoPos('Valores FGTS', $c2, $y, true);
        $this->textoPos('Contrib.Social', $c3, $y, true);
        $this->textoPos('Total', $c4, $y, true);
        $y += self::LINE_H;
        $this->SetY($y);
        $this->linhaSeparadora();
        $y += 1;

        // Calcular totais FGTS
        $baseGfip = 0;
        $valorGfip = 0;
        $baseGrrf = 0;
        $valorGrrf = 0;
        foreach ($funcionarios as $f) {
            $baseGfip += $f['bases']['fgts'] ?? 0;
            $valorGfip += ($f['bases']['fgts'] ?? 0) * 0.08;
        }

        // Base FGTS Normal (GFIP)
        $this->textoPos('Base FGTS Normal (GFIP):', $c0, $y);
        $this->textoDir($this->fmtMoney($baseGfip), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney($valorGfip), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoDir($this->fmtMoney($valorGfip), $c4, $cw, $y);
        $y += self::LINE_H;

        // 13o
        $this->textoPos('13º Salário (GFIP):', $c0, $y);
        $this->textoDir($this->fmtMoney(0), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c4, $cw, $y);
        $y += self::LINE_H;

        // Total Sefip
        $this->SetY($y);
        $this->linhaSeparadora();
        $y += 1;
        $this->textoPos('Total Recolhido em Sefip:', $c0, $y, true);
        $this->textoDir($this->fmtMoney($baseGfip), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney($valorGfip), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoDir($this->fmtMoney($valorGfip), $c4, $cw, $y);
        $y += self::LINE_H;

        // Rescisão
        $this->textoPos('Rescisão (GRRF):', $c0, $y);
        $this->textoDir($this->fmtMoney($baseGrrf), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney($valorGrrf), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoDir($this->fmtMoney($valorGrrf), $c4, $cw, $y);
        $y += self::LINE_H;

        // Total FGTS
        $this->SetY($y);
        $this->linhaSeparadora();
        $y += 1;
        $totalBaseFgts = $baseGfip + $baseGrrf;
        $totalValorFgts = $valorGfip + $valorGrrf;
        $this->textoPos('Total FGTS', $c0, $y, true);
        $this->textoDir($this->fmtMoney($totalBaseFgts), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney($totalValorFgts), $c2, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c3, $cw, $y);
        $this->textoDir($this->fmtMoney($totalValorFgts), $c4, $cw, $y);
        $y += self::LINE_H * 2;

        $this->SetY($y);
    }

    protected function printResumoIRRF($funcionarios)
    {
        $this->garantirEspaco(self::LINE_H * 12);
        $this->textoEsq('Resumo IRRF', true);
        $this->Ln(1);

        $y = $this->GetY();
        $c0 = self::MARGIN_L;
        $c1 = 90;
        $c2 = 130;
        $cw = 30;

        $this->textoPos('', $c0, $y, true);
        $this->textoPos('Base', $c1, $y, true);
        $this->textoPos('Valores', $c2, $y, true);
        $y += self::LINE_H;
        $this->SetY($y);
        $this->linhaSeparadora();
        $y += 1;

        // Calcular
        $baseNormal = 0;
        $baseFerias = 0;
        foreach ($funcionarios as $f) {
            $baseNormal += $f['bases']['irrf'] ?? 0;
        }

        $linhas = [
            ['Base IRRF Normal', $baseNormal, 0],
            ['Rescisão', 0, 0],
            ['Férias', $baseFerias, 0],
            ['13º', 0, 0],
            ['Lucro', 0, 0],
        ];

        foreach ($linhas as $l) {
            $this->textoPos($l[0], $c0, $y);
            $this->textoDir($this->fmtMoney($l[1]), $c1, $cw, $y);
            $this->textoDir($this->fmtMoney($l[2]), $c2, $cw, $y);
            $y += self::LINE_H;
        }

        $this->SetY($y);
        $this->linhaSeparadora();
        $y += 1;
        $this->textoPos('Total IRRF', $c0, $y, true);
        $this->textoDir($this->fmtMoney($baseNormal + $baseFerias), $c1, $cw, $y);
        $this->textoDir($this->fmtMoney(0), $c2, $cw, $y);
        $y += self::LINE_H * 2;

        $this->SetY($y);
    }

    public function gerar($funcionarios)
    {
        $this->novaPagina();
        $e = $this->empresa;
        $this->textoEsq("{$e['id_empresa_formated']} - {$e['razao_social']}", true);
        $this->textoEsq('Analítico Contratos');
        $this->Ln(self::LINE_H);

        foreach ($funcionarios as $func) {
            $this->printFuncionario($func);
        }

        $this->printResumoContrato($funcionarios);
        $this->printRodape();
    }
}
