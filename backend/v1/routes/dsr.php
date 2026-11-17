<?php
// /backend/v1/routes/dsr.php

require_once __DIR__ . '/../services/DsrService.php';
$service = new DsrService($conn);

$method = $_SERVER['REQUEST_METHOD'];
$action = $route_parts[1] ?? '';

if ($method === 'GET') {
    $empresa_id = $authUser['id_empresa'];
    
    // api/v1/dsr/eventos_base — Retorna todos os eventos ativos que geram DSR
    if ($action === 'eventos_base') {
        $eventos = $service->buscarEventosQueGeramDSR();
        echo json_encode(['data' => $eventos]);
        exit;
    }

    // api/v1/dsr/base_calculo?funcionario_id=X&competencia_id=Y
    if ($action === 'base_calculo') {
        $funcId = (int)($_GET['funcionario_id'] ?? 0);
        $compId = (int)($_GET['competencia_id'] ?? 0);

        if ($funcId <= 0 || $compId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Parâmetros funcionario_id e competencia_id são obrigatórios."]);
            exit;
        }

        $resultado = $service->calcularBaseDSR($funcId, $compId);
        echo json_encode(['data' => $resultado]);
        exit;
    }

    // api/v1/dsr/dias_uteis?competencia_id=X — dias úteis do mês da competência
    if ($action === 'dias_uteis') {
        $compId = (int)($_GET['competencia_id'] ?? 0);
        if ($compId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Parâmetro competencia_id é obrigatório."]);
            exit;
        }
        $resultado = $service->calcularDiasUteisMes($compId, (int)($authUser['id_empresa'] ?? 1));
        if ($resultado === null) {
            http_response_code(404);
            echo json_encode(["error" => "Competência não encontrada."]);
            exit;
        }
        echo json_encode(['data' => $resultado]);
        exit;
    }

    // api/v1/dsr/dias_dsr?competencia_id=X — dias DSR (domingos + feriados) do mês
    if ($action === 'dias_dsr') {
        $compId = (int)($_GET['competencia_id'] ?? 0);
        if ($compId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Parâmetro competencia_id é obrigatório."]);
            exit;
        }
        $resultado = $service->calcularDiasDSRMes($compId, (int)($authUser['id_empresa'] ?? 1));
        if ($resultado === null) {
            http_response_code(404);
            echo json_encode(["error" => "Competência não encontrada."]);
            exit;
        }
        echo json_encode(['data' => $resultado]);
        exit;
    }

    // api/v1/dsr/faltas_dsr?funcionario_id=X&competencia_id=Y — faltas que causam perda de DSR
    if ($action === 'faltas_dsr') {
        $funcId = (int)($_GET['funcionario_id'] ?? 0);
        $compId = (int)($_GET['competencia_id'] ?? 0);

        if ($funcId <= 0 || $compId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Parâmetros funcionario_id e competencia_id são obrigatórios."]);
            exit;
        }

        $resultado = $service->buscarFaltasQuePerdemDSR($funcId, $compId);
        echo json_encode(['data' => $resultado]);
        exit;
    }

    if ($action === 'competencia') {
        $compId = (int)($route_parts[2] ?? 0);
        if ($compId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "ID da competência inválido."]);
            exit;
        }
        
        $dados = $service->getListByCompetencia($compId, $empresaId);
        echo json_encode(['data' => $dados]);
        exit;
    }
    
    // api/v1/dsr/fila/{id} <-- Recalcula toda a fila da competencia (usado internamente em background mas pode ser forcado)
    if ($action === 'processar_fila') {
        $compId = (int)($route_parts[2] ?? 0);
        $res = $service->processarFilaCompetencia($compId, $authUser['user_id'] ?? 'api', $empresaId);
        echo json_encode($res);
        exit;
    }
    
    http_response_code(404);
    echo json_encode(["error" => "Endpoint GET de DSR não encontrado."]);
}
elseif ($method === 'POST') {
    requireRole($authUser, ['ADMIN', 'RH']);
    $data = getJsonInput();
    
    // api/v1/dsr/falta
    if ($action === 'falta') {
        $funcId = (int)($data['funcionario_id'] ?? 0);
        $compId = (int)($data['competencia_id'] ?? 0);
        $dataFalta = $data['data_falta'] ?? null;
        
        if (!$funcId || !$compId || !$dataFalta) {
            http_response_code(400);
            echo json_encode(["error" => "Parâmetros incorretos para registrar falta pré-DSR."]);
            exit;
        }
        
        $sucesso = $service->registrarFalta($funcId, $compId, $dataFalta);
        echo json_encode(["success" => $sucesso]);
        exit;
    }
    
    // api/v1/dsr/recalcular_individual
    if ($action === 'recalcular_individual') {
        $funcId = (int)($data['funcionario_id'] ?? 0);
        $compId = (int)($data['competencia_id'] ?? 0);
        $empresaId = $authUser['id_empresa'];
        
        $res = $service->calcular($funcId, $compId, 'manual_admin', $empresaId);
        echo json_encode(["success" => true, "resultado" => $res]);
        exit;
    }

    // api/v1/dsr/calcular — Calcula DSR usando os helpers isolados (nova implementação)
    if ($action === 'calcular') {
        $funcId  = (int)($data['funcionario_id'] ?? 0);
        $compId  = (int)($data['competencia_id'] ?? 0);
        $usuario = $authUser['user_id'] ?? 'api';

        if ($funcId <= 0 || $compId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Parâmetros funcionario_id e competencia_id são obrigatórios."]);
            exit;
        }

        $resultado = $service->calcularDSR($funcId, $compId, $usuario, $authUser['id_empresa'] ?? 1);

        if ($resultado === null) {
            http_response_code(404);
            echo json_encode(["error" => "Competência não encontrada."]);
            exit;
        }

        echo json_encode(["success" => true, "data" => $resultado]);
        exit;
    }
    
    http_response_code(404);
    echo json_encode(["error" => "Endpoint POST de DSR não encontrado."]);
}
?>
