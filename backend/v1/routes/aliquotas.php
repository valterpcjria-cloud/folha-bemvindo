<?php
// /api/v1/routes/aliquotas.php
// Gerencia alíquotas de INSS, IRRF e parâmetros fiscais

$route_action = $route_parts[1] ?? '';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($route_action === 'inss') {
            // Buscar alíquotas INSS vigentes
            $stmt = $conn->prepare("
                SELECT id, faixa_inicio, faixa_fim, aliquota, vigencia_inicio 
                FROM aliquotas_inss 
                WHERE ativo = 1 
                AND vigencia_inicio <= CURDATE() 
                AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
                ORDER BY faixa_inicio ASC
            ");
            $stmt->execute();
            echo json_encode($stmt->fetchAll());
        } 
        elseif ($route_action === 'irrf') {
            // Buscar alíquotas IRRF vigentes
            $stmt = $conn->prepare("
                SELECT id, faixa_inicio, faixa_fim, aliquota, parcela_deduzir, vigencia_inicio 
                FROM aliquotas_irrf 
                WHERE ativo = 1 
                AND vigencia_inicio <= CURDATE() 
                AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
                ORDER BY faixa_inicio ASC
            ");
            $stmt->execute();
            echo json_encode($stmt->fetchAll());
        }
        elseif ($route_action === 'parametros') {
            // Buscar parâmetros fiscais filtrados por empresa
            $empresa_id = $authUser['id_empresa'];
            $stmt = $conn->prepare("
                SELECT chave, valor, tipo 
                FROM parametros_sistema 
                WHERE chave IN ('TETO_INSS', 'ALIQUOTA_FGTS', 'FAIXA_ISENCAO_IRRF', 'VALOR_DEDUCAO_DEPENDENTE')
                AND id_empresa = ?
            ");
            $stmt->execute([$empresa_id]);
            $params = [];
            foreach ($stmt->fetchAll() as $row) {
                $params[$row['chave']] = $row['tipo'] === 'NUMERO' ? floatval($row['valor']) : $row['valor'];
            }
            echo json_encode($params);
        }
        else {
            // Retornar todas as alíquotas e parâmetros
            $empresa_id = $authUser['id_empresa'];
            $result = [
                'inss' => [],
                'irrf' => [],
                'parametros' => []
            ];
            
            // INSS (Global)
            $stmt = $conn->query("
                SELECT * FROM aliquotas_inss 
                WHERE ativo = 1 AND vigencia_inicio <= CURDATE() 
                ORDER BY faixa_inicio
            ");
            $result['inss'] = $stmt->fetchAll();
            
            // IRRF (Global)
            $stmt = $conn->query("
                SELECT * FROM aliquotas_irrf 
                WHERE ativo = 1 AND vigencia_inicio <= CURDATE() 
                ORDER BY faixa_inicio
            ");
            $result['irrf'] = $stmt->fetchAll();
            
            // Parâmetros (Tenant-specific)
            $stmt = $conn->prepare("SELECT chave, valor, tipo FROM parametros_sistema WHERE id_empresa = ?");
            $stmt->execute([$empresa_id]);
            foreach ($stmt->fetchAll() as $row) {
                $result['parametros'][$row['chave']] = $row['tipo'] === 'NUMERO' ? floatval($row['valor']) : $row['valor'];
            }
            
            echo json_encode($result);
        }
        break;
        
    case 'POST':
        // Atualizar parâmetros (admin only)
        requireRole($authUser, ['ADMIN', 'RH']);
        $empresa_id = $authUser['id_empresa'];
        $data = getJsonInput();
        
        if (isset($data['chave']) && isset($data['valor'])) {
            $stmt = $conn->prepare("
                UPDATE parametros_sistema SET valor = ? WHERE chave = ? AND id_empresa = ?
            ");
            $stmt->execute([$data['valor'], $data['chave'], $empresa_id]);
            
            echo json_encode(['success' => true, 'message' => 'Parâmetro atualizado']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Chave e valor são obrigatórios']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>
