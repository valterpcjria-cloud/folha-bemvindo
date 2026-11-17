<?php
// /backend/v1/routes/users.php

requireRole($authUser, ['SUPERADMIN']);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Listar usuários - SUPERADMIN vê tudo, ADMIN/RH vê apenas da empresa
        $empresa_id = $authUser['id_empresa'];
        $is_super = ($authUser['perfil'] === 'SUPERADMIN');

        try {
            if ($is_super) {
                $sql = "SELECT id, id_empresa, nome, email, perfil, ativo, created_at FROM usuarios ORDER BY nome ASC";
                $stmt = $conn->query($sql);
            } else {
                // Filtra para que não-SuperAdmins nunca vejam contas SuperAdmin, mesmo na mesma empresa
                $sql = "SELECT id, id_empresa, nome, email, perfil, ativo, created_at FROM usuarios WHERE id_empresa = ? AND perfil != 'SUPERADMIN' ORDER BY nome ASC";
                $stmt = $conn->prepare($sql);
                $stmt->execute([$empresa_id]);
            }
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($users);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Erro ao listar usuários: " . $e->getMessage()]);
        }
        break;

    case 'POST':
        // Apenas SUPERADMIN pode criar/editar usuários (restrição global no topo)
        $empresa_id = $authUser['id_empresa'];
        
        $data = getJsonInput();
        
        // Se for ADMIN normal, ele não pode mudar o id_empresa (forçado do token)
        // Se for SUPERADMIN, ele pode opcionalmente passar o id_empresa alvo
        $target_empresa_id = ($authUser['perfil'] === 'SUPERADMIN' && isset($data['id_empresa'])) 
            ? $data['id_empresa'] 
            : $empresa_id;

        // Validação básica
        if (empty($data['nome']) || empty($data['email'])) {
            http_response_code(400);
            echo json_encode(["error" => "Nome e Email são obrigatórios"]);
            exit;
        }

        // Restrição Crítica: Não permite que não-SUPERADMIN crie ou promova usuários para SUPERADMIN
        if ($authUser['perfil'] !== 'SUPERADMIN' && ($data['perfil'] ?? '') === 'SUPERADMIN') {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado", "message" => "Apenas Super Admins podem criar ou gerenciar outros Super Admins"]);
            exit;
        }

        try {
            if (isset($data['id']) && $data['id'] > 0) {
                // UPDATE
                // Garante que se não for SUPERADMIN, ele só edita usuários da sua empresa
                $checkWhere = ($authUser['perfil'] === 'SUPERADMIN') ? "id = ?" : "id = ? AND id_empresa = ?";
                $checkParams = ($authUser['perfil'] === 'SUPERADMIN') ? [$data['id']] : [$data['id'], $empresa_id];

                // Validação de Alvo: Se não for SuperAdmin, verifica se o usuário alvo é um SuperAdmin
                if ($authUser['perfil'] !== 'SUPERADMIN') {
                    $stmtCheck = $conn->prepare("SELECT perfil FROM usuarios WHERE id = ?");
                    $stmtCheck->execute([$data['id']]);
                    $targetPerfil = $stmtCheck->fetchColumn();
                    if ($targetPerfil === 'SUPERADMIN') {
                        http_response_code(403);
                        echo json_encode(["error" => "Acesso negado", "message" => "Você não tem permissão para gerenciar este usuário"]);
                        exit;
                    }
                }

                $sql = "UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ?, id_empresa = ? WHERE " . $checkWhere;
                $params = [$data['nome'], $data['email'], $data['perfil'] ?? 'RH', $data['ativo'] ?? 1, $target_empresa_id, ...$checkParams];
                
                // Se enviou senha, atualiza também (v4.57.0: senha redefinida → troca obrigatória no próximo login;
                // v4.58.0: exceto quando o usuário altera a PRÓPRIA senha — ele já a conhece)
                if (!empty($data['senha'])) {
                    $propriaConta = (int)$data['id'] === (int)($authUser['user_id'] ?? 0);
                    $sql = "UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ?, id_empresa = ?, senha_hash = ?, must_change_password = ? WHERE " . $checkWhere;
                    $params = [$data['nome'], $data['email'], $data['perfil'] ?? 'RH', $data['ativo'] ?? 1, $target_empresa_id, password_hash($data['senha'], PASSWORD_DEFAULT), $propriaConta ? 0 : 1, ...$checkParams];
                }

                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                
                registrarLog($conn, $authUser['user_id'], 'USUARIO', $data['id'], 'ATUALIZACAO', "Atualizou usuário ID {$data['id']} ({$data['email']})", $target_empresa_id);
                echo json_encode(["message" => "Usuário atualizado com sucesso", "id" => $data['id']]);

            } else {
                // INSERT (v4.57.0: sem senha informada → senha temporária aleatória; sempre troca no 1º login)
                $sql = "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, id_empresa, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 1)";
                $senhaGerada = empty($data['senha']);
                $senha = $senhaGerada ? AuthSession::gerarSenhaTemporaria() : $data['senha'];
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    $data['nome'], 
                    $data['email'], 
                    password_hash($senha, PASSWORD_DEFAULT),
                    $data['perfil'] ?? 'RH',
                    $data['ativo'] ?? 1,
                    $target_empresa_id
                ]);
                
                $newId = $conn->lastInsertId();
                registrarLog($conn, $authUser['user_id'], 'USUARIO', $newId, 'CRIACAO', "Criou usuário {$data['email']}", $target_empresa_id);
                $resposta = ["message" => "Usuário criado com sucesso", "id" => $newId];
                if ($senhaGerada) {
                    // Exibida uma única vez ao superadmin — não é armazenada em texto puro
                    $resposta['senha_temporaria'] = $senha;
                }
                echo json_encode($resposta);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Erro ao salvar usuário: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Apenas SUPERADMIN pode excluir usuários (restrição global no topo)
        $empresa_id = $authUser['id_empresa'];
        
        $id = $_GET['id'] ?? 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "ID não informado"]);
            exit;
        }

        try {
            // Validação de Alvo antes da exclusão
            if ($authUser['perfil'] !== 'SUPERADMIN') {
                $stmtCheck = $conn->prepare("SELECT perfil FROM usuarios WHERE id = ?");
                $stmtCheck->execute([$id]);
                $targetPerfil = $stmtCheck->fetchColumn();
                if ($targetPerfil === 'SUPERADMIN') {
                    http_response_code(403);
                    echo json_encode(["error" => "Acesso negado", "message" => "Você não tem permissão para excluir um Super Admin"]);
                    exit;
                }
            }

            $sql = ($authUser['perfil'] === 'SUPERADMIN') 
                ? "DELETE FROM usuarios WHERE id = ?" 
                : "DELETE FROM usuarios WHERE id = ? AND id_empresa = ?";
            $params = ($authUser['perfil'] === 'SUPERADMIN') ? [$id] : [$id, $empresa_id];

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            
            registrarLog($conn, $authUser['user_id'], 'USUARIO', $id, 'EXCLUSAO', "Excluiu usuário ID $id", $empresa_id);
            echo json_encode(["message" => "Usuário excluído com sucesso"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Erro ao excluir usuário: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método não permitido"]);
        break;
}
?>
