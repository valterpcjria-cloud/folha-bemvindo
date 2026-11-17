<?php
// /backend/v1/routes/pdf_relatorio.php

require_once __DIR__ . '/../lib/EspelhoFolhaPDF.php';
require_once __DIR__ . '/../lib/EspelhoFolhaResumo.php';

// Endpoint handles logic for PDF generation
// Expects: POST { competencia: "MM/YYYY", tipo_folha: "Mensal", funcionario_ids: [1,2,3], resumo_apenas: false }

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $empresa_id = $authUser['id_empresa'];
    $competencia_str = $input['competencia'] ?? '';
    $tipo_folha = $input['tipo_folha'] ?? 'Mensal';
    $usuario = $authUser['nome'] ?? 'SISTEMA';
    $funcionario_ids = $input['funcionario_ids'] ?? null;
    $resumo_apenas = $input['resumo_apenas'] ?? false;

    if (empty($competencia_str)) {
        http_response_code(400);
        echo json_encode(['error' => 'Competencia é obrigatória']);
        exit;
    }

    // 1. Buscar período da competência
    $parts = explode('/', $competencia_str);
    $mes = (int)$parts[0];
    $ano = (int)$parts[1];

    // 2. Dados da Empresa
    $stmt_emp = $conn->prepare("SELECT *, LPAD(id, 4, '0') as id_empresa_formated FROM empresas WHERE id = ?");
    $stmt_emp->execute([$empresa_id]);
    $empresa = $stmt_emp->fetch();

    // 3. Competência ID
    $stmt_comp = $conn->prepare("SELECT id FROM competencias WHERE mes = ? AND ano = ? AND id_empresa = ?");
    $stmt_comp->execute([$mes, $ano, $empresa_id]);
    $comp = $stmt_comp->fetch();

    if (!$comp) {
        http_response_code(404);
        echo json_encode(["error" => "Competência não encontrada para este período."]);
        exit;
    }
    $id_competencia = $comp['id'];

    // 4. Buscar funcionários e lançamentos
    $sql_filter = "";
    $params = [$id_competencia, $empresa_id];

    if (!empty($funcionario_ids) && is_array($funcionario_ids)) {
        $placeholders = str_repeat('?,', count($funcionario_ids) - 1) . '?';
        $sql_filter = " AND f.id IN ($placeholders)";
        $params = array_merge($params, $funcionario_ids);
    }

    $query = "
        SELECT 
            f.id as id_funcionario,
            f.id_contrato,
            f.nome as nome_funcionario,
            f.cpf,
            f.data_admissao,
            f.data_demissao,
            f.cargo,
            f.cbo,
            f.carga_horaria,
            f.sindicato_codigo,
            f.dep_ir,
            f.dep_sf,
            f.deducao_ir,
            f.salario_base,
            e.codigo_evento,
            e.nome_evento,
            e.tipo,
            e.unidade,
            e.incide_inss,
            e.incide_fgts,
            e.incide_irrf,
            le.quantidade,
            le.valor_total,
            f.departamento
        FROM funcionarios f
        LEFT JOIN lancamentos_eventos le ON f.id = le.funcionario_id AND le.competencia_id = ?
        LEFT JOIN eventos_folha e ON le.evento_id = e.id
        WHERE f.id_empresa = ? $sql_filter
        ORDER BY f.nome ASC, e.tipo ASC, e.codigo_evento ASC
    ";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // 5. Mapear dados para o formato do PDF
    $reportData = [];
    foreach ($rows as $row) {
        $fid = $row['id_funcionario'];
        if (!isset($reportData[$fid])) {
            $reportData[$fid] = [
                "info" => [
                    "matricula" => (string)$row['id_contrato'],
                    "nome" => $row['nome_funcionario'],
                    "admissao" => $row['data_admissao'] ? date('d/m/Y', strtotime($row['data_admissao'])) : '',
                    "demissao" => $row['data_demissao'] ? date('d/m/Y', strtotime($row['data_demissao'])) : '',
                    "cargo" => $row['cargo'],
                    "chm" => $row['carga_horaria'] ?? '220:00',
                    "cbo" => $row['cbo'] ?? '',
                    "sindicato" => $row['sindicato_codigo'] ?? '0066',
                    "dep_ir" => $row['dep_ir'] ?? 0,
                    "dep_sf" => $row['dep_sf'] ?? 0,
                    "deducao_ir" => (float)($row['deducao_ir'] ?? 0),
                    "salario_base" => (float)($row['salario_base'] ?? 0),
                    "departamento" => $row['departamento'] ?? 'Geral'
                ],
                "eventos" => [],
                "bases" => [
                    "inss" => 0,
                    "fgts" => 0,
                    "irrf" => 0
                ],
                "totais" => [
                    "proventos" => 0,
                    "descontos" => 0,
                    "liquido" => 0
                ]
            ];
        }

        if ($row['codigo_evento']) {
            $valor = (float)$row['valor_total'];
            $evento = [
                "codigo" => $row['codigo_evento'],
                "nome" => $row['nome_evento'],
                "tipo_num" => ($row['tipo'] == 'CREDITO' ? 1 : ($row['tipo'] == 'DEBITO' ? 3 : 4)),
                "qtd" => $row['quantidade'],
                "unid" => $row['unidade'] ?? 'H',
                "valor" => $valor
            ];
            $reportData[$fid]["eventos"][] = $evento;

            if ($row['tipo'] == 'CREDITO') {
                $reportData[$fid]["totais"]["proventos"] += $valor;
            } elseif ($row['tipo'] == 'DEBITO') {
                $reportData[$fid]["totais"]["descontos"] += $valor;
            }

            if ($row['incide_inss']) $reportData[$fid]["bases"]["inss"] += $valor;
            if ($row['incide_fgts']) $reportData[$fid]["bases"]["fgts"] += $valor;
            if ($row['incide_irrf']) $reportData[$fid]["bases"]["irrf"] += $valor;
        }
    }

    // v4.52.17: insere INSS sintético se não houver lançamento real,
    // calculado pela tabela progressiva oficial 2026 sobre base já acumulada.
    if (!function_exists('calcularInssProgressivo2026_pdf_relatorio')) {
        function calcularInssProgressivo2026_pdf_relatorio(float $base): float
        {
            if ($base <= 0) return 0.0;
            $faixas = [
                ['fim' => 1621.00, 'aliquota' => 7.5],
                ['fim' => 2902.84, 'aliquota' => 9.0],
                ['fim' => 4354.27, 'aliquota' => 12.0],
                ['fim' => 8475.55, 'aliquota' => 14.0],
            ];
            $base = min($base, 8475.55);
            $total = 0.0;
            $inicio = 0.0;
            foreach ($faixas as $fa) {
                if ($base <= $inicio) break;
                $tributavel = min($base, $fa['fim']) - $inicio;
                $total += $tributavel * ($fa['aliquota'] / 100);
                $inicio = $fa['fim'];
                if ($base <= $fa['fim']) break;
            }
            return round($total, 2);
        }
    }

    // Lei 15.270/2025: IRRF com redutor sobre RTM, desconto simplificado vs. legal
    if (!function_exists('calcularIrrfProgressivo2026_pdf_relatorio')) {
        function _irrf_tabela_pdf(float $bc, float $rtm): float {
            if ($bc <= 0 || $rtm <= 5000.0) return 0.0;
            $faixas = [
                ['ini' => 0.00,    'fim' => 2428.80,   'aliq' => 0.00,  'ded' => 0.00],
                ['ini' => 2428.80, 'fim' => 2826.65,   'aliq' => 7.5,   'ded' => 182.16],
                ['ini' => 2826.65, 'fim' => 3751.05,   'aliq' => 15.0,  'ded' => 394.16],
                ['ini' => 3751.05, 'fim' => 4664.68,   'aliq' => 22.5,  'ded' => 675.49],
                ['ini' => 4664.68, 'fim' => 999999.99, 'aliq' => 27.5,  'ded' => 908.73],
            ];
            $aliq = 0.0; $ded = 0.0;
            foreach ($faixas as $fa) {
                if ($bc >= $fa['ini'] && $bc <= $fa['fim']) { $aliq = $fa['aliq']; $ded = $fa['ded']; break; }
            }
            $irBruto = max(0.0, ($bc * $aliq / 100) - $ded);
            if ($rtm <= 7350.0) {
                $redutor = 978.62 - (0.133145 * $rtm);
                return round(max(0.0, $irBruto - $redutor), 2);
            }
            return round($irBruto, 2);
        }
        // $base = BC após INSS; $rtm = RTM bruto (base_irrf antes de INSS)
        function calcularIrrfProgressivo2026_pdf_relatorio(float $base, float $rtm, int $depIr = 0, float $deducaoDep = 189.59): float {
            $rtmEfetivo = $rtm > 0 ? $rtm : $base;
            if ($rtmEfetivo <= 5000.0) return 0.0;
            $bcLegal        = max(0.0, $base - ($depIr * $deducaoDep));
            $bcSimplificado = max(0.0, $base - 607.20);
            return min(_irrf_tabela_pdf($bcLegal, $rtmEfetivo), _irrf_tabela_pdf($bcSimplificado, $rtmEfetivo));
        }
    }

    // Carrega a dedução por dependente cadastrada para a empresa
    $stmtParam = $conn->prepare("SELECT valor FROM parametros_sistema WHERE id_empresa = ? AND chave = 'VALOR_DEDUCAO_DEPENDENTE'");
    $stmtParam->execute([$empresa_id]);
    $deducaoDependente = (float)($stmtParam->fetchColumn() ?: 203.77);

    foreach ($reportData as &$f) {
        $temINSS = false;
        foreach ($f['eventos'] as $ev) {
            if ((int)$ev['codigo'] === 35) { $temINSS = true; break; }
        }
        if (!$temINSS && $f['bases']['inss'] > 0) {
            $inssVal = calcularInssProgressivo2026_pdf_relatorio((float)$f['bases']['inss']);
            if ($inssVal > 0) {
                $f['eventos'][] = [
                    "codigo"   => 35,
                    "nome"     => "INSS",
                    "tipo_num" => 3,
                    "qtd"      => 0,
                    "unid"     => '$',
                    "valor"    => $inssVal,
                ];
                $f['totais']['descontos'] += $inssVal;
            }
        }

        // v4.53.0: IRRF sintético — base = base_irrf − INSS já descontado − Dedução de Dependentes
        $temIRRF = false;
        foreach ($f['eventos'] as $ev) {
            if ((int)$ev['codigo'] === 1920) { $temIRRF = true; break; }
        }
        if (!$temIRRF && $f['bases']['irrf'] > 0) {
            $rtmIrrf = (float)$f['bases']['irrf']; // RTM bruto (antes de INSS)
            $inssDesconto = 0.0;
            foreach ($f['eventos'] as $ev) {
                if ((int)$ev['codigo'] === 35) { $inssDesconto = (float)$ev['valor']; break; }
            }
            $baseIrrf = max(0.0, $rtmIrrf - $inssDesconto); // BC = RTM - INSS
            $depIr = (int)($f['info']['dep_ir'] ?? 0);

            $irrfVal = calcularIrrfProgressivo2026_pdf_relatorio($baseIrrf, $rtmIrrf, $depIr, $deducaoDependente);
            if ($irrfVal > 0) {
                $f['eventos'][] = [
                    "codigo"   => 1920,
                    "nome"     => "IRRF",
                    "tipo_num" => 3,
                    "qtd"      => 0,
                    "unid"     => '$',
                    "valor"    => $irrfVal,
                ];
                $f['totais']['descontos'] += $irrfVal;
            }
        }

        $f['totais']['liquido'] = $f['totais']['proventos'] - $f['totais']['descontos'];
    }
    unset($f);

    // 6. Gerar PDF
    $ultimoDia = date('t', mktime(0, 0, 0, $mes, 1, $ano));
    $compInic = "01/{$competencia_str}";
    $compFim = "{$ultimoDia}/{$competencia_str}";

    if ($resumo_apenas) {
        $pdf = new EspelhoFolhaResumo($empresa, $compInic, $compFim, $tipo_folha, $usuario);
    } else {
        $pdf = new EspelhoFolhaPDF($empresa, $compInic, $compFim, $tipo_folha, $usuario);
    }
    
    $pdf->gerar(array_values($reportData));

    // Response
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="Espelho_Folha_' . str_replace('/', '_', $competencia_str) . '.pdf"');
    $pdf->Output('espelho_folha.pdf', 'I');
    exit;
}

