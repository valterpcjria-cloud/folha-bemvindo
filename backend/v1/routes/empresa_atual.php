<?php
// /backend/v1/routes/empresa_atual.php
// Bem Vindo: dados públicos da empresa logada (cabeçalho do contracheque/impressões).
// Antes o cabeçalho tinha "FRIGORIFICO FRIMELO" escrito fixo no código da tela.

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Operação não suportada."]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT razao_social, cnpj, nome_cidade, uf FROM empresas WHERE id = ?");
    $stmt->execute([(int)$authUser['id_empresa']]);
    $empresa = $stmt->fetch();
    if (!$empresa) {
        http_response_code(404);
        echo json_encode(["error" => "Empresa não encontrada."]);
        exit;
    }
    echo json_encode(["data" => $empresa]);
} catch (PDOException $e) {
    error_log('[empresa_atual] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Erro ao carregar a empresa."]);
}
