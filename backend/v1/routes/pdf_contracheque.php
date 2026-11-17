<?php
// /backend/v1/routes/pdf_contracheque.php

require_once __DIR__ . '/../lib/ContrachequePDF.php';

/**
 * v4.52.14: cálculo de INSS pela tabela progressiva oficial 2026.
 * Usado para gerar a linha sintética em PDFs de competências antigas que
 * não têm lançamento real de INSS gravado.
 */
if (!function_exists('calcularInssProgressivo2026_pdf')) {
    function calcularInssProgressivo2026_pdf(float $base): float
    {
        if ($base <= 0) return 0.0;
        $faixas = [
            ['fim' => 1621.00, 'aliquota' => 7.5],
            ['fim' => 2902.84, 'aliquota' => 9.0],
            ['fim' => 4354.27, 'aliquota' => 12.0],
            ['fim' => 8475.55, 'aliquota' => 14.0], // Teto
        ];
        $base = min($base, 8475.55);
        $total = 0.0;
        $inicio = 0.0;
        foreach ($faixas as $f) {
            if ($base <= $inicio) break;
            $tributavel = min($base, $f['fim']) - $inicio;
            $total += $tributavel * ($f['aliquota'] / 100);
            $inicio = $f['fim'];
            if ($base <= $f['fim']) break;
        }
        return round($total, 2);
    }
}

// Endpoint handles logic for Paycheck PDF generation
// Expects: POST { competencia: "MM/YYYY", tipo_folha: "Mensal", funcionario_ids: [1,2,3] }

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $empresa_id = $authUser['id_empresa'];
    $competencia_str = $input['competencia'] ?? '';
    $tipo_folha = $input['tipo_folha'] ?? 'Mensal';
    $usuario = $authUser['nome'] ?? 'SISTEMA';
    $funcionario_ids = $input['funcionario_ids'] ?? null;

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
        ORDER BY f.nome ASC, e.tipo DESC, e.codigo_evento ASC
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
                    "cpf" => $row['cpf'] ?? '000.000.000-00',
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

    foreach ($reportData as &$f) {
        // v4.52.14: garante linha de INSS no PDF mesmo se não houver lançamento gravado
        // (competências antigas sem o evento 35 cadastrado/calculado).
        $temINSS = false;
        foreach ($f['eventos'] as $ev) {
            if ((int)$ev['codigo'] === 35) { $temINSS = true; break; }
        }
        if (!$temINSS && $f['bases']['inss'] > 0) {
            $inssVal = calcularInssProgressivo2026_pdf((float)$f['bases']['inss']);
            if ($inssVal > 0) {
                $f['eventos'][] = [
                    "codigo"   => 35,
                    "nome"     => "INSS",
                    "tipo_num" => 3, // DEBITO
                    "qtd"      => 0,
                    "unid"     => '$',
                    "valor"    => $inssVal,
                ];
                $f['totais']['descontos'] += $inssVal;
            }
        }

        $f['totais']['liquido'] = $f['totais']['proventos'] - $f['totais']['descontos'];
    }
    unset($f);

    // 6. Gerar PDF
    $pdf = new ContrachequePDF($empresa, $competencia_str, $tipo_folha);
    $pdf->gerar(array_values($reportData));

    // Response
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="Contracheques_' . str_replace('/', '_', $competencia_str) . '.pdf"');
    $pdf->Output('contracheques.pdf', 'I');
    exit;
}
