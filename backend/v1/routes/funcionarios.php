
<?php
// /api/v1/routes/funcionarios.php

$method = $_SERVER['REQUEST_METHOD'];

// Bem Vindo (Fase A.1): dados bancários/Pix só para quem cuida do cadastro (dado pessoal restrito)
$bvPodeVerPagamento = in_array($authUser['perfil'] ?? '', ['SUPERADMIN', 'ADMIN', 'RH'], true);

/**
 * Bem Vindo (Fase A.1): valida e devolve os campos novos do cadastro presentes em $data
 * (setor, cargo da hierarquia, nascimento, sexo, escolaridade, vínculo e pagamento).
 * Só mexe no que veio no pedido — quem não envia o campo não apaga o valor salvo.
 */
function bvCamposCadastro(PDO $conn, array $data, int $empresa_id, bool $podePagamento): array
{
    $erro = function (string $msg) {
        http_response_code(400);
        echo json_encode(["error" => "Dados inválidos", "message" => $msg]);
        exit;
    };
    $txt = function ($v, int $max) { $v = trim((string)($v ?? '')); return $v === '' ? null : mb_substr($v, 0, $max); };
    $out = [];

    if (array_key_exists('id_setor', $data)) {
        $idSetor = (int)($data['id_setor'] ?? 0);
        if ($idSetor > 0) {
            $st = $conn->prepare("SELECT id FROM setores WHERE id = ? AND id_empresa = ?");
            $st->execute([$idSetor, $empresa_id]);
            if (!$st->fetch()) $erro('Setor inválido para esta empresa.');
        }
        $out['id_setor'] = $idSetor > 0 ? $idSetor : null;
    }
    if (array_key_exists('id_cargo', $data)) {
        $idCargo = (int)($data['id_cargo'] ?? 0);
        if ($idCargo > 0) {
            $st = $conn->prepare("SELECT id, nome, id_setor FROM cargos WHERE id = ? AND id_empresa = ?");
            $st->execute([$idCargo, $empresa_id]);
            $cargo = $st->fetch();
            if (!$cargo) $erro('Cargo inválido para esta empresa.');
            $out['id_cargo'] = $idCargo;
            $out['cargo'] = $cargo['nome']; // nome usado em contracheque, relatórios e exportação
            if ($cargo['id_setor'] !== null) $out['id_setor'] = (int)$cargo['id_setor'];
        } else {
            $out['id_cargo'] = null;
        }
    }
    if (array_key_exists('data_nascimento', $data)) {
        $dn = trim((string)($data['data_nascimento'] ?? ''));
        if ($dn !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dn)) $erro('Data de nascimento inválida.');
        $out['data_nascimento'] = $dn === '' ? null : $dn;
    }
    if (array_key_exists('sexo', $data)) {
        $sx = $data['sexo'] ?: null;
        if ($sx !== null && !in_array($sx, ['F', 'M', 'O'], true)) $erro('Sexo inválido.');
        $out['sexo'] = $sx;
    }
    if (array_key_exists('escolaridade', $data)) $out['escolaridade'] = $txt($data['escolaridade'], 40);
    if (array_key_exists('tipo_contrato', $data)) {
        $tc = $data['tipo_contrato'] ?: 'CLT';
        if (!in_array($tc, ['CLT', 'PJ', 'ESTAGIO', 'OUTRO'], true)) $erro('Tipo de vínculo inválido.');
        $out['tipo_contrato'] = $tc;
    }

    // Bem Vindo v1.2.0: rubricas do cadastro — Gratificação de função (82, %) e desconto do VT (816)
    $num = function (string $campo, float $max) use ($data, $erro) {
        $v = $data[$campo] ?? 0;
        if ($v === '' || $v === null) $v = 0;
        if (!is_numeric($v) || (float)$v < 0 || (float)$v > $max) $erro("Valor inválido em $campo (0 a $max).");
        return round((float)$v, 2);
    };
    if (array_key_exists('gratificacao_funcao_perc', $data)) $out['gratificacao_funcao_perc'] = $num('gratificacao_funcao_perc', 100);
    if (array_key_exists('vt_desconto_perc', $data)) $out['vt_desconto_perc'] = $num('vt_desconto_perc', 6);
    if (array_key_exists('vt_custo_mensal', $data)) $out['vt_custo_mensal'] = $num('vt_custo_mensal', 99999999);

    if ($podePagamento) {
        if (array_key_exists('modalidade_pagamento', $data)) {
            $mp = $data['modalidade_pagamento'] ?: 'BANCO';
            if (!in_array($mp, ['BANCO', 'PIX', 'LOJA'], true)) $erro('Forma de pagamento inválida.');
            $out['modalidade_pagamento'] = $mp;
        }
        if (array_key_exists('tipo_conta', $data)) {
            $tcn = $data['tipo_conta'] ?: null;
            if ($tcn !== null && !in_array($tcn, ['CORRENTE', 'POUPANCA', 'SALARIO'], true)) $erro('Tipo de conta inválido.');
            $out['tipo_conta'] = $tcn;
        }
        foreach (['banco' => 80, 'agencia' => 20, 'conta' => 30, 'chave_pix' => 140] as $campo => $max) {
            if (array_key_exists($campo, $data)) $out[$campo] = $txt($data[$campo], $max);
        }
    }
    return $out;
}

function bvGravarCamposCadastro(PDO $conn, int $id, int $empresa_id, array $campos): void
{
    if (!$campos) return;
    $sets = implode(', ', array_map(fn($c) => "`$c` = ?", array_keys($campos)));
    $stmt = $conn->prepare("UPDATE funcionarios SET $sets WHERE id = ? AND id_empresa = ?");
    $stmt->execute(array_merge(array_values($campos), [$id, $empresa_id]));
}

if ($method == 'GET') {
    // Qualquer usuário autenticado pode visualizar funcionários
    $empresa_id = $authUser['id_empresa'];

    // Em listagens gerais, evitamos SELECT * para não expor CPF desnecessariamente na grid principal
    $colsPagamento = $bvPodeVerPagamento ? ", f.modalidade_pagamento, f.banco, f.agencia, f.conta, f.tipo_conta, f.chave_pix" : "";
    $stmt = $conn->prepare("SELECT f.id, f.id_contrato, f.nome, f.cpf, f.cargo, f.status, f.data_admissao, f.data_demissao, f.cbo, f.empresa_codigo, f.local, f.departamento, f.salario_base, f.insalubridade_perc, f.assiduidade_perc, f.adic_tempo_servico_perc, f.mensalidade_sindical, f.emprestimo_consignado, f.gratificacao,
            f.tipo_contrato, f.id_setor, f.id_cargo, f.data_nascimento, f.sexo, f.escolaridade,
            f.gratificacao_funcao_perc, f.vt_desconto_perc, f.vt_custo_mensal,
            s.nome AS setor_nome, s.ordem AS setor_ordem, c.ordem_hierarquia AS cargo_ordem $colsPagamento
        FROM funcionarios f
        LEFT JOIN setores s ON s.id = f.id_setor AND s.id_empresa = f.id_empresa
        LEFT JOIN cargos c ON c.id = f.id_cargo AND c.id_empresa = f.id_empresa
        WHERE f.id_empresa = ? ORDER BY f.nome ASC");
    $stmt->execute([$empresa_id]);
    echo json_encode(["data" => $stmt->fetchAll()]);

}
elseif ($method == 'POST') {
    // Apenas ADMIN e RH podem criar ou editar funcionários
    requireRole($authUser, ['ADMIN', 'RH']);
    $empresa_id = $authUser['id_empresa'];

    // Buscar limite da empresa
    $stmtLimit = $conn->prepare("SELECT limite_funcionarios FROM empresas WHERE id = ?");
    $stmtLimit->execute([$empresa_id]);
    $empresa = $stmtLimit->fetch();
    $limite = $empresa['limite_funcionarios'] ?? 10;

    // Contar funcionários atuais
    $stmtCount = $conn->prepare("SELECT COUNT(*) FROM funcionarios WHERE id_empresa = ?");
    $stmtCount->execute([$empresa_id]);
    $total_atual = $stmtCount->fetchColumn();

    $data = getJsonInput();
    $sub_route = $route_parts[1] ?? '';
    $is_import = ($sub_route === 'import' || $sub_route === 'importar');

    if ($is_import && is_array($data)) {
        error_log("[IMPORT_DEBUG] Empresa: $empresa_id | Recebido " . count($data) . " registros. Chaves do primeiro: " . (count($data) > 0 ? implode(',', array_keys($data[0])) : 'vazio'));
        // Bulk Import - Verifica se o total após importação excede o limite
        $total_final = $total_atual + count($data);
        if ($total_final > $limite) {
            http_response_code(403);
            echo json_encode(["error" => "Limite atingido", "message" => "O plano permite até $limite funcionários. Você tem $total_atual e está tentando importar " . count($data) . "."]);
            exit;
        }

        $conn->beginTransaction();
        try {
            $sql = "INSERT INTO funcionarios (id_contrato, nome, cpf, status, cargo, data_admissao, cbo, empresa_codigo, local, departamento, id_empresa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE nome = VALUES(nome), cpf = VALUES(cpf), status = VALUES(status), cargo = VALUES(cargo), data_admissao = VALUES(data_admissao), cbo = VALUES(cbo), empresa_codigo = VALUES(empresa_codigo), local = VALUES(local), departamento = VALUES(departamento)";
            $stmt = $conn->prepare($sql);
            foreach ($data as $item) {
                $stmt->execute([
                    $item['id_contrato'], 
                    $item['nome'], 
                    $item['cpf'] ?? null, 
                    $item['status'] ?? 'ATIVO', 
                    $item['cargo'] ?? null,
                    $item['data_admissao'] ?? null,
                    $item['cbo'] ?? null,
                    $item['empresa_codigo'] ?? null,
                    $item['local'] ?? null,
                    $item['departamento'] ?? null,
                    $empresa_id
                ]);
            }
            $conn->commit();
            registrarLog($conn, $authUser['user_id'], 'FUNCIONARIO', 0, 'IMPORTACAO', "Importou " . count($data) . " funcionários em massa", $empresa_id);
            echo json_encode(["success" => true, "count" => count($data)]);
        } catch (Exception $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha na importação em massa", "details" => $e->getMessage()]);
        }
    } 
    elseif (isset($data['id'])) {
        // Validação: salario_base é obrigatório e deve ser > 0
        $salarioBase = isset($data['salario_base']) ? (float)$data['salario_base'] : 0;
        if ($salarioBase <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Salário obrigatório", "message" => "O campo 'Salário Base' é obrigatório e deve ser maior que zero."]);
            exit;
        }

        // Bem Vindo: valida os campos novos antes de gravar qualquer coisa
        $bvCampos = bvCamposCadastro($conn, $data, (int)$empresa_id, $bvPodeVerPagamento);

        // Update - Garante que o funcionário pertence à empresa
        $insalubPerc = isset($data['insalubridade_perc']) ? (float)$data['insalubridade_perc'] : 0.00; // Bem Vindo v1.1.0: padrão 0 (Frimelo: 20)
        $assidPerc   = isset($data['assiduidade_perc']) ? (float)$data['assiduidade_perc'] : 0.00;  // Bem Vindo v1.1.0: padrão 0 (Frimelo: 11)
        $adicTSPerc  = isset($data['adic_tempo_servico_perc']) ? (float)$data['adic_tempo_servico_perc'] : 0.00;
        $mensSind    = isset($data['mensalidade_sindical']) ? (float)$data['mensalidade_sindical'] : 0.00;
        $emprestimo  = isset($data['emprestimo_consignado']) ? (float)$data['emprestimo_consignado'] : 0.00;
        $gratificacao = isset($data['gratificacao']) ? (float)$data['gratificacao'] : 0.00;

        $sql = "UPDATE funcionarios SET id_contrato = ?, nome = ?, cpf = ?, status = ?, cargo = ?, data_admissao = ?, cbo = ?, empresa_codigo = ?, local = ?, departamento = ?, salario_base = ?, insalubridade_perc = ?, assiduidade_perc = ?, adic_tempo_servico_perc = ?, mensalidade_sindical = ?, emprestimo_consignado = ?, gratificacao = ? WHERE id = ? AND id_empresa = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['id_contrato'], $data['nome'], $data['cpf'],
            $data['status'], $data['cargo'], $data['data_admissao'] ?? null,
            $data['cbo'] ?? null, $data['empresa_codigo'] ?? null, $data['local'] ?? null, $data['departamento'] ?? null,
            $salarioBase, $insalubPerc, $assidPerc, $adicTSPerc, $mensSind, $emprestimo, $gratificacao,
            $data['id'],
            $empresa_id
        ]);
        bvGravarCamposCadastro($conn, (int)$data['id'], (int)$empresa_id, $bvCampos);
        registrarLog($conn, $authUser['user_id'], 'FUNCIONARIO', $data['id'], 'ALTERACAO', "Atualizou funcionário ID {$data['id']}: {$data['nome']} (salário R$ " . number_format($salarioBase, 2, ',', '.') . ")", $empresa_id);
        echo json_encode($data);
    } else {
        // Create - Verifica limite individual
        if ($total_atual >= $limite) {
            http_response_code(403);
            echo json_encode(["error" => "Limite atingido", "message" => "Sua empresa atingiu o limite de $limite funcionários permitido pelo seu plano SaaS."]);
            exit;
        }

        // Validação: salario_base é obrigatório e deve ser > 0
        $salarioBase = isset($data['salario_base']) ? (float)$data['salario_base'] : 0;
        if ($salarioBase <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Salário obrigatório", "message" => "O campo 'Salário Base' é obrigatório e deve ser maior que zero."]);
            exit;
        }

        $insalubPerc = isset($data['insalubridade_perc']) ? (float)$data['insalubridade_perc'] : 0.00; // Bem Vindo v1.1.0: padrão 0 (Frimelo: 20)
        $assidPerc   = isset($data['assiduidade_perc']) ? (float)$data['assiduidade_perc'] : 0.00;  // Bem Vindo v1.1.0: padrão 0 (Frimelo: 11)
        $adicTSPerc  = isset($data['adic_tempo_servico_perc']) ? (float)$data['adic_tempo_servico_perc'] : 0.00;
        $mensSind    = isset($data['mensalidade_sindical']) ? (float)$data['mensalidade_sindical'] : 0.00;
        $emprestimo  = isset($data['emprestimo_consignado']) ? (float)$data['emprestimo_consignado'] : 0.00;
        $gratificacao = isset($data['gratificacao']) ? (float)$data['gratificacao'] : 0.00;

        // Bem Vindo: valida os campos novos antes de gravar qualquer coisa
        $bvCampos = bvCamposCadastro($conn, $data, (int)$empresa_id, $bvPodeVerPagamento);

        $sql = "INSERT INTO funcionarios (id_contrato, nome, cpf, status, cargo, data_admissao, cbo, empresa_codigo, local, departamento, salario_base, insalubridade_perc, assiduidade_perc, adic_tempo_servico_perc, mensalidade_sindical, emprestimo_consignado, gratificacao, id_empresa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['id_contrato'], $data['nome'], $data['cpf'] ?? null,
            $data['status'] ?? 'ATIVO', $data['cargo'] ?? null,
            $data['data_admissao'] ?? null,
            $data['cbo'] ?? null,
            $data['empresa_codigo'] ?? null,
            $data['local'] ?? null,
            $data['departamento'] ?? null,
            $salarioBase, $insalubPerc, $assidPerc, $adicTSPerc, $mensSind, $emprestimo, $gratificacao,
            $empresa_id
        ]);
        $data['id'] = $conn->lastInsertId();
        bvGravarCamposCadastro($conn, (int)$data['id'], (int)$empresa_id, $bvCampos);
        registrarLog($conn, $authUser['user_id'], 'FUNCIONARIO', $data['id'], 'ADMISSAO', "Cadastrou funcionário: {$data['nome']} (salário R$ " . number_format($salarioBase, 2, ',', '.') . ")", $empresa_id);
        http_response_code(201);
        echo json_encode($data);
    }
}
elseif ($method == 'DELETE') {
    // Apenas ADMIN e RH podem excluir
    requireRole($authUser, ['ADMIN', 'RH']);
    $empresa_id = $authUser['id_empresa'];

    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $conn->prepare("DELETE FROM funcionarios WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);
        registrarLog($conn, $authUser['user_id'], 'FUNCIONARIO', $id, 'DESLIGAMENTO', "Excluiu funcionário ID $id", $empresa_id);
        echo json_encode(["success" => true]);
    }
}
?>
