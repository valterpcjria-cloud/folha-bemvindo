<?php
// backend/v1/routes/feriados.php

/**
 * Módulo de Gerenciamento de Feriados
 * Permite CRUD de feriados e integra com o DSR.
 */

$method = $_SERVER['REQUEST_METHOD'];
$id = $route_parts[1] ?? null;

// Só admins, superadmins e RH podem gerenciar feriados (Bem Vindo v1.4.0: consulta liberada a todos os perfis)
if ($method !== 'GET' && $authUser['perfil'] !== 'ADMIN' && $authUser['perfil'] !== 'SUPERADMIN' && $authUser['perfil'] !== 'RH') {
    http_response_code(403);
    echo json_encode(["message" => "Acesso negado. Apenas administradores podem gerenciar feriados."]);
    exit;
}

$empresaId = (int)($authUser['id_empresa'] ?? 1);

/**
 * Função Auxiliar: Marca todos os funcionários para recálculo de DSR 
 * se um feriado for alterado em competência aberta.
 */
function marcarRecalculoDsrAposFeriado($conn, $empresaId) {
    // 1. Busca competências em aberto para esta empresa
    $stmtComp = $conn->prepare("SELECT id FROM competencias WHERE status = 'ABERTA' AND id_empresa = ?");
    $stmtComp->execute([$empresaId]);
    $comps = $stmtComp->fetchAll(PDO::FETCH_COLUMN);

    if (empty($comps)) return;

    // 2. Para cada competência aberta, marca recálculo para todos os funcionários ativos
    foreach ($comps as $compId) {
        $sql = "INSERT IGNORE INTO dsr_fila_recalculo (funcionario_id, competencia_id, id_empresa)
                SELECT id, ?, ? FROM funcionarios 
                WHERE id_empresa = ? AND status = 'ATIVO'
                ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$compId, $empresaId, $empresaId]);
    }
}

switch ($method) {
    case 'GET':
        if ($id && is_numeric($id)) {
            $stmt = $conn->prepare("SELECT * FROM feriados WHERE id = ? AND (empresa_id = ? OR empresa_id IS NULL)");
            $stmt->execute([$id, $empresaId]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($res) {
                echo json_encode(["data" => $res]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Feriado não encontrado."]);
            }
        } else {
            // Listagem de feriados aplicáveis à empresa
            // Inclui nacionais (empresa_id IS NULL) e específicos da empresa
            // Lista TODOS os feriados (ativos e inativos) para permitir religar via switcher.
            // O filtro ativo = 1 fica a cargo do cálculo do DSR (DsrService), não da tela.
            $sql = "SELECT id, nome, data, tipo, uf, cidade, recorrente, ativo, empresa_id
                    FROM feriados
                    WHERE (empresa_id = :emp_id OR empresa_id IS NULL)
                    ORDER BY CASE WHEN tipo = 'nacional' THEN 1 WHEN tipo = 'estadual' THEN 2 ELSE 3 END, data ASC";
            $stmt = $conn->prepare($sql);
            $stmt->execute([':emp_id' => $empresaId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["data" => $rows]);
        }
        break;

    case 'POST':
        $data = getJsonInput();
        
        if (empty($data['nome']) || empty($data['data']) || empty($data['tipo'])) {
            http_response_code(400);
            echo json_encode(["message" => "Nome, Data e Tipo são campos obrigatórios."]);
            exit;
        }

        // Validação de tipo x UF/Cidade
        if ($data['tipo'] === 'estadual' && empty($data['uf'])) {
            http_response_code(400);
            echo json_encode(["message" => "UF é obrigatória para feriados estaduais."]);
            exit;
        }
        if ($data['tipo'] === 'municipal' && empty($data['cidade'])) {
            http_response_code(400);
            echo json_encode(["message" => "Cidade é obrigatória para feriados municipais."]);
            exit;
        }

        try {
            $sql = "INSERT INTO feriados (nome, data, tipo, uf, cidade, recorrente, ativo, empresa_id) 
                    VALUES (:nome, :data, :tipo, :uf, :cidade, :recorrente, 1, :empresa_id)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $data['nome'],
                ':data' => $data['data'],
                ':tipo' => $data['tipo'],
                ':uf' => $data['uf'] ?? null,
                ':cidade' => $data['cidade'] ?? null,
                ':recorrente' => isset($data['recorrente']) ? (int)$data['recorrente'] : 1,
                ':empresa_id' => ($data['tipo'] === 'nacional' && $authUser['perfil'] === 'SUPERADMIN') ? null : $empresaId
            ]);

            // Se for alteração manual, dispara recálculo de DSR
            marcarRecalculoDsrAposFeriado($conn, $empresaId);

            echo json_encode(["success" => true, "id" => $conn->lastInsertId(), "message" => "Feriado cadastrado e recálculo de DSR agendado."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao salvar feriado: " . $e->getMessage()]);
        }
        break;

    case 'PUT':
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "ID do feriado não fornecido."]);
            exit;
        }
        
        $data = getJsonInput();

        $sql = "UPDATE feriados SET 
                nome = :nome, data = :data, tipo = :tipo, 
                uf = :uf, cidade = :cidade, recorrente = :recorrente,
                ativo = :ativo
                WHERE id = :id AND (empresa_id = :empresa_id OR :is_super = 1)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':nome' => $data['nome'],
            ':data' => $data['data'],
            ':tipo' => $data['tipo'],
            ':uf' => $data['uf'] ?? null,
            ':cidade' => $data['cidade'] ?? null,
            ':recorrente' => isset($data['recorrente']) ? (int)$data['recorrente'] : 1,
            ':ativo' => isset($data['ativo']) ? (int)$data['ativo'] : 1,
            ':id' => $id,
            ':empresa_id' => $empresaId,
            ':is_super' => ($authUser['perfil'] === 'SUPERADMIN' ? 1 : 0)
        ]);

        marcarRecalculoDsrAposFeriado($conn, $empresaId);

        echo json_encode(["success" => true, "message" => "Feriado atualizado e recálculo de DSR agendado."]);
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "ID do feriado não fornecido."]);
            exit;
        }

        // Bem Vindo v1.5.1: antes misturava "?" com ":is_super" (HY093 → apagar feriado dava erro)
        $stmt = $conn->prepare("DELETE FROM feriados WHERE id = ? AND (empresa_id = ? OR ? = 1)");
        $stmt->execute([$id, $empresaId, ($authUser['perfil'] === 'SUPERADMIN' ? 1 : 0)]);

        marcarRecalculoDsrAposFeriado($conn, $empresaId);

        echo json_encode(["success" => true, "message" => "Feriado removido e recálculo de DSR agendado."]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método $method não permitido para esta rota."]);
        break;
}
