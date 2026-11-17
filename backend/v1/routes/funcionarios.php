
<?php
// /api/v1/routes/funcionarios.php

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    // Qualquer usuário autenticado pode visualizar funcionários
    $empresa_id = $authUser['id_empresa'];

    // Em listagens gerais, evitamos SELECT * para não expor CPF desnecessariamente na grid principal
    $stmt = $conn->prepare("SELECT id, id_contrato, nome, cpf, cargo, status, data_admissao, cbo, empresa_codigo, local, departamento, salario_base, insalubridade_perc, assiduidade_perc, adic_tempo_servico_perc, mensalidade_sindical, emprestimo_consignado, gratificacao FROM funcionarios WHERE id_empresa = ? ORDER BY nome ASC");
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

        // Update - Garante que o funcionário pertence à empresa
        $insalubPerc = isset($data['insalubridade_perc']) ? (float)$data['insalubridade_perc'] : 20.00;
        $assidPerc   = isset($data['assiduidade_perc']) ? (float)$data['assiduidade_perc'] : 11.00;
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

        $insalubPerc = isset($data['insalubridade_perc']) ? (float)$data['insalubridade_perc'] : 20.00;
        $assidPerc   = isset($data['assiduidade_perc']) ? (float)$data['assiduidade_perc'] : 11.00;
        $adicTSPerc  = isset($data['adic_tempo_servico_perc']) ? (float)$data['adic_tempo_servico_perc'] : 0.00;
        $mensSind    = isset($data['mensalidade_sindical']) ? (float)$data['mensalidade_sindical'] : 0.00;
        $emprestimo  = isset($data['emprestimo_consignado']) ? (float)$data['emprestimo_consignado'] : 0.00;
        $gratificacao = isset($data['gratificacao']) ? (float)$data['gratificacao'] : 0.00;

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
