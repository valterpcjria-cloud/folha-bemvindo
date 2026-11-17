<?php
// /backend/v1/setup_db.php
require_once 'config.php';

// Habilita exibição de erros apenas para o setup para podermos diagnosticar
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    echo "<div style='font-family:sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 20px auto;'>";
    echo "<h3 style='color: #2563eb;'>Iniciando configuração do Banco de Dados...</h3>";
    echo "Conectado ao banco: <b>" . Database::getEnv('DB_NAME', 'Configurado') . "</b><br><hr style='border:0; border-top:1px solid #eee; margin:15px 0;'>";

    // 1. Tabela funcionarios
    $sql_funcionarios = "CREATE TABLE IF NOT EXISTS funcionarios (
        id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_contrato     INT UNSIGNED NOT NULL UNIQUE,
        nome            VARCHAR(255) NOT NULL,
        cpf             CHAR(11) NULL,
        data_admissao   DATE NULL,
        data_demissao   DATE NULL,
        cargo           VARCHAR(150) NULL,
        centro_custo    VARCHAR(100) NULL,
        tipo_contrato   ENUM('CLT','PJ','ESTAGIO','OUTRO') DEFAULT 'CLT',
        status          ENUM('ATIVO','DESLIGADO','AFASTADO') DEFAULT 'ATIVO',
        created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_id_contrato (id_contrato),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    // 2. Tabela eventos_folha
    $sql_eventos = "CREATE TABLE IF NOT EXISTS eventos_folha (
        id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo_evento    INT UNSIGNED NOT NULL UNIQUE,
        nome_evento      VARCHAR(150) NOT NULL,
        tipo             ENUM('CREDITO','DEBITO','INFORMATIVO') NOT NULL,
        natureza         ENUM('PROVENTO','DESCONTO','BASE','OUTRO') DEFAULT 'PROVENTO',
        unidade          ENUM('VALOR','HORA','DIA','UNIDADE','PERCENTUAL') DEFAULT 'VALOR',
        formula          TEXT NULL,
        descricao        TEXT NULL,
        incide_inss      TINYINT(1) NOT NULL DEFAULT 1,
        incide_fgts      TINYINT(1) NOT NULL DEFAULT 1,
        incide_irrf      TINYINT(1) NOT NULL DEFAULT 1,
        obrigatorio      TINYINT(1) NOT NULL DEFAULT 0,
        ativo            TINYINT(1) NOT NULL DEFAULT 1,
        ordem_exportacao INT UNSIGNED NULL,
        created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_codigo_evento (codigo_evento),
        INDEX idx_obrigatorio (obrigatorio),
        INDEX idx_ativo (ativo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    // 3. Tabela competencias
    $sql_competencias = "CREATE TABLE IF NOT EXISTS competencias (
        id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        mes             TINYINT UNSIGNED NOT NULL,
        ano             SMALLINT UNSIGNED NOT NULL,
        status          ENUM('ABERTA','FECHADA') DEFAULT 'ABERTA',
        data_abertura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_fechamento DATETIME NULL,
        id_empresa      INT UNSIGNED NOT NULL DEFAULT 1,
        UNIQUE KEY uk_mes_ano (mes, ano),
        INDEX idx_comp_empresa (id_empresa)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    // 4. Tabela lancamentos_eventos
    $sql_lancamentos = "CREATE TABLE IF NOT EXISTS lancamentos_eventos (
        id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        funcionario_id  BIGINT UNSIGNED NOT NULL,
        competencia_id  BIGINT UNSIGNED NOT NULL,
        evento_id       BIGINT UNSIGNED NOT NULL,
        quantidade      DECIMAL(10,2) NULL,
        valor_unitario  DECIMAL(10,2) NULL,
        valor_total     DECIMAL(10,2) NOT NULL,
        origem          ENUM('MANUAL','CALCULO','IMPORTADO') DEFAULT 'MANUAL',
        observacao      VARCHAR(255) NULL,
        created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        id_empresa      INT UNSIGNED NOT NULL DEFAULT 1,
        CONSTRAINT fk_lanc_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_lanc_competencia FOREIGN KEY (competencia_id) REFERENCES competencias(id) ON DELETE CASCADE,
        CONSTRAINT fk_lanc_evento FOREIGN KEY (evento_id) REFERENCES eventos_folha(id) ON DELETE RESTRICT,
        UNIQUE KEY uk_func_comp_evento (funcionario_id, competencia_id, evento_id),
        INDEX idx_func_comp (funcionario_id, competencia_id),
        INDEX idx_comp_evento (competencia_id, evento_id),
        INDEX idx_lanc_empresa (id_empresa)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    // 5. Tabela usuarios
    $sql_usuarios = "CREATE TABLE IF NOT EXISTS usuarios (
        id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome            VARCHAR(150) NOT NULL,
        email           VARCHAR(150) NOT NULL UNIQUE,
        senha_hash      VARCHAR(255) NOT NULL,
        perfil          ENUM('ADMIN','RH','GESTOR','LEITURA','SUPERADMIN') DEFAULT 'RH',
        ativo           TINYINT(1) NOT NULL DEFAULT 1,
        created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_perfil (perfil)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    // 6. Tabela logs_auditoria
    $sql_logs = "CREATE TABLE IF NOT EXISTS logs_auditoria (
        id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id      BIGINT UNSIGNED NULL,
        entidade        VARCHAR(100) NOT NULL,
        entidade_id     BIGINT UNSIGNED NOT NULL,
        acao            VARCHAR(50) NOT NULL,
        detalhes        TEXT NULL,
        id_empresa      INT UNSIGNED NOT NULL DEFAULT 1,
        created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entidade (entidade, entidade_id),
        INDEX idx_usuario (usuario_id),
        INDEX idx_logs_empresa (id_empresa),
        CONSTRAINT fk_logs_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $conn->exec($sql_funcionarios);
    echo "<span style='color:green;'>✔</span> Tabela funcionarios: OK<br>";
    $conn->exec($sql_eventos);
    echo "<span style='color:green;'>✔</span> Tabela eventos_folha: OK<br>";
    $conn->exec($sql_competencias);
    echo "<span style='color:green;'>✔</span> Tabela competencias: OK<br>";
    $conn->exec($sql_lancamentos);
    echo "<span style='color:green;'>✔</span> Tabela lancamentos_eventos: OK<br>";
    $conn->exec($sql_usuarios);
    echo "<span style='color:green;'>✔</span> Tabela usuarios: OK<br>";
    $conn->exec($sql_logs);
    echo "<span style='color:green;'>✔</span> Tabela logs_auditoria: OK<br>";

    // 7. Tabela Empresas (SaaS/Multitenant)
    $sql_empresas = "CREATE TABLE IF NOT EXISTS empresas (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $conn->exec($sql_empresas);
    echo "<span style='color:green;'>✔</span> Tabela empresas: OK<br>";

    // 8. Tabela Parametros do Sistema
    $sql_params = "CREATE TABLE IF NOT EXISTS parametros_sistema (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $conn->exec($sql_params);
    echo "<span style='color:green;'>✔</span> Tabela parametros_sistema: OK<br>";

    // SEEDING: Criar Empresa Frimelo (ID 1) se não existir
    $count_empresa = $conn->query("SELECT COUNT(*) FROM empresas WHERE id = 1")->fetchColumn();
    if ($count_empresa == 0) {
        $sql = "INSERT INTO empresas (id, razao_social, cnpj, slug, plano, limite_funcionarios) 
                VALUES (1, 'Frimelo', '00.000.000/0001-00', 'frimelo', 'PLATINUM', 100)";
        $conn->exec($sql);
        echo "<span style='color:green;'>✔</span> Empresa Padrão 'Frimelo' criada (ID 1).<br>";

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

    // Inserir Eventos Obrigatórios
    // Agora usando INSERT ... ON DUPLICATE KEY UPDATE com IDs explícitos para alinhar com o Frontend
    $eventos_obrigatorios = [
        [33, 33, 'Salário', 'CREDITO', 'PROVENTO', 'VALOR', 1, 0],
        [1, 883, 'Pontualidade', 'CREDITO', 'PROVENTO', 'VALOR', 1, 1],
        [2, 88, 'Gratificação', 'CREDITO', 'PROVENTO', 'VALOR', 1, 2],
        [3, 719, 'Prêmio Domingo', 'CREDITO', 'PROVENTO', 'VALOR', 1, 3],
        [12, 48, 'Horas Extras 50%', 'CREDITO', 'PROVENTO', 'HORA', 1, 4],
        [4, 49, 'Horas Extras 100%', 'CREDITO', 'PROVENTO', 'HORA', 1, 5],
        [5, 1080, 'Feriado Trabalhado', 'CREDITO', 'PROVENTO', 'DIA', 1, 6],
        [10, 62, 'Insalubridade s/ Mínimo', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 1, 7],
        [11, 833, 'Prêmio Assiduidade', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 1, 8],
        [6, 71, 'Faltas', 'DEBITO', 'DESCONTO', 'DIA', 1, 9],
        [7, 191, 'Desc Vale', 'DEBITO', 'DESCONTO', 'VALOR', 1, 10],
        [8, 936, 'Mensalidade Sindical', 'DEBITO', 'DESCONTO', 'VALOR', 1, 11],
        [9, 4004, 'Empréstimo Consignado', 'DEBITO', 'DESCONTO', 'VALOR', 1, 12],
        [20, 9999, 'DSR', 'CREDITO', 'PROVENTO', 'VALOR', 1, 99],
    ];

    $sql_seed = "INSERT INTO eventos_folha (id, codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 codigo_evento=VALUES(codigo_evento), 
                 nome_evento=VALUES(nome_evento), 
                 tipo=VALUES(tipo),
                 unidade=VALUES(unidade),
                 ordem_exportacao=VALUES(ordem_exportacao)";
    $stmt_seed = $conn->prepare($sql_seed);

    foreach ($eventos_obrigatorios as $ev) {
        $stmt_seed->execute($ev);
    }

    // Ajustar auto-incremento para evitar colisões futuras
    $conn->exec("ALTER TABLE eventos_folha AUTO_INCREMENT = 5000");

    echo "<span style='color:green;'>✔</span> Eventos obrigatórios sincronizados (IDs fixos).<br>";

    // Bem Vindo: removido o usuário padrão admin@empresa.com.br / admin123 (senha fixa conhecida).
    // O primeiro SUPERADMIN é criado pelo script de linha de comando criar_superadmin.php, com senha temporária.

    echo "<h4 style='color: #059669; margin-top:20px;'>Configuração concluída com sucesso!</h4>";
    echo "<a href='/' style='display:inline-block; padding: 10px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;'>Acessar o Sistema</a>";
    echo "</div>";

}
catch (PDOException $e) {
    echo "<div style='color:red; font-weight:bold; padding:20px; border:2px solid red; border-radius:10px;'>ERRO NO SETUP: " . $e->getMessage() . "</div>";
}
// End of file