<?php
// /backend/v1/routes/ferias.php

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($route_parts[1]) ? $route_parts[1] : null;

// GET /ferias/funcionario/{id}
if ($method == 'GET' && isset($route_parts[1]) && $route_parts[1] === 'funcionario' && isset($route_parts[2])) {
    $funcId = $route_parts[2];
    $stmt = $conn->prepare("SELECT * FROM ferias WHERE funcionario_id = ? ORDER BY periodo_aquisitivo_inicio DESC");
    $stmt->execute([$funcId]);
    echo json_encode(["data" => $stmt->fetchAll()]);
    exit;
}

if ($method == 'POST') {
    $data = getJsonInput();
    
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
        echo json_encode(["error" => "Erro ao agendar férias: " . $e->getMessage()]);
    }
}
elseif ($method == 'PUT' && $id) {
    $data = getJsonInput();
    $sql = "UPDATE ferias SET status = ?, observacao = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$data['status'], $data['observacao'] ?? '', $id]);
    echo json_encode(["message" => "Status de férias atualizado"]);
}
elseif ($method == 'DELETE' && $id) {
    $stmt = $conn->prepare("DELETE FROM ferias WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Agendamento de férias removido"]);
}
?>
