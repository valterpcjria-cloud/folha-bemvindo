<?php
declare(strict_types=1);

/**
 * Migration System
 * 
 * Gerencia a execução de scripts SQL de forma incremental e segura.
 */
class MigrationSystem
{
    private PDO $conn;
    private string $migrationDir;

    public function __construct(PDO $conn, string $migrationDir)
    {
        $this->conn = $conn;
        $this->migrationDir = $migrationDir;
        $this->initTable();
    }

    private function initTable(): void
    {
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS _migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                version VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
    }

    public function run(): array
    {
        $executed = [];
        $files = glob($this->migrationDir . '/*.sql');
        sort($files); 

        foreach ($files as $file) {
            $version = basename($file);
            
            // Verifica se já foi executada para evitar reprocessamento desnecessário de arquivos inteiros
            $stmt = $this->conn->prepare("SELECT id FROM _migrations WHERE version = ?");
            $stmt->execute([$version]);
            
            if (!$stmt->fetch()) {
                $sqlContent = file_get_contents($file);
                if ($sqlContent) {
                    echo "Executando migração: $version...\n";
                    try {
                        // O PDO->exec() nativo as vezes falha com scripts multi-comando dependendo do driver
                        // Vamos rodar o script como um todo, mas se falhar, tentamos logar o erro real
                        $this->conn->exec($sqlContent);
                        
                        $ins = $this->conn->prepare("INSERT INTO _migrations (version) VALUES (?)");
                        $ins->execute([$version]);
                        
                        $executed[] = $version;
                        echo "Sucesso: $version\n";
                    } catch (Exception $e) {
                        $errorMsg = $e->getMessage();
                        // Se o erro for de coluna duplicada ou algo que ignoramos no script idempotente, podemos tratar aqui
                        // Mas o ideal é que o script SQL trate isso via 'IF NOT EXISTS'
                        echo "ERRO em $version: " . $errorMsg . "\n";
                        error_log("Erro na migração $version: " . $errorMsg);
                        break;
                    }
                }
            }
        }
        return $executed;
    }
}
