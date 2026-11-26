<?php
// /backend/v1/routes/ferias.php

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($route_parts[1]) ? $route_parts[1] : null;

// Bem Vindo v1.4.0: só ADMIN/RH gravam (perfis de consulta — leitura, contabilidade, diretor — só leem)
if ($method !== 'GET') {
    requireRole($authUser, ['ADMIN', 'RH']);
}

// Bem Vindo v1.5.1: tudo filtrado pela empresa do usuário (antes, id de outra empresa era aceito)
$empresaId = (int)$authUser['id_empresa'];
$funcionarioDaEmpresa = function ($funcId) use ($conn, $empresaId): bool {
    $st = $conn->prepare("SELECT 1 FROM funcionarios WHERE id = ? AND id_empresa = ?");
    $st->execute([(int)$funcId, $empresaId]);
    return (bool)$st->fetchColumn();
};
$naoEncontrado = function () {
    http_response_code(404);
    echo json_encode(["error" => "Funcionário não encontrado nesta empresa."]);
    exit;
};

// GET /ferias/funcionario/{id}
if ($method == 'GET' && isset($route_parts[1]) && $route_parts[1] === 'funcionario' && isset($route_parts[2])) {
    $funcId = $route_parts[2];
    if (!$funcionarioDaEmpresa($funcId)) $naoEncontrado();
    $stmt = $conn->prepare("SELECT * FROM ferias WHERE funcionario_id = ? ORDER BY periodo_aquisitivo_inicio DESC");
    $stmt->execute([$funcId]);
    echo json_encode(["data" => $stmt->fetchAll()]);
    exit;
}

if ($method == 'POST') {
    $data = getJsonInput();
    if (!$funcionarioDaEmpresa($data['funcionario_id'] ?? 0)) $naoEncontrado();
    
    $sql = "INSERT INTO ferias (funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim, periodo_gozo_inicio, periodo_gozo_fim, dias_gozo, dias_abono, status, observacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    try {
        $stmt->execute([
            $data['funcionario_id'],
            $data['periodo_aquisitivo_inicio'],
            $data['periodo_aquisitivo_fim'],
            $data['periodo_gozo_inicio'],
            $data['periodo_gozo_fim'],
            $data['dias_gozo'],
            $data['dias_abono'] ?? 0,
            $data['status'] ?? 'PROGRAMADA',
            $data['observacao'] ?? null
        ]);
        $data['id'] = $conn->lastInsertId();
        http_response_code(201);
        echo json_encode($data);
    } catch (PDOException $e) {
        http_response_code(400);
        error_log('[ferias] ' . $e->getMessage());
        echo json_encode(["error" => "Erro ao agendar férias. Confira os dados."]);
    }
}
elseif ($method == 'PUT' && $id) {
    $data = getJsonInput();
    $sql = "UPDATE ferias t JOIN funcionarios f ON f.id = t.funcionario_id SET t.status = ?, t.observacao = ? WHERE t.id = ? AND f.id_empresa = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$data['status'], $data['observacao'] ?? '', (int)$id, $empresaId]);
    $chk = $conn->prepare("SELECT 1 FROM ferias t JOIN funcionarios f ON f.id = t.funcionario_id WHERE t.id = ? AND f.id_empresa = ?");
    $chk->execute([(int)$id, $empresaId]);
    if (!$chk->fetchColumn()) $naoEncontrado();
    echo json_encode(["message" => "Status de férias atualizado"]);
}
elseif ($method == 'DELETE' && $id) {
    $stmt = $conn->prepare("DELETE t FROM ferias t JOIN funcionarios f ON f.id = t.funcionario_id WHERE t.id = ? AND f.id_empresa = ?");
    $stmt->execute([(int)$id, $empresaId]);
    if ($stmt->rowCount() === 0) $naoEncontrado();
    echo json_encode(["message" => "Agendamento de férias removido"]);
}
?>
