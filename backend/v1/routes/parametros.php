<?php
// /backend/v1/routes/parametros.php

requireRole($authUser, ['SUPERADMIN']);

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $empresa_id = $authUser['id_empresa'];

    $stmt = $conn->prepare("SELECT chave, valor, descricao, tipo FROM parametros_sistema WHERE id_empresa = ?");
    $stmt->execute([$empresa_id]);
    $params = $stmt->fetchAll();

    $response = [];
    foreach ($params as $p) {
        // Converte valor baseado no tipo
        $val = $p['valor'];
        if ($p['tipo'] === 'NUMERO')
            $val = floatval($val);
        if ($p['tipo'] === 'BOOLEANO')
            $val = ($val === '1' || $val === 'true');

        $response[$p['chave']] = [
            'valor' => $val,
            'descricao' => $p['descricao']
        ];
    }

    echo json_encode(["data" => $response]);
}
elseif ($method == 'POST') {
    // Atualiza ou Cria um parâmetro
    $data = getJsonInput();
    $empresa_id = $authUser['id_empresa'];

    if (!isset($data['chave']) || !isset($data['valor'])) {
        http_response_code(400);
        echo json_encode(["error" => "Chave e Valor são obrigatórios"]);
        exit;
    }

    $sql = "INSERT INTO parametros_sistema (chave, valor, descricao, tipo, id_empresa) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE valor = VALUES(valor), descricao = VALUES(descricao)";

    $stmt = $conn->prepare($sql);
    try {
        $stmt->execute([
            $data['chave'],
            $data['valor'],
            $data['descricao'] ?? null,
            $data['tipo'] ?? 'TEXTO',
            $empresa_id
        ]);
        echo json_encode(["message" => "Parâmetro salvo com sucesso"]);
    }
    catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(["error" => "Erro ao salvar parâmetro"]);
    }
}
?>