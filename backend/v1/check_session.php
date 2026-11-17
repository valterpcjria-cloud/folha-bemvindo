<?php
// backend/v1/check_session.php
require_once 'config.php';
require_once 'middleware/auth.php';

header('Content-Type: application/json');

try {
    // Tenta capturar o payload do token enviado no header
    $payload = requireAuth('check_session');

    echo json_encode([
        "status" => "Autenticado",
        "user" => $payload
    ], JSON_PRETTY_PRINT);

}
catch (Exception $e) {
    // Se falhar o requireAuth, ele já vai dar echo no erro e exit,
    // mas se houver outro erro, capturamos aqui.
    echo json_encode([
        "status" => "Erro na verificação",
        "error" => $e->getMessage()
    ]);
}
?>