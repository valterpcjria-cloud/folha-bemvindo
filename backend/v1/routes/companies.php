<?php
// /backend/v1/routes/companies.php

// Apenas SUPERADMIN pode acessar esta rota
// DEBUG: Log do usuário que está tentando acessar
file_put_contents(__DIR__ . '/../sys_logs/auth_debug.log', date('Y-m-d H:i:s') . " - User: " . (is_array($authUser) ? $authUser['email'] . " | Role: " . $authUser['perfil'] : 'ANONYMOUS') . "\n", FILE_APPEND);

// SUPERADMIN ou ADMIN podem entrar nesta rota (GET)
requireRole($authUser, ['SUPERADMIN', 'ADMIN']);

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    // Listar todas as empresas com estatísticas básicas
    $sql = "
        SELECT 
            e.*, 
            (SELECT COUNT(*) FROM funcionarios f WHERE f.id_empresa = e.id) as total_funcionarios,
            (SELECT COUNT(*) FROM usuarios u WHERE u.id_empresa = e.id) as total_usuarios
        FROM empresas e 
        ORDER BY e.data_cadastro DESC
    ";
    $stmt = $conn->query($sql);
    $allCompanies = $stmt->fetchAll();

    // DEBUG: Log da contagem encontrada
    file_put_contents(__DIR__ . '/../sys_logs/auth_debug.log', date('Y-m-d H:i:s') . " - Query Result Count: " . count($allCompanies) . "\n", FILE_APPEND);

    echo json_encode(["data" => $allCompanies]);
}
elseif ($method == 'POST') {
    requireRole($authUser, ['SUPERADMIN']); 
    $data = getJsonInput();

    // Se tiver ID, é UPDATE
    if (isset($data['id']) && $data['id'] > 0) {
        $sql = "UPDATE empresas SET 
                    razao_social = ?, 
                    cnpj = ?, 
                    uf = ?,
                    nome_cidade = ?,
                    slug = ?, 
                    ativa = ?,
                    valor_mensalidade = ?,
                    plano = ?,
                    limite_funcionarios = ?,
                    vencimento_dia = ?
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['razao_social'],
            $data['cnpj'] ?? null,
            $data['uf'] ?? null,
            $data['nome_cidade'] ?? null,
            $data['slug'],
            $data['ativa'] ?? 1,
            $data['valor_mensalidade'] ?? 0,
            $data['plano'] ?? 'BRONZE',
            $data['limite_funcionarios'] ?? 10,
            $data['vencimento_dia'] ?? 10,
            $data['id']
        ]);
        registrarLog($conn, $authUser['user_id'], 'EMPRESA', $data['id'], 'ALTERACAO', "Atualizou empresa: {$data['razao_social']}", 0);
        echo json_encode(["success" => true]);
    }
    else {
        // INSERT - Cadastro de Nova Empresa com SEEDING
        $conn->beginTransaction();
        try {
            // 1. Criar a Empresa
            $sql = "INSERT INTO empresas (razao_social, cnpj, uf, nome_cidade, slug, ativa, valor_mensalidade, plano, limite_funcionarios, vencimento_dia) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['razao_social'],
                $data['cnpj'] ?? null,
                $data['uf'] ?? null,
                $data['nome_cidade'] ?? null,
                $data['slug'],
                $data['ativa'] ?? 1,
                $data['valor_mensalidade'] ?? 0,
                $data['plano'] ?? 'BRONZE',
                $data['limite_funcionarios'] ?? 10,
                $data['vencimento_dia'] ?? 10
            ]);
            $newEmpresaId = $conn->lastInsertId();

            // 2. SEEDING: Parâmetros do Sistema Padrão
            $defaultParams = [
                ['RAZAO_SOCIAL', $data['razao_social'], 'TEXTO'],
                ['CNPJ', $data['cnpj'] ?? '', 'TEXTO'],
                ['CODIGO_SERIAL_ERP', 'GERADO-' . strtoupper($data['slug']), 'TEXTO'],
                ['TETO_INSS', '7507.49', 'NUMERO'],
                ['ALIQUOTA_FGTS', '8.0', 'NUMERO'],
                ['FAIXA_ISENCAO_IRRF', '2112.00', 'NUMERO'],
                ['VALOR_DEDUCAO_DEPENDENTE', '189.59', 'NUMERO']
            ];

            $sqlParam = "INSERT INTO parametros_sistema (id_empresa, chave, valor, tipo) VALUES (?, ?, ?, ?)";
            $stmtParam = $conn->prepare($sqlParam);
            foreach ($defaultParams as $p) {
                $stmtParam->execute([$newEmpresaId, $p[0], $p[1], $p[2]]);
            }

            // 3. Criar Usuário Admin inicial para a empresa
            if (!empty($data['admin_email'])) {
                // v4.57.0 (C5): senha inicial 'frimelo123' (informada na tela) vale só até o 1º login
                $sqlUser = "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, id_empresa, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 1)";
                $senhaPadrao = password_hash('frimelo123', PASSWORD_DEFAULT);
                $stmtUser = $conn->prepare($sqlUser);
                $stmtUser->execute([
                    'Admin ' . $data['razao_social'],
                    $data['admin_email'],
                    $senhaPadrao,
                    'ADMIN',
                    1,
                    $newEmpresaId
                ]);
            }

            $conn->commit();
            registrarLog($conn, $authUser['user_id'], 'EMPRESA', $newEmpresaId, 'CRIACAO', "Criou nova empresa SaaS: {$data['razao_social']}", 0);

            http_response_code(201);
            echo json_encode(["success" => true, "id" => $newEmpresaId]);
        }
        catch (Exception $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao criar empresa", "message" => $e->getMessage()]);
        }
    }
}
elseif ($method == 'DELETE') {
    requireRole($authUser, ['SUPERADMIN']);
    // Excluir empresa (Cuidado: cascata vai limpar tudo)
    $id = $_GET['id'] ?? null;
    if ($id && $id > 1) { // Protege a Frimelo (ID 1)
        $stmt = $conn->prepare("DELETE FROM empresas WHERE id = ?");
        $stmt->execute([$id]);
        registrarLog($conn, $authUser['user_id'], 'EMPRESA', $id, 'EXCLUSAO', "Removeu empresa SaaS ID $id", 0);
        echo json_encode(["success" => true]);
    }
    else {
        http_response_code(400);
        echo json_encode(["error" => "ID inválido ou protegido"]);
    }
}
?>