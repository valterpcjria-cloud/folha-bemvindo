<?php
// backend/v1/routes/atestados.php

/**
 * Módulo de Atestados por Competência.
 * A presença de um atestado zera a Assiduidade (833) do funcionário na competência.
 * Tabela isolada de lancamentos_eventos → não afeta exportação/importação.
 *
 * Rotas:
 *   GET  /atestados?competencia_id=X   → { data: [funcionario_id, ...], dias: { funcionario_id: dias|null } }
 *   POST /atestados                    → { funcionario_id, competencia_id, tem_atestado: bool, dias?: int|null }
 *
 * Bem Vindo v1.1.0: quantidade de dias do atestado (coluna `dias`, migration 11). A regra da
 * Assiduidade não muda: basta existir o atestado. Escrita só em competência ABERTA da empresa.
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
        try {
            $stmt = $conn->prepare(
                "SELECT funcionario_id, dias FROM competencia_atestados
                 WHERE competencia_id = ? AND id_empresa = ?"
            );
            $stmt->execute([$competenciaId, $empresaId]);
            $ids = [];
            $dias = new stdClass(); // objeto JSON mesmo quando vazio
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $fid = (int)$row['funcionario_id'];
                $ids[] = $fid;
                $dias->{$fid} = $row['dias'] === null ? null : (int)$row['dias'];
            }
            echo json_encode(["data" => $ids, "dias" => $dias]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao carregar atestados: " . $e->getMessage()]);
        }
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

        // Dias (opcional): inteiro 1..31; vazio/0 = não informado (NULL)
        $temDias = array_key_exists('dias', $data);
        $dias = null;
        if ($temDias && $data['dias'] !== null && $data['dias'] !== '') {
            $dias = (int)$data['dias'];
            if ($dias < 0 || $dias > 31) {
                http_response_code(400);
                echo json_encode(["message" => "Dias de atestado devem estar entre 1 e 31."]);
                exit;
            }
            if ($dias === 0) $dias = null;
        }

        try {
            // Funcionário e competência precisam ser da empresa; competência FECHADA é imutável
            $stmt = $conn->prepare("SELECT 1 FROM funcionarios WHERE id = ? AND id_empresa = ?");
            $stmt->execute([$funcionarioId, $empresaId]);
            $funcOk = (bool)$stmt->fetchColumn();
            $stmt = $conn->prepare("SELECT status FROM competencias WHERE id = ? AND id_empresa = ?");
            $stmt->execute([$competenciaId, $empresaId]);
            $statusComp = $stmt->fetchColumn();
            if (!$funcOk || $statusComp === false) {
                http_response_code(404);
                echo json_encode(["message" => "Funcionário ou competência não encontrados nesta empresa."]);
                exit;
            }
            if ($statusComp !== 'ABERTA') {
                http_response_code(409);
                echo json_encode(["message" => "Competência fechada: atestado não pode ser alterado."]);
                exit;
            }

            if ($temAtestado && $temDias) {
                $stmt = $conn->prepare(
                    "INSERT INTO competencia_atestados (funcionario_id, competencia_id, id_empresa, dias)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE dias = VALUES(dias)"
                );
                $stmt->execute([$funcionarioId, $competenciaId, $empresaId, $dias]);
            } elseif ($temAtestado) {
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
            echo json_encode(["success" => true, "tem_atestado" => $temAtestado, "dias" => $temAtestado ? $dias : null]);
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
