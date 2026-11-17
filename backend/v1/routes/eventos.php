
<?php
// /api/v1/routes/eventos.php

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    // Garante que os eventos 62 e 833 existam no banco para não quebrar a Foreign Key na hora de salvar lançamentos
    $check_stmt = $conn->prepare("SELECT COUNT(*) FROM eventos_folha WHERE codigo_evento IN (62, 833)");
    $check_stmt->execute();
    if ($check_stmt->fetchColumn() < 2) {
        $conn->exec("INSERT IGNORE INTO eventos_folha (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao) VALUES 
        (62, 'Insalubridade s/ Mínimo', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 1, 6),
        (833, 'Prêmio Assiduidade', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 1, 7)");
    }

    // Qualquer usuário autenticado pode ver eventos
    // Ordenamos por TIPO (CREDITO antes de DEBITO) e depois pela Ordem de Exportação/Código
    $stmt = $conn->prepare("SELECT * FROM eventos_folha ORDER BY tipo ASC, ordem_exportacao ASC, codigo_evento ASC");
    $stmt->execute();
    echo json_encode(["data" => $stmt->fetchAll()]);
} 
elseif ($method == 'POST') {
    // Apenas ADMIN e RH podem criar eventos
    requireRole($authUser, ['ADMIN', 'RH']);

    $data = getJsonInput();
    
    // Previne alteração de eventos obrigatórios via API se necessário
    $sql = "INSERT INTO eventos_folha (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['codigo_evento'],
        $data['nome_evento'],
        $data['tipo'],
        $data['natureza'] ?? 'PROVENTO',
        $data['unidade'] ?? 'VALOR',
        $data['obrigatorio'] ?? 0,
        $data['ordem_exportacao'] ?? 99
    ]);
    
    $data['id'] = $conn->lastInsertId();
    http_response_code(201);
    echo json_encode($data);
}
elseif ($method == 'PUT') {
    // Apenas ADMIN e RH podem editar eventos
    requireRole($authUser, ['ADMIN', 'RH']);

    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ID do evento é obrigatório"]);
        exit;
    }
    
    $data = getJsonInput();
    
    // Converter boolean para int (false == 0, true == 1)
    $incide_inss = isset($data['incide_inss']) ? ($data['incide_inss'] ? 1 : 0) : 1;
    $incide_fgts = isset($data['incide_fgts']) ? ($data['incide_fgts'] ? 1 : 0) : 1;
    $incide_irrf = isset($data['incide_irrf']) ? ($data['incide_irrf'] ? 1 : 0) : 1;
    
    // Verifica se está atualizando fórmula
    if (isset($data['formula'])) {
        $sql = "UPDATE eventos_folha SET formula = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$data['formula'], $id]);
        
        // REGISTRAR LOG
        registrarLog($conn, $authUser['user_id'] ?? 0, 'EVENTO', $id, 'UPDATE', "Atualizou a fórmula do evento ID $id (" . ($data['nome_evento'] ?? 'sem nome') . ")");
        
        echo json_encode(["success" => true, "id" => $id, "formula_saved" => true]);
    } else {
        // Atualiza campos de incidência
        $sql = "UPDATE eventos_folha SET 
                incide_inss = ?,
                incide_fgts = ?,
                incide_irrf = ?
                WHERE id = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([ $incide_inss, $incide_fgts, $incide_irrf, $id ]);
        
        // REGISTRAR LOG
        registrarLog($conn, $authUser['user_id'] ?? 0, 'EVENTO', $id, 'UPDATE', "Atualizou incidências (INSS/FGTS/IRRF) do evento ID $id");
        
        echo json_encode(["success" => true, "id" => $id, "incide_inss" => $incide_inss, "incide_fgts" => $incide_fgts, "incide_irrf" => $incide_irrf]);
    }
}
?>
