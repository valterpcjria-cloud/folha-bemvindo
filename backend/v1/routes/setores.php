<?php
// /backend/v1/routes/setores.php
// Bem Vindo (Fase A.1): setores da empresa, em ordem (ordem = ordem dos blocos na matriz do DP).
// Setor não é excluído: é desativado, para preservar o histórico das competências encerradas.

$method = $_SERVER['REQUEST_METHOD'];
$empresa_id = (int)$authUser['id_empresa'];
$sub = $route_parts[1] ?? null;

try {
    if ($method === 'GET') {
        $stmt = $conn->prepare("
            SELECT s.id, s.nome, s.ordem, s.ativo,
                   (SELECT COUNT(*) FROM funcionarios f WHERE f.id_empresa = s.id_empresa AND f.id_setor = s.id AND f.status <> 'DESLIGADO') AS qtd_funcionarios,
                   (SELECT COUNT(*) FROM cargos c WHERE c.id_empresa = s.id_empresa AND c.id_setor = s.id) AS qtd_cargos
            FROM setores s
            WHERE s.id_empresa = ?
            ORDER BY s.ordem ASC, s.nome ASC");
        $stmt->execute([$empresa_id]);
        echo json_encode(["data" => $stmt->fetchAll()]);
        exit;
    }

    requireRole($authUser, ['ADMIN', 'RH']);
    $data = getJsonInput() ?? [];

    if ($method === 'POST' && $sub === 'reordenar') {
        // { ids: [3, 1, 2, ...] } na nova ordem
        $ids = array_values(array_filter(array_map('intval', $data['ids'] ?? [])));
        if (!$ids) {
            http_response_code(400);
            echo json_encode(["error" => "Informe a nova ordem dos setores."]);
            exit;
        }
        $conn->beginTransaction();
        $stmt = $conn->prepare("UPDATE setores SET ordem = ? WHERE id = ? AND id_empresa = ?");
        foreach ($ids as $i => $id) {
            $stmt->execute([$i + 1, $id, $empresa_id]);
        }
        $conn->commit();
        registrarLog($conn, $authUser['user_id'], 'SETOR', 0, 'REORDENACAO', "Reordenou os setores", $empresa_id);
        echo json_encode(["success" => true]);
        exit;
    }

    if ($method === 'POST') {
        $nome = trim((string)($data['nome'] ?? ''));
        if ($nome === '' || mb_strlen($nome) > 100) {
            http_response_code(400);
            echo json_encode(["error" => "Nome do setor inválido", "message" => "Informe um nome com até 100 caracteres."]);
            exit;
        }
        $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM setores WHERE id_empresa = ?");
        $stmt->execute([$empresa_id]);
        $ordem = (int)$stmt->fetchColumn();

        $stmt = $conn->prepare("INSERT INTO setores (id_empresa, nome, ordem, ativo) VALUES (?, ?, ?, 1)");
        $stmt->execute([$empresa_id, $nome, $ordem]);
        $id = (int)$conn->lastInsertId();
        registrarLog($conn, $authUser['user_id'], 'SETOR', $id, 'CRIACAO', "Criou o setor $nome", $empresa_id);
        http_response_code(201);
        echo json_encode(["id" => $id, "nome" => $nome, "ordem" => $ordem, "ativo" => 1]);
        exit;
    }

    if ($method === 'PUT' && $sub) {
        $id = (int)$sub;
        $stmt = $conn->prepare("SELECT nome, ativo FROM setores WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);
        $atual = $stmt->fetch();
        if (!$atual) {
            http_response_code(404);
            echo json_encode(["error" => "Setor não encontrado."]);
            exit;
        }
        $nome = array_key_exists('nome', $data) ? trim((string)$data['nome']) : $atual['nome'];
        $ativo = array_key_exists('ativo', $data) ? ((int)!!$data['ativo']) : (int)$atual['ativo'];
        if ($nome === '' || mb_strlen($nome) > 100) {
            http_response_code(400);
            echo json_encode(["error" => "Nome do setor inválido", "message" => "Informe um nome com até 100 caracteres."]);
            exit;
        }
        $stmt = $conn->prepare("UPDATE setores SET nome = ?, ativo = ? WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$nome, $ativo, $id, $empresa_id]);
        $mudancas = [];
        if ($nome !== $atual['nome']) $mudancas[] = "renomeou de {$atual['nome']} para $nome";
        if ($ativo !== (int)$atual['ativo']) $mudancas[] = $ativo ? 'reativou' : 'desativou';
        registrarLog($conn, $authUser['user_id'], 'SETOR', $id, 'ALTERACAO', "Setor $nome: " . ($mudancas ? implode(', ', $mudancas) : 'sem mudanças'), $empresa_id);
        echo json_encode(["id" => $id, "nome" => $nome, "ativo" => $ativo]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["error" => "Operação não suportada."]);
} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["error" => "Já existe um setor com esse nome."]);
        exit;
    }
    error_log('[setores] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Erro ao processar setores."]);
}
