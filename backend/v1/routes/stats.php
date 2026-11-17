<?php
// /api/v1/routes/stats.php

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $empresa_id = $authUser['id_empresa'];

    $total_stmt = $conn->prepare("SELECT COUNT(*) FROM funcionarios WHERE status = 'ATIVO' AND id_empresa = ?");
    $total_stmt->execute([$empresa_id]);
    $total_funcionarios = $total_stmt->fetchColumn();

    $comp_stmt = $conn->prepare("SELECT * FROM competencias WHERE id_empresa = ? ORDER BY ano DESC, mes DESC LIMIT 1");
    $comp_stmt->execute([$empresa_id]);
    $competencia_atual = $comp_stmt->fetch();
    
    $investimento_por_setor = [];
    $distribuicao_eventos = [];
    $maior_centro_custo = "N/A";
    $custo_total = 0;
    $total_lancamentos = 0;
    $evolucao_data = [];
    
    if ($competencia_atual) {
        $comp_id = $competencia_atual['id'];

        $qlanc = $conn->prepare("SELECT COUNT(*) FROM lancamentos_eventos WHERE competencia_id = ? AND id_empresa = ?");
        $qlanc->execute([$comp_id, $empresa_id]);
        $total_lancamentos = $qlanc->fetchColumn();
        
        $custo = $conn->prepare("SELECT SUM(valor_total) FROM lancamentos_eventos l JOIN eventos_folha e ON l.evento_id = e.id WHERE l.competencia_id = ? AND l.id_empresa = ? AND e.tipo = 'CREDITO'");
        $custo->execute([$comp_id, $empresa_id]);
        $custo_total = $custo->fetchColumn() ?: 0;

        // Investimento por Setor (Centro de Custo)
        $setor_query = $conn->prepare("
            SELECT COALESCE(NULLIF(f.centro_custo, ''), 'Geral') as name, SUM(l.valor_total) as valor 
            FROM lancamentos_eventos l 
            JOIN funcionarios f ON l.funcionario_id = f.id 
            JOIN eventos_folha e ON l.evento_id = e.id 
            WHERE l.competencia_id = ? AND l.id_empresa = ? AND e.tipo = 'CREDITO' 
            GROUP BY f.centro_custo
            ORDER BY valor DESC
        ");
        $setor_query->execute([$comp_id, $empresa_id]);
        $investimento_por_setor = array_map(function($row) {
            return [
                'name' => (string)$row['name'],
                'valor' => (float)$row['valor']
            ];
        }, $setor_query->fetchAll(PDO::FETCH_ASSOC));

        if (count($investimento_por_setor) > 0) {
            $maior_centro_custo = $investimento_por_setor[0]['name'];
        }

        // Distribuição da Folha (Eventos)
        $evento_query = $conn->prepare("
            SELECT e.nome_evento as name, SUM(l.valor_total) as value 
            FROM lancamentos_eventos l 
            JOIN eventos_folha e ON l.evento_id = e.id 
            WHERE l.competencia_id = ? AND l.id_empresa = ? AND e.tipo = 'CREDITO' 
            GROUP BY e.nome_evento
            HAVING value > 0
            ORDER BY value DESC
        ");
        $evento_query->execute([$comp_id, $empresa_id]);
        $distribuicao_eventos = array_map(function($row) {
            return [
                'name' => (string)$row['name'],
                'value' => (float)$row['value']
            ];
        }, $evento_query->fetchAll(PDO::FETCH_ASSOC));

        // Evolução de Custo (Últimas 6 competências da empresa)
        $evolucao_query = $conn->prepare("
            SELECT 
                CONCAT(LPAD(c.mes, 2, '0'), '/', SUBSTR(c.ano, 3)) as name,
                COALESCE(SUM(CASE WHEN e.tipo = 'CREDITO' THEN l.valor_total ELSE 0 END), 0) as total
            FROM competencias c
            LEFT JOIN lancamentos_eventos l ON c.id = l.competencia_id AND l.id_empresa = ?
            LEFT JOIN eventos_folha e ON l.evento_id = e.id
            WHERE c.id_empresa = ?
            GROUP BY c.id, c.mes, c.ano
            ORDER BY c.ano DESC, c.mes DESC
            LIMIT 6
        ");
        $evolucao_query->execute([$empresa_id, $empresa_id]);
        $historico = array_reverse($evolucao_query->fetchAll(PDO::FETCH_ASSOC));
        $evolucao_data = array_map(function($row) {
            return [
                'name' => (string)$row['name'],
                'total' => (float)$row['total']
            ];
        }, $historico);
    }

    echo json_encode([
        "total_funcionarios" => $total_funcionarios,
        "custo_total" => (float)$custo_total,
        "competencia" => $competencia_atual ? str_pad($competencia_atual['mes'], 2, '0', STR_PAD_LEFT) . '/' . $competencia_atual['ano'] : 'N/A',
        "total_lancamentos" => (int)$total_lancamentos,
        "status_competencia" => $competencia_atual ? $competencia_atual['status'] : 'FECHADA',
        "investimento_por_setor" => $investimento_por_setor,
        "distribuicao_folha" => $distribuicao_eventos,
        "maior_centro_custo" => $maior_centro_custo,
        "evolucao_custo" => $evolucao_data
    ]);
}
?>