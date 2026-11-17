<?php
// backend/v1/routes/atestados.php

/**
 * Módulo de Atestados por Competência.
 * A presença de um atestado zera a Assiduidade (833) do funcionário na competência.
 * Tabela isolada de lancamentos_eventos → não afeta exportação/importação.
 *
 * Rotas:
 *   GET  /atestados?competencia_id=X   → { data: [funcionario_id, ...] }
 *   POST /atestados                    → { funcionario_id, competencia_id, tem_atestado: bool }
 */

$method = $_SERVER['REQUEST_METHOD'];

// Apenas ADMIN, SUPERADMIN e RH gerenciam atestados
if ($authUser['perfil'] !== 'ADMIN' && $authUser['perfil'] !== 'SUPERADMIN' && $authUser['perfil'] !== 'RH') {
    http_response_code(403);
    echo json_encode(["message" => "Acesso negado."]);
    exit;
}

$empresaId = (int)($authUser['id_empresa'] ?? 1);

switch ($method) {
    case 'GET':
        $competenciaId = (int)($_GET['competencia_id'] ?? 0);
        if ($competenciaId <= 0) {
            http_response_code(400);
            echo json_encode(["message" => "competencia_id é obrigatório."]);
            exit;
        }
        $stmt = $conn->prepare(
            "SELECT funcionario_id FROM competencia_atestados
             WHERE competencia_id = ? AND id_empresa = ?"
        );
        $stmt->execute([$competenciaId, $empresaId]);
        $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(["data" => array_map('intval', $ids)]);
        break;

    case 'POST':
        $data = getJsonInput();
        $funcionarioId = (int)($data['funcionario_id'] ?? 0);
        $competenciaId = (int)($data['competencia_id'] ?? 0);
        $temAtestado   = !empty($data['tem_atestado']);

        if ($funcionarioId <= 0 || $competenciaId <= 0) {
            http_response_code(400);
            echo json_encode(["message" => "funcionario_id e competencia_id são obrigatórios."]);
            exit;
        }

        try {
            if ($temAtestado) {
                $stmt = $conn->prepare(
                    "INSERT IGNORE INTO competencia_atestados (funcionario_id, competencia_id, id_empresa)
                     VALUES (?, ?, ?)"
                );
                $stmt->execute([$funcionarioId, $competenciaId, $empresaId]);
            } else {
                $stmt = $conn->prepare(
                    "DELETE FROM competencia_atestados
                     WHERE funcionario_id = ? AND competencia_id = ? AND id_empresa = ?"
                );
                $stmt->execute([$funcionarioId, $competenciaId, $empresaId]);
            }
            echo json_encode(["success" => true, "tem_atestado" => $temAtestado]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao salvar atestado: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método $method não permitido."]);
        break;
}
