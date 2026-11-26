<?php
// /backend/v1/routes/dependentes.php

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($route_parts[1]) ? $route_parts[1] : null;

// Bem Vindo v1.4.0: só ADMIN/RH gravam (perfis de consulta — leitura, contabilidade, diretor — só leem)
if ($method !== 'GET') {
    requireRole($authUser, ['ADMIN', 'RH']);
}

// Se a URL for /dependentes/funcionario/{id}, busca dependentes daquele funcionário
if ($method == 'GET' && isset($route_parts[1]) && $route_parts[1] === 'funcionario' && isset($route_parts[2])) {
    $funcId = $route_parts[2];
    $stmt = $conn->prepare("SELECT * FROM dependentes WHERE funcionario_id = ?");
    $stmt->execute([$funcId]);
    echo json_encode(["data" => $stmt->fetchAll()]);
    exit;
}

if ($method == 'POST') {
    $data = getJsonInput();
    
    $sql = "INSERT INTO dependentes (funcionario_id, nome, cpf, data_nascimento, tipo_parentesco, irrf, salario_familia) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    try {
        $stmt->execute([
            $data['funcionario_id'],
            $data['nome'],
            $data['cpf'] ?? null,
            $data['data_nascimento'],
            $data['tipo_parentesco'],
            $data['irrf'] ?? 0,
            $data['salario_familia'] ?? 0
        ]);
        $data['id'] = $conn->lastInsertId();
        http_response_code(201);
        echo json_encode($data);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(["error" => "Erro ao adicionar dependente: " . $e->getMessage()]);
    }
}
elseif ($method == 'DELETE' && $id) {
    $stmt = $conn->prepare("DELETE FROM dependentes WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Dependente removido"]);
}
?>
