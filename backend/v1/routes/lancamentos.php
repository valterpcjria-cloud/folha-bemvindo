<?php
// /api/v1/routes/lancamentos.php

require_once __DIR__ . '/../services/LancamentoService.php';
$service = new LancamentoService($conn);

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $comp_id = isset($_GET['competencia_id']) ? (int)$_GET['competencia_id'] : null;
    $empresa_id = $authUser['id_empresa'];

    if (!$comp_id) {
        http_response_code(400);
        echo json_encode(["error" => "competencia_id é obrigatório"]);
        exit;
    }

    echo json_encode($service->getByCompetencia($comp_id, $empresa_id));

}
elseif ($method == 'POST') {
    requireRole($authUser, ['ADMIN', 'RH']);
    $empresa_id = $authUser['id_empresa'];
    $user_id = $authUser['user_id'];

    $data = getJsonInput();
    $is_import = ($route_parts[1] ?? '') === 'import';

    try {
        if ($is_import && is_array($data)) {
            $result = $service->saveBulk($data, $empresa_id, $user_id);
            echo json_encode($result);
        }
        else {
            $success = $service->saveSingle($data, $empresa_id, $user_id);
            if ($success) {
                echo json_encode(["success" => true]);
            } else {
                throw new Exception("Falha ao salvar lançamento.");
            }
        }
    }
    catch (CompetenciaTravadaException $e) {
        http_response_code(409);
        echo json_encode(["error" => $e->getMessage()]);
    }
    catch (Exception $e) {
        file_put_contents(dirname(__DIR__) . '/sys_logs/lancamentos_error.log', date('Y-m-d H:i:s') . " - EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(["error" => "Erro no processamento do lançamento", "message" => $e->getMessage()]);
    }
}
?>