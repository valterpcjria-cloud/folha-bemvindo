<?php
// /backend/v1/routes/reports.php

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $empresa_id = $authUser['id_empresa'];
    
    // Rota: /reports/calculo?competencia=MM/YYYY
    if (isset($route_parts[1]) && $route_parts[1] == 'calculo') {
        $competencia_str = $_GET['competencia'] ?? '';
        if (empty($competencia_str)) {
            http_response_code(400);
            echo json_encode(["error" => "Competencia é obrigatória"]);
            exit;
        }

        // 1. Buscar período da competência
        $parts = explode('/', $competencia_str);
        if (count($parts) != 2) {
            http_response_code(400);
            echo json_encode(["error" => "Formato de competencia inválido (MM/YYYY)"]);
            exit;
        }
        $mes = (int)$parts[0];
        $ano = (int)$parts[1];

        // Precisamos encontrar as datas de inicio e fim no periodo_competencia
        // Ou simplesmente usar o mes/ano para filtrar se a tabela lancamento_eventos tiver essa info.
        // Pelo setup_db.php, lancamento_eventos tem data_vencimento e id_competencia.
        
        // Vamos buscar a competencia ID
        $stmt_comp = $conn->prepare("SELECT id FROM competencias WHERE mes = ? AND ano = ? AND id_empresa = ?");
        $stmt_comp->execute([$mes, $ano, $empresa_id]);
        $comp = $stmt_comp->fetch();

        if (!$comp) {
            echo json_encode(["data" => []]);
            exit;
        }

        $id_competencia = $comp['id'];

        // 2. Buscar lançamentos detalhados
        $query = "
            SELECT 
                f.id as id_funcionario,
                f.nome as nome_funcionario,
                f.cpf,
                c.nome as cargo,
                e.codigo_evento as cod_evento,
                e.nome_evento as nome_evento,
                e.tipo,
                le.quantidade as referencia,
                le.valor_total as valor
            FROM lancamentos_eventos le
            JOIN funcionarios f ON le.funcionario_id = f.id
            JOIN eventos_folha e ON le.evento_id = e.id
            LEFT JOIN cargos c ON f.id_cargo = c.id
            WHERE le.competencia_id = ? AND f.id_empresa = ?
            ORDER BY f.nome, e.tipo DESC, e.codigo_evento
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute([$id_competencia, $empresa_id]);
        $rows = $stmt->fetchAll();

        // 3. Agrupar por funcionário
        $report = [];
        foreach ($rows as $row) {
            $fid = $row['id_funcionario'];
            if (!isset($report[$fid])) {
                $report[$fid] = [
                    "funcionario" => [
                        "id" => $fid,
                        "nome" => $row['nome_funcionario'],
                        "cpf" => $row['cpf'],
                        "cargo" => $row['cargo']
                    ],
                    "proventos" => [],
                    "descontos" => [],
                    "total_proventos" => 0,
                    "total_descontos" => 0,
                    "liquido" => 0
                ];
            }

            $evento = [
                "codigo" => $row['cod_evento'],
                "nome" => $row['nome_evento'],
                "referencia" => $row['referencia'],
                "valor" => (float)$row['valor']
            ];

            if ($row['tipo'] == 'PROVENTO') {
                $report[$fid]["proventos"][] = $evento;
                $report[$fid]["total_proventos"] += $evento['valor'];
            } else {
                $report[$fid]["descontos"][] = $evento;
                $report[$fid]["total_descontos"] += $evento['valor'];
            }
        }

        // Calcular líquido
        foreach ($report as &$emp) {
            $emp['liquido'] = $emp['total_proventos'] - $emp['total_descontos'];
        }

        echo json_encode(["data" => array_values($report)]);
        exit;
    }

    // --- NOVA ROTA: Relação de Cálculo (Espelho da Folha v4.44) ---
    // Rota: /reports/relacao-calculo?competencia=MM/YYYY
    if (isset($route_parts[1]) && $route_parts[1] == 'relacao-calculo') {
        $competencia_str = $_GET['competencia'] ?? '';
        if (empty($competencia_str)) {
            http_response_code(400);
            echo json_encode(["error" => "Competência é obrigatória"]);
            exit;
        }

        $parts = explode('/', $competencia_str);
        $mes = (int)$parts[0];
        $ano = (int)$parts[1];

        // 1. Dados da Empresa
        $stmt_emp = $conn->prepare("SELECT * FROM empresas WHERE id = ?");
        $stmt_emp->execute([$empresa_id]);
        $empresa = $stmt_emp->fetch();

        // 2. Competência ID
        $stmt_comp = $conn->prepare("SELECT id FROM competencias WHERE mes = ? AND ano = ? AND id_empresa = ?");
        $stmt_comp->execute([$mes, $ano, $empresa_id]);
        $comp = $stmt_comp->fetch();

        if (!$comp) {
            echo json_encode(["data" => [], "empresa" => $empresa]);
            exit;
        }
        $id_competencia = $comp['id'];

        // 3. Buscar todos os funcionários e seus lançamentos
        // Incluímos campos detalhados para o relatório
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
                f.local,
                f.departamento,
                e.codigo_evento,
                e.nome_evento,
                e.tipo,
                e.natureza,
                e.unidade,
                e.incide_inss,
                e.incide_fgts,
                e.incide_irrf,
                le.quantidade,
                le.valor_total
            FROM funcionarios f
            LEFT JOIN lancamentos_eventos le ON f.id = le.funcionario_id AND le.competencia_id = ?
            LEFT JOIN eventos_folha e ON le.evento_id = e.id
            WHERE f.id_empresa = ?
            ORDER BY f.nome ASC, e.tipo ASC, e.codigo_evento ASC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute([$id_competencia, $empresa_id]);
        $rows = $stmt->fetchAll();

        // 4. Estruturação do Relatório
        $report = [];
        foreach ($rows as $row) {
            $fid = $row['id_funcionario'];
            if (!isset($report[$fid])) {
                $report[$fid] = [
                    "info" => [
                        "matricula" => $row['id_contrato'],
                        "nome" => $row['nome_funcionario'],
                        "admissao" => $row['data_admissao'],
                        "demissao" => $row['data_demissao'],
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
                    "unid" => $row['unidade'],
                    "valor" => $valor
                ];
                $report[$fid]["eventos"][] = $evento;

                // Somatórios e Bases
                if ($row['tipo'] == 'CREDITO') {
                    $report[$fid]["totais"]["proventos"] += $valor;
                } elseif ($row['tipo'] == 'DEBITO') {
                    $report[$fid]["totais"]["descontos"] += $valor;
                }

                if ($row['incide_inss']) $report[$fid]["bases"]["inss"] += $valor;
                if ($row['incide_fgts']) $report[$fid]["bases"]["fgts"] += $valor;
                if ($row['incide_irrf']) $report[$fid]["bases"]["irrf"] += $valor;
            }
        }

        // v4.52.15: garante linha sintética de INSS quando não há lançamento real,
        // calculada pela tabela progressiva oficial 2026 sobre a base já acumulada.
        if (!function_exists('calcularInssProgressivo2026_reports')) {
            function calcularInssProgressivo2026_reports(float $base): float
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
        if (!function_exists('calcularIrrfProgressivo2026_reports')) {
            function _irrf_tabela_reports(float $bc, float $rtm): float {
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
            function calcularIrrfProgressivo2026_reports(float $base, float $rtm, int $depIr = 0, float $deducaoDep = 189.59): float {
                $rtmEfetivo = $rtm > 0 ? $rtm : $base;
                if ($rtmEfetivo <= 5000.0) return 0.0;
                $bcLegal        = max(0.0, $base - ($depIr * $deducaoDep));
                $bcSimplificado = max(0.0, $base - 607.20);
                return min(_irrf_tabela_reports($bcLegal, $rtmEfetivo), _irrf_tabela_reports($bcSimplificado, $rtmEfetivo));
            }
        }

        // Carrega a dedução por dependente cadastrada para a empresa
        $stmtParam = $conn->prepare("SELECT valor FROM parametros_sistema WHERE id_empresa = ? AND chave = 'VALOR_DEDUCAO_DEPENDENTE'");
        $stmtParam->execute([$empresa_id]);
        $deducaoDependente = (float)($stmtParam->fetchColumn() ?: 203.77);

        // Finalizar cálculos: insere INSS/IRRF sintéticos se faltarem e calcula líquido
        foreach ($report as &$f) {
            $temINSS = false;
            foreach ($f['eventos'] as $ev) {
                if ((int)$ev['codigo'] === 35) { $temINSS = true; break; }
            }
            if (!$temINSS && $f['bases']['inss'] > 0) {
                $inssVal = calcularInssProgressivo2026_reports((float)$f['bases']['inss']);
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

                $irrfVal = calcularIrrfProgressivo2026_reports($baseIrrf, $rtmIrrf, $depIr, $deducaoDependente);
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

        echo json_encode([
            "empresa" => $empresa,
            "competencia" => $competencia_str,
            "data" => array_values($report),
            "gerado_em" => date('d/m/Y H:i')
        ]);
        exit;
    }
}
