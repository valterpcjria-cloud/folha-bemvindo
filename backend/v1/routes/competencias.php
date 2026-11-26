<?php
// /api/v1/routes/competencias.php

$method = $_SERVER['REQUEST_METHOD'];
require_once __DIR__ . '/../lib/EtapasCompetencia.php'; // Bem Vindo v1.4.0

// Usar o $route_parts definido no index.php
// $route_parts[0] é 'competencias'
// $route_parts[1] pode ser o ID
// $route_parts[2] pode ser 'close' ou 'reopen'

if ($method == 'GET') {
    // Qualquer usuário autenticado pode ver competências da sua empresa
    $empresa_id = $authUser['id_empresa'];

    // Bem Vindo v1.4.0: histórico das etapas (/competencias/{id}/historico)
    if (isset($route_parts[1]) && is_numeric($route_parts[1]) && ($route_parts[2] ?? '') === 'historico') {
        echo json_encode(["data" => EtapasCompetencia::historico($conn, (int)$empresa_id, (int)$route_parts[1])]);
        exit;
    }
    $stmt = $conn->prepare("SELECT * FROM competencias WHERE id_empresa = ? ORDER BY ano DESC, mes DESC");
    $stmt->execute([$empresa_id]);
    echo json_encode(["data" => $stmt->fetchAll()]);
} 
elseif ($method == 'POST') {
    // Bem Vindo v1.4.0: mudança de etapa (/competencias/{id}/etapa) — cada perfil faz a sua etapa
    // (CONTABILIDADE valida, DIRETOR autoriza), por isso vem antes do requireRole ADMIN/RH.
    if (isset($route_parts[1]) && is_numeric($route_parts[1]) && ($route_parts[2] ?? '') === 'etapa') {
        requireRole($authUser, ['ADMIN', 'RH', 'CONTABILIDADE', 'DIRETOR']);
        $data = getJsonInput();
        [$codigo, $corpo] = EtapasCompetencia::mudar($conn, $authUser, (int)$route_parts[1], (string)($data['para'] ?? ''), (string)($data['observacao'] ?? ''));
        http_response_code($codigo);
        echo json_encode($corpo);
        exit;
    }

    // Apenas ADMIN e RH podem abrir, fechar ou reabrir competências
    requireRole($authUser, ['ADMIN', 'RH']);
    $empresa_id = $authUser['id_empresa'];

    // Fechar (/competencias/{id}/close) — v1.4.0: equivale a enviar para conferência (ABERTA → EM_CONFERENCIA)
    if (isset($route_parts[1]) && is_numeric($route_parts[1]) && isset($route_parts[2]) && $route_parts[2] == 'close') {
        [$codigo, $corpo] = EtapasCompetencia::mudar($conn, $authUser, (int)$route_parts[1], 'EM_CONFERENCIA', '');
        http_response_code($codigo);
        echo json_encode($corpo);
        exit;
    }

    // Reabrir (/competencias/{id}/reopen) — v1.4.0: devolve para ABERTA pelas regras das etapas
    if (isset($route_parts[1]) && is_numeric($route_parts[1]) && isset($route_parts[2]) && $route_parts[2] == 'reopen') {
        $data = getJsonInput();
        [$codigo, $corpo] = EtapasCompetencia::mudar($conn, $authUser, (int)$route_parts[1], 'ABERTA', (string)($data['justificativa'] ?? ''));
        http_response_code($codigo);
        echo json_encode($corpo);
        exit;
    }

    // Criar nova competência
    $data = getJsonInput();
    $sql = "INSERT INTO competencias (mes, ano, status, data_abertura, id_empresa) VALUES (?, ?, 'ABERTA', NOW(), ?)";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$data['mes'], $data['ano'], $empresa_id]);

    $data['id'] = $conn->lastInsertId();
    $data['status'] = 'ABERTA';
    $data['etapa'] = 'ABERTA';
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