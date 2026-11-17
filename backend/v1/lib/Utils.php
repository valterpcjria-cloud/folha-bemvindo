<?php
declare(strict_types=1);

// /backend/v1/lib/Utils.php

class Utils
{

    /**
     * Helper para ler entrada JSON
     */
    public static function getJsonInput()
    {
        $input = file_get_contents("php://input");
        return json_decode($input, true) ?? [];
    }

    /**
     * Helper para Registrar Logs de Auditoria
     */
    public static function registrarLog($conn, $usuario_id, $entidade, $entidade_id, $acao, $detalhes, $empresa_id = null)
    {
        try {
            $logDir = dirname(__DIR__) . '/sys_logs';
            if (!is_dir($logDir))
                @mkdir($logDir, 0777, true);

            // Se usuario_id for 0 ou nulo, usa NULL para o banco (evita erro de FK)
            $uid = ($usuario_id > 0) ? $usuario_id : null;

            // Se id_empresa não for passado, tenta pegar do contexto global se existir, senão usa NULL (Global)
            $eid = $empresa_id;
            if ($eid === null && isset($GLOBALS['authUser']['id_empresa'])) {
                $eid = $GLOBALS['authUser']['id_empresa'];
            }

            $sql = "INSERT INTO logs_auditoria (usuario_id, id_empresa, entidade, entidade_id, acao, detalhes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $conn->prepare($sql);
            $success = $stmt->execute([$uid, $eid, $entidade, $entidade_id, $acao, $detalhes]);

            if (!$success) {
                file_put_contents($logDir . '/audit_error.log', date('Y-m-d H:i:s') . " - DB Execute Failed: " . print_r($stmt->errorInfo(), true) . "\n", FILE_APPEND);
            }
            return $success;
        }
        catch (Exception $e) {
            $logDir = dirname(__DIR__) . '/sys_logs';
            if (!is_dir($logDir))
                @mkdir($logDir, 0777, true);
            file_put_contents($logDir . '/audit_error.log', date('Y-m-d H:i:s') . " - Exception: " . $e->getMessage() . "\n", FILE_APPEND);
            return false;
        }
    }
}

// Manter compatibilidade com código existente que chama as funções globalmente
if (!function_exists('getJsonInput')) {
    function getJsonInput()
    {
        return Utils::getJsonInput();
    }
}

if (!function_exists('registrarLog')) {
    function registrarLog($conn, $usuario_id, $entidade, $entidade_id, $acao, $detalhes, $empresa_id = null)
    {
        return Utils::registrarLog($conn, $usuario_id, $entidade, $entidade_id, $acao, $detalhes, $empresa_id);
    }
}