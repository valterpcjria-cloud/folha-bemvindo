<?php
// probe_paths.php
require_once 'config.php';
require_once 'middleware/auth.php';

// Protegido: apenas SUPERADMIN
$authUser = requireAuth('probe_paths');
requireRole($authUser, ['SUPERADMIN']);

header('Content-Type: application/json');
echo json_encode([
    "dir" => basename(__DIR__),
    "request_uri" => $_SERVER['REQUEST_URI']
]);
?>
