<?php
// /backend/v1/routes/deep_cleanup.php

// EXTREMAMENTE CRÍTICO: Módulo de Destruição de Dados
requireRole($authUser, ['SUPERADMIN']);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = getJsonInput();
    $type = $data['type'] ?? ''; // 'users' ou 'companies'
    $ids = $data['ids'] ?? [];

    if (empty($ids) || !is_array($ids)) {
        http_response_code(400);
        echo json_encode(["error" => "Lista de IDs inválida"]);
        exit;
    }

    $conn->beginTransaction();
    try {
        $count = 0;
        $errors = [];

        if ($type === 'companies') {
            foreach ($ids as $id) {
                $id = (int)$id;
                // Proteção: Nunca deletar Frimelo (ID 1)
                if ($id <= 1) {
                    $errors[] = "Empresa ID $id é protegida e não pode ser removida.";
                    continue;
                }

                $stmt = $conn->prepare("DELETE FROM empresas WHERE id = ?");
                $stmt->execute([$id]);
                
                registrarLog($conn, $authUser['user_id'], 'DEEP_CLEANUP', $id, 'BULK_DELETE_COMPANY', "Remoção crítica da empresa ID $id pelo SuperAdmin", 0);
                $count++;
            }
        } 
        elseif ($type === 'users') {
            foreach ($ids as $id) {
                $id = (int)$id;
                // Proteção: Nunca deletar a si mesmo
                if ($id === (int)$authUser['user_id']) {
                    $errors[] = "Você não pode excluir seu próprio usuário durante a limpeza.";
                    continue;
                }

                $stmt = $conn->prepare("DELETE FROM usuarios WHERE id = ?");
                $stmt->execute([$id]);

                registrarLog($conn, $authUser['user_id'], 'DEEP_CLEANUP', $id, 'BULK_DELETE_USER', "Remoção crítica do usuário ID $id pelo SuperAdmin", 0);
                $count++;
            }
        } else {
            throw new Exception("Tipo de entidade desconhecido: $type");
        }

        $conn->commit();
        echo json_encode([
            "success" => true, 
            "deleted_count" => $count,
            "errors" => $errors
        ]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Falha na transação crítica", "message" => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Método não permitido"]);
}
