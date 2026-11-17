<?php
// backend/v1/fix_saas_db.php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

try {
    echo "<h2>Reparando Tabelas SaaS</h2>";

    // 1. Tabela Empresas
    $conn->exec("CREATE TABLE IF NOT EXISTS empresas (
        id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        razao_social        VARCHAR(255) NOT NULL,
        cnpj                VARCHAR(20) NULL,
        slug                VARCHAR(100) NOT NULL UNIQUE,
        ativa               TINYINT(1) DEFAULT 1,
        valor_mensalidade   DECIMAL(10,2) DEFAULT 0,
        plano               ENUM('BRONZE','SILVER','GOLD','PLATINUM') DEFAULT 'BRONZE',
        limite_funcionarios INT DEFAULT 10,
        vencimento_dia      INT DEFAULT 10,
        data_cadastro       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "✔ Tabela 'empresas' verificada.<br>";

    // 2. Tabela Parâmetros do Sistema (global/multitenant)
    $conn->exec("CREATE TABLE IF NOT EXISTS parametros_sistema (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_empresa  INT UNSIGNED NOT NULL,
        chave       VARCHAR(100) NOT NULL,
        valor       TEXT NULL,
        tipo        ENUM('TEXTO','NUMERO','BOOLEANO','JSON') DEFAULT 'TEXTO',
        descricao   VARCHAR(255) NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_empresa_chave (id_empresa, chave),
        CONSTRAINT fk_param_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "✔ Tabela 'parametros_sistema' verificada.<br>";

    // 3. Atualizar Tabela Usuarios com id_empresa se não tiver
    try {
        $conn->exec("ALTER TABLE usuarios ADD COLUMN id_empresa INT UNSIGNED DEFAULT 1 AFTER perfil");
        echo "✔ Coluna 'id_empresa' adicionada em usuarios.<br>";
    }
    catch (Exception $e) {
        // Ignora se já existe
        echo "ℹ Coluna 'id_empresa' já existe em usuarios.<br>";
    }

    try {
        $conn->exec("ALTER TABLE usuarios ADD INDEX idx_id_empresa (id_empresa)");
    }
    catch (Exception $e) {
    }

    // 4. Cria Empresa Frimelo (ID 1) se não existir
    $stmt = $conn->query("SELECT count(*) FROM empresas WHERE id = 1");
    if ($stmt->fetchColumn() == 0) {
        $sql = "INSERT INTO empresas (id, razao_social, cnpj, slug, plano, limite_funcionarios) 
                VALUES (1, 'Frimelo', '00.000.000/0001-00', 'frimelo', 'PLATINUM', 100)";
        $conn->exec($sql);
        echo "✔ Empresa Padrão 'Frimelo' criada (ID 1).<br>";

        // Parâmetros Padrão
        $params = [
            ['RAZAO_SOCIAL', 'Frimelo', 'TEXTO'],
            ['CNPJ', '00.000.000/0001-00', 'TEXTO'],
            ['TETO_INSS', '7507.49', 'NUMERO'],
            ['ALIQUOTA_FGTS', '8.0', 'NUMERO']
        ];
        $stmtP = $conn->prepare("INSERT INTO parametros_sistema (id_empresa, chave, valor, tipo) VALUES (1, ?, ?, ?)");
        foreach ($params as $p) {
            $stmtP->execute($p);
        }
    }
    else {
        echo "ℹ Empresa Padrão já existe.<br>";
    }

    // 5. Atualizar coluna id_empresa na tabela funcionarios
    try {
        $conn->exec("ALTER TABLE funcionarios ADD COLUMN id_empresa INT UNSIGNED DEFAULT 1 AFTER id");
        $conn->exec("ALTER TABLE funcionarios ADD INDEX idx_func_empresa (id_empresa)");
        echo "✔ Coluna 'id_empresa' verificada em funcionarios.<br>";
    }
    catch (Exception $e) {
        echo "ℹ Coluna 'id_empresa' já existe em funcionarios.<br>";
    }

    // 6. REPARO DE DADOS: Vincular todos os órfãos à Empresa ID 1 (Frimelo)
    echo "<h3>Reparando Vínculos de Dados...</h3>";

    $tablesToFix = [
        'funcionarios',
        'usuarios',
        'competencias',
        'lancamentos_eventos',
        'logs_auditoria',
        'parametros_sistema'
    ];

    foreach ($tablesToFix as $table) {
        try {
            // Garante que a coluna existe antes de dar o UPDATE
            try {
                $conn->exec("ALTER TABLE $table ADD COLUMN id_empresa INT UNSIGNED DEFAULT 1 AFTER id");
                $conn->exec("ALTER TABLE $table ADD INDEX idx_{$table}_empresa (id_empresa)");
                echo "✔ Coluna 'id_empresa' adicionada em $table.<br>";
            }
            catch (Exception $e) {
            // Ignora se já existe
            }

            $conn->exec("UPDATE $table SET id_empresa = 1 WHERE id_empresa IS NULL OR id_empresa = 0");
            echo "✔ Dados em '$table' vinculados à empresa 1.<br>";
        }
        catch (Exception $e) {
            echo "ℹ Tabela '$table' ignorada ou erro: " . $e->getMessage() . "<br>";
        }
    }

    echo "<h3 style='color:green'>Reparo de Vínculos Concluído!</h3>";

    // 7. REPARO DE PERMISSÕES: Garantir que o SuperAdmin Master tenha perfil SUPERADMIN
    echo "<h3>Reparando Permissões...</h3>";
    $conn->exec("UPDATE usuarios SET perfil = 'SUPERADMIN' WHERE email IN ('saas@master.com', 'admin@frimelo.com.br', 'valter@frimelo.com.br')");
    echo "✔ Perfil SUPERADMIN garantido para usuários master.<br>";

    echo "<h3 style='color:green'>Correção Finalizada com Sucesso!</h3>";
    echo "<p>Por favor, faça <b>LOGOUT e LOGIN novamente</b> para atualizar as permissões.</p>";
    echo "<a href='/backend/v1/saas_stats.php'>Verificar Estatísticas Atuais</a> | ";
    echo "<a href='/'>Voltar ao Sistema</a>";

}
catch (Exception $e) {
    if ($conn && $conn->inTransaction())
        $conn->rollBack();
    echo "<h3 style='color:red'>ERRO: " . $e->getMessage() . "</h3>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>