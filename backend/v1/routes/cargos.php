<?php
// /backend/v1/routes/cargos.php

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($route_parts[1]) ? $route_parts[1] : null;

if ($method == 'GET') {
    if ($id) {
        $stmt = $conn->prepare("SELECT * FROM cargos WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["data" => $stmt->fetch()]);
    } else {
        $stmt = $conn->prepare("SELECT * FROM cargos ORDER BY nome ASC");
        $stmt->execute();
        echo json_encode(["data" => $stmt->fetchAll()]);
    }
} 
elseif ($method == 'POST') {
    $data = getJsonInput();
    
    $sql = "INSERT INTO cargos (nome, cbo, piso_salarial) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    try {
        $stmt->execute([
            $data['nome'],
            $data['cbo'] ?? null,
            $data['piso_salarial'] ?? null
        ]);
        $data['id'] = $conn->lastInsertId();
        http_response_code(201);
        echo json_encode($data);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(["error" => "Erro ao criar cargo: " . $e->getMessage()]);
    }
}
elseif ($method == 'PUT' && $id) {
    $data = getJsonInput();
    
    $sql = "UPDATE cargos SET nome = ?, cbo = ?, piso_salarial = ?, ativo = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    try {
        $stmt->execute([
            $data['nome'],
            $data['cbo'] ?? null,
            $data['piso_salarial'] ?? null,
            $data['ativo'] ?? 1,
            $id
        ]);
        echo json_encode(["message" => "Cargo atualizado com sucesso"]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(["error" => "Erro ao atualizar cargo"]);
    }
}
elseif ($method == 'DELETE' && $id) {
    try {
        $stmt = $conn->prepare("DELETE FROM cargos WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Cargo excluído"]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(["error" => "Não foi possível excluir o cargo (pode estar em uso)"]);
    }
}
?>
