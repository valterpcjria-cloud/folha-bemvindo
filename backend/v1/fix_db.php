<?php
// fix_db.php - Script de reparo do banco de dados
require_once 'config.php';

header('Content-Type: application/json');

$response = [
    "steps" => [],
    "success" => false
];

try {
    // 1. Contar linhas totais antes
    $totalBefore = $conn->query("SELECT COUNT(*) FROM lancamentos_eventos")->fetchColumn();
    $response["steps"][] = "Total de lançamentos antes: $totalBefore";

    // 2. Identificar duplicatas (mesmo funcionario, competencia, evento)
    $dupes = $conn->query("
        SELECT funcionario_id, competencia_id, evento_id, COUNT(*) as qtd 
        FROM lancamentos_eventos 
        GROUP BY funcionario_id, competencia_id, evento_id 
        HAVING qtd > 1
    ")->fetchAll();
    
    $response["steps"][] = "Grupos duplicados encontrados: " . count($dupes);

    if (count($dupes) > 0) {
        // 3. Remover duplicatas (manter o maior ID)
        $deleted = $conn->exec("
            DELETE t1 FROM lancamentos_eventos t1
            INNER JOIN lancamentos_eventos t2 
            WHERE t1.id < t2.id 
            AND t1.funcionario_id = t2.funcionario_id 
            AND t1.competencia_id = t2.competencia_id 
            AND t1.evento_id = t2.evento_id
        ");
        $response["steps"][] = "Lançamentos duplicados removidos: $deleted";
    }

    // 4. Verificar se a chave existe
    $checkKey = $conn->query("SHOW KEYS FROM lancamentos_eventos WHERE Key_name = 'uk_lancamento_evento'")->fetch();
    
    if ($checkKey) {
        $response["steps"][] = "Chave única 'uk_lancamento_evento' já existe.";
    } else {
        // 5. Adicionar chave única
        $conn->exec("ALTER TABLE lancamentos_eventos ADD UNIQUE KEY `uk_lancamento_evento` (`funcionario_id`, `competencia_id`, `evento_id`)");
        $response["steps"][] = "Chave única 'uk_lancamento_evento' CRIADA COM SUCESSO.";
    }

    $response["success"] = true;

} catch (Exception $e) {
    $response["error"] = $e->getMessage();
    $response["steps"][] = "ERRO FATAL: " . $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
