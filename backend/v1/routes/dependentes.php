<?php
// /backend/v1/routes/dependentes.php

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

// Se a URL for /dependentes/funcionario/{id}, busca dependentes daquele funcionário
if ($method == 'GET' && isset($route_parts[1]) && $route_parts[1] === 'funcionario' && isset($route_parts[2])) {
    $funcId = $route_parts[2];
    if (!$funcionarioDaEmpresa($funcId)) $naoEncontrado();
    $stmt = $conn->prepare("SELECT * FROM dependentes WHERE funcionario_id = ?");
    $stmt->execute([$funcId]);
    echo json_encode(["data" => $stmt->fetchAll()]);
    exit;
}

if ($method == 'POST') {
    $data = getJsonInput();
    if (!$funcionarioDaEmpresa($data['funcionario_id'] ?? 0)) $naoEncontrado();
    
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
        error_log('[dependentes] ' . $e->getMessage());
        echo json_encode(["error" => "Erro ao adicionar dependente. Confira os dados."]);
    }
}
elseif ($method == 'DELETE' && $id) {
    $stmt = $conn->prepare("DELETE t FROM dependentes t JOIN funcionarios f ON f.id = t.funcionario_id WHERE t.id = ? AND f.id_empresa = ?");
    $stmt->execute([(int)$id, $empresaId]);
    if ($stmt->rowCount() === 0) $naoEncontrado();
    echo json_encode(["message" => "Dependente removido"]);
}
?>
