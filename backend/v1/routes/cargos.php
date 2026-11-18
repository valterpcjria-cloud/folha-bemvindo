<?php
// /backend/v1/routes/cargos.php
// Bem Vindo (Fase A.1): cargos da empresa, ligados a um setor e com posição na hierarquia
// (ordem_hierarquia: 1 = topo, ex.: Líder → Encarregado → Açougueiro → Auxiliar).
// Antes: sem filtro por empresa e sem checagem de perfil (qualquer usuário criava/excluía).

$method = $_SERVER['REQUEST_METHOD'];
$empresa_id = (int)$authUser['id_empresa'];
$sub = $route_parts[1] ?? null;

/** Confere se o setor é da empresa; null = sem setor. */
function cargoSetorValido(PDO $conn, $idSetor, int $empresa_id): ?int
{
    if ($idSetor === null || $idSetor === '' || (int)$idSetor <= 0) return null;
    $stmt = $conn->prepare("SELECT id FROM setores WHERE id = ? AND id_empresa = ?");
    $stmt->execute([(int)$idSetor, $empresa_id]);
    if (!$stmt->fetch()) {
        http_response_code(400);
        echo json_encode(["error" => "Setor inválido para esta empresa."]);
        exit;
    }
    return (int)$idSetor;
}

try {
    if ($method === 'GET') {
        $params = [$empresa_id];
        $where = "c.id_empresa = ?";
        if (isset($_GET['setor'])) {
            $where .= " AND c.id_setor = ?";
            $params[] = (int)$_GET['setor'];
        }
        $stmt = $conn->prepare("
            SELECT c.id, c.nome, c.cbo, c.piso_salarial, c.ativo, c.id_setor, c.ordem_hierarquia,
                   s.nome AS setor_nome,
                   (SELECT COUNT(*) FROM funcionarios f WHERE f.id_empresa = c.id_empresa AND f.id_cargo = c.id AND f.status <> 'DESLIGADO') AS qtd_funcionarios
            FROM cargos c
            LEFT JOIN setores s ON s.id = c.id_setor AND s.id_empresa = c.id_empresa
            WHERE $where
            ORDER BY s.ordem ASC, c.ordem_hierarquia ASC, c.nome ASC");
        $stmt->execute($params);
        echo json_encode(["data" => $stmt->fetchAll()]);
        exit;
    }

    requireRole($authUser, ['ADMIN', 'RH']);
    $data = getJsonInput() ?? [];

    if ($method === 'POST' && $sub === 'reordenar') {
        // { ids: [...] } na nova ordem hierárquica (1 = topo)
        $ids = array_values(array_filter(array_map('intval', $data['ids'] ?? [])));
        if (!$ids) {
            http_response_code(400);
            echo json_encode(["error" => "Informe a nova ordem dos cargos."]);
            exit;
        }
        $conn->beginTransaction();
        $stmt = $conn->prepare("UPDATE cargos SET ordem_hierarquia = ? WHERE id = ? AND id_empresa = ?");
        foreach ($ids as $i => $id) {
            $stmt->execute([$i + 1, $id, $empresa_id]);
        }
        $conn->commit();
        registrarLog($conn, $authUser['user_id'], 'CARGO', 0, 'REORDENACAO', "Reordenou a hierarquia de cargos", $empresa_id);
        echo json_encode(["success" => true]);
        exit;
    }

    if ($method === 'POST') {
        $nome = trim((string)($data['nome'] ?? ''));
        if ($nome === '' || mb_strlen($nome) > 150) {
            http_response_code(400);
            echo json_encode(["error" => "Nome do cargo inválido", "message" => "Informe um nome com até 150 caracteres."]);
            exit;
        }
        $idSetor = cargoSetorValido($conn, $data['id_setor'] ?? null, $empresa_id);
        $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem_hierarquia), 0) + 1 FROM cargos WHERE id_empresa = ? AND id_setor <=> ?");
        $stmt->execute([$empresa_id, $idSetor]);
        $ordem = (int)$stmt->fetchColumn();

        $stmt = $conn->prepare("INSERT INTO cargos (id_empresa, id_setor, nome, cbo, piso_salarial, ordem_hierarquia, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([$empresa_id, $idSetor, $nome, ($data['cbo'] ?? null) ?: null, ($data['piso_salarial'] ?? null) ?: null, $ordem]);
        $id = (int)$conn->lastInsertId();
        registrarLog($conn, $authUser['user_id'], 'CARGO', $id, 'CRIACAO', "Criou o cargo $nome", $empresa_id);
        http_response_code(201);
        echo json_encode(["id" => $id, "nome" => $nome, "id_setor" => $idSetor, "ordem_hierarquia" => $ordem, "ativo" => 1]);
        exit;
    }

    if ($method === 'PUT' && $sub) {
        $id = (int)$sub;
        $stmt = $conn->prepare("SELECT * FROM cargos WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);
        $atual = $stmt->fetch();
        if (!$atual) {
            http_response_code(404);
            echo json_encode(["error" => "Cargo não encontrado."]);
            exit;
        }
        $nome = array_key_exists('nome', $data) ? trim((string)$data['nome']) : $atual['nome'];
        if ($nome === '' || mb_strlen($nome) > 150) {
            http_response_code(400);
            echo json_encode(["error" => "Nome do cargo inválido", "message" => "Informe um nome com até 150 caracteres."]);
            exit;
        }
        $idSetor = array_key_exists('id_setor', $data) ? cargoSetorValido($conn, $data['id_setor'], $empresa_id) : ($atual['id_setor'] !== null ? (int)$atual['id_setor'] : null);
        $cbo = array_key_exists('cbo', $data) ? (($data['cbo'] ?? '') ?: null) : $atual['cbo'];
        $piso = array_key_exists('piso_salarial', $data) ? (($data['piso_salarial'] ?? '') ?: null) : $atual['piso_salarial'];
        $ativo = array_key_exists('ativo', $data) ? (int)!!$data['ativo'] : (int)$atual['ativo'];

        $stmt = $conn->prepare("UPDATE cargos SET nome = ?, id_setor = ?, cbo = ?, piso_salarial = ?, ativo = ? WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$nome, $idSetor, $cbo, $piso, $ativo, $id, $empresa_id]);

        // Renomeou: mantém o nome do cargo igual nos funcionários (usado em contracheque, relatórios e exportação)
        if ($nome !== $atual['nome']) {
            $stmt = $conn->prepare("UPDATE funcionarios SET cargo = ? WHERE id_cargo = ? AND id_empresa = ?");
            $stmt->execute([$nome, $id, $empresa_id]);
        }
        registrarLog($conn, $authUser['user_id'], 'CARGO', $id, 'ALTERACAO', "Atualizou o cargo $nome", $empresa_id);
        echo json_encode(["id" => $id, "nome" => $nome, "id_setor" => $idSetor, "ativo" => $ativo]);
        exit;
    }

    if ($method === 'DELETE' && $sub) {
        $id = (int)$sub;
        $stmt = $conn->prepare("SELECT COUNT(*) FROM funcionarios WHERE id_cargo = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);
        if ((int)$stmt->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(["error" => "Cargo em uso", "message" => "Há funcionários neste cargo. Desative o cargo em vez de excluir, para preservar o histórico."]);
            exit;
        }
        $stmt = $conn->prepare("DELETE FROM cargos WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$id, $empresa_id]);
        registrarLog($conn, $authUser['user_id'], 'CARGO', $id, 'EXCLUSAO', "Excluiu o cargo ID $id", $empresa_id);
        echo json_encode(["success" => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["error" => "Operação não suportada."]);
} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["error" => "Já existe um cargo com esse nome neste setor."]);
        exit;
    }
    error_log('[cargos] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Erro ao processar cargos."]);
}
