<?php
// /api/v1/routes/logs.php

requireRole($authUser, ['SUPERADMIN']);

$method = $_SERVER['REQUEST_METHOD'];
if ($method == 'GET') {
    $logDir = __DIR__ . '/../sys_logs';
    if (!is_dir($logDir)) @mkdir($logDir, 0777, true);
    
    try {
        $isSuper = ($authUser['perfil'] === 'SUPERADMIN');
        
        if ($isSuper) {
            // SuperAdmin vê tudo (logs de empresas + logs globais/null)
            $sql = "SELECT l.*, u.nome as usuario, e.razao_social as empresa_nome 
                    FROM logs_auditoria l 
                    LEFT JOIN usuarios u ON l.usuario_id = u.id 
                    LEFT JOIN empresas e ON l.id_empresa = e.id 
                    ORDER BY l.created_at DESC LIMIT 200";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
        } else {
            // Usuário comum vê apenas os logs da sua própria empresa (Ignora logs globais/null por segurança)
            // E TAMBÉM oculta logs gerados por SuperAdmins para manter privacidade master
            $sql = "SELECT l.*, u.nome as usuario 
                    FROM logs_auditoria l 
                    LEFT JOIN usuarios u ON l.usuario_id = u.id 
                    WHERE l.id_empresa = ? 
                    AND (u.perfil IS NULL OR u.perfil != 'SUPERADMIN')
                    ORDER BY l.created_at DESC LIMIT 100";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$authUser['id_empresa']]);
        }
        
        $logs = $stmt->fetchAll();
        
        // Formatar para o frontend (Garante ISO 8601 para o Date do JS)
        $data = array_map(function($log) use ($isSuper) {
            return [
                "id" => $log['id'],
                "usuario" => $log['usuario'] ?? 'Sistema',
                "empresa" => $isSuper ? ($log['empresa_nome'] ?? 'Global') : null,
                "acao" => $log['acao'] ?? 'DESCONHECIDO',
                "entidade" => $log['entidade'] ?? 'SISTEMA',
                "detalhes" => $log['detalhes'] ?? '',
                "data" => str_replace(' ', 'T', $log['created_at'] ?? date('Y-m-d H:i:s')) 
            ];
        }, $logs);
        
        echo json_encode($data);
    } catch (Exception $e) {
        file_put_contents($logDir . '/debug_logs_error.log', date('Y-m-d H:i:s') . " - Error in logs.php: " . $e->getMessage() . "\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(["error" => "Falha ao carregar logs", "details" => $e->getMessage()]);
    }
}
?>