<?php
// backend/v1/update_assiduidade.php
require_once 'config.php';

try {
    echo "<h3>Updating Event 833 (Prêmio Assiduidade) to PERCENTUAL...</h3>";
    
    $sql = "UPDATE eventos_folha SET unidade = 'PERCENTUAL' WHERE codigo_evento IN (833, 62)";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    
    $rows = $stmt->rowCount();
    echo "Done! Updated $rows events.<br>";
    
    // Verify
    $verify = $conn->query("SELECT id, codigo_evento, nome_evento, unidade FROM eventos_folha WHERE codigo_evento IN (833, 62)")->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($verify);
    echo "</pre>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
