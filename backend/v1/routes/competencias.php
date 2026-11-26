<?php
// /api/v1/routes/competencias.php

$method = $_SERVER['REQUEST_METHOD'];

// Usar o $route_parts definido no index.php
// $route_parts[0] é 'competencias'
// $route_parts[1] pode ser o ID
// $route_parts[2] pode ser 'close' ou 'reopen'

if ($method == 'GET') {
    // Qualquer usuário autenticado pode ver competências da sua empresa
    $empresa_id = $authUser['id_empresa'];
    $stmt = $conn->prepare("SELECT * FROM competencias WHERE id_empresa = ? ORDER BY ano DESC, mes DESC");
    $stmt->execute([$empresa_id]);
    echo json_encode(["data" => $stmt->fetchAll()]);
} 
elseif ($method == 'POST') {
    // Apenas ADMIN e RH podem abrir, fechar ou reabrir competências
    requireRole($authUser, ['ADMIN', 'RH']);
    $empresa_id = $authUser['id_empresa'];

    // Se for uma ação de fechar (/competencias/{id}/close)
    if (isset($route_parts[1]) && is_numeric($route_parts[1]) && isset($route_parts[2]) && $route_parts[2] == 'close') {
        $id = $route_parts[1];
        $stmt = $conn->prepare("UPDATE competencias SET status = 'FECHADA', data_fechamento = NOW() WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);
        registrarLog($conn, $authUser['user_id'], 'COMPETENCIA', $id, 'FECHAMENTO', "Fechou competência ID $id", $empresa_id);
        echo json_encode(["success" => true]);
        exit;
    }

    // --- NOVA AÇÃO: Reabrir (/competencias/{id}/reopen) ---
    if (isset($route_parts[1]) && is_numeric($route_parts[1]) && isset($route_parts[2]) && $route_parts[2] == 'reopen') {
        $id = $route_parts[1];
        $data = getJsonInput();
        $justificativa = isset($data['justificativa']) ? trim($data['justificativa']) : '';

        if (empty($justificativa)) {
            http_response_code(400);
            echo json_encode(["error" => "Justificativa obrigatória para reabrir competência"]);
            exit;
        }

        // Valida se a competência pertence à empresa e está FECHADA
        $stmt_check = $conn->prepare("SELECT status FROM competencias WHERE id = ? AND id_empresa = ?");
        $stmt_check->execute([$id, $empresa_id]);
        $comp = $stmt_check->fetch();

        if (!$comp || $comp['status'] !== 'FECHADA') {
            http_response_code(400);
            echo json_encode(["error" => "Apenas competências FECHADAS podem ser reabertas"]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE competencias SET status = 'ABERTA', data_fechamento = NULL, justificativa_status = ? WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$justificativa, $id, $empresa_id]);

        registrarLog($conn, $authUser['user_id'], 'COMPETENCIA', $id, 'REABERTURA', "Reabriu competência ID $id. Motivo: $justificativa", $empresa_id);
        echo json_encode(["success" => true]);
        exit;
    }

    // Criar nova competência
    $data = getJsonInput();
    $sql = "INSERT INTO competencias (mes, ano, status, data_abertura, id_empresa) VALUES (?, ?, 'ABERTA', NOW(), ?)";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$data['mes'], $data['ano'], $empresa_id]);

    $data['id'] = $conn->lastInsertId();
    $data['status'] = 'ABERTA';
    registrarLog($conn, $authUser['user_id'], 'COMPETENCIA', $data['id'], 'ABERTURA', "Abriu competência {$data['mes']}/{$data['ano']}", $empresa_id);

    // Copia Rubricas 33 (Salário) e 82 (Gratificação de função — Bem Vindo v1.2.0; na Frimelo era a 88)
    // da última competência FECHADA para a nova.
    $stmt_prev = $conn->prepare("
        SELECT id FROM competencias
        WHERE id_empresa = ? AND status = 'FECHADA'
        ORDER BY ano DESC, mes DESC
        LIMIT 1
    ");
    $stmt_prev->execute([$empresa_id]);
    $prev = $stmt_prev->fetch(PDO::FETCH_ASSOC);

    if ($prev) {
        $stmt_copy = $conn->prepare("
            INSERT INTO lancamentos_eventos
                (funcionario_id, competencia_id, evento_id, quantidade, valor_unitario, valor_total, id_empresa, origem)
            SELECT
                le.funcionario_id,
                ?,
                le.evento_id,
                le.quantidade,
                le.valor_unitario,
                le.valor_total,
                le.id_empresa,
                'COPIA_COMPETENCIA'
            FROM lancamentos_eventos le
            JOIN eventos_folha e  ON le.evento_id      = e.id
            JOIN funcionarios  f  ON le.funcionario_id = f.id
            WHERE le.competencia_id = ?
              AND le.id_empresa     = ?
              AND e.codigo_evento   IN (33, 82)
              AND (f.data_demissao IS NULL OR f.data_demissao > CURDATE())
        ");
        $stmt_copy->execute([$data['id'], $prev['id'], $empresa_id]);
        $data['lancamentos_copiados'] = $stmt_copy->rowCount();
    }

    http_response_code(201);
    echo json_encode($data);
}
elseif ($method == 'DELETE') {
    // Apenas ADMIN e RH podem excluir competências
    requireRole($authUser, ['ADMIN', 'RH']);
    $empresa_id = $authUser['id_empresa'];

    if (isset($route_parts[1]) && is_numeric($route_parts[1])) {
        $id = $route_parts[1];
        
        // Só permite excluir se a competência pertence à empresa e estiver ABERTA
        $stmt_check = $conn->prepare("SELECT status, mes, ano FROM competencias WHERE id = ? AND id_empresa = ?");
        $stmt_check->execute([$id, $empresa_id]);
        $comp = $stmt_check->fetch();

        if (!$comp) {
            http_response_code(404);
            echo json_encode(["error" => "Competência não encontrada"]);
            exit;
        }

        if ($comp['status'] !== 'ABERTA') {
            http_response_code(400);
            echo json_encode(["error" => "Só é possível excluir competências com status ABERTA"]);
            exit;
        }

        $data = getJsonInput();
        $justificativa = isset($data['justificativa']) ? trim($data['justificativa']) : '';

        if (empty($justificativa)) {
            http_response_code(400);
            echo json_encode(["error" => "Justificativa obrigatória para excluir competência"]);
            exit;
        }

        // Lançamentos são deletados via CASCADE no banco.
        $stmt = $conn->prepare("DELETE FROM competencias WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);

        registrarLog($conn, $authUser['user_id'], 'COMPETENCIA', $id, 'EXCLUSAO', "Excluiu competência {$comp['mes']}/{$comp['ano']}. Motivo: $justificativa", $empresa_id);
        echo json_encode(["success" => true]);
        exit;
    }
}
?>