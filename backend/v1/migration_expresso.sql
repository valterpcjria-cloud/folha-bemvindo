CREATE TABLE IF NOT EXISTS fechamento_snapshot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_competencia INT NOT NULL,
    status ENUM('PENDENTE', 'VALIDADO', 'ERRO', 'PROCESSANDO', 'CONCLUIDO') DEFAULT 'PENDENTE',
    data_snapshot DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_conclusao DATETIME NULL,
    total_colaboradores INT DEFAULT 0,
    erros TEXT NULL,
    INDEX idx_empresa_comp (id_empresa, id_competencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fechamento_fila (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_snapshot INT NOT NULL,
    id_funcionario INT NOT NULL,
    status ENUM('PENDENTE', 'ERRO_VALIDACAO', 'PROCESSANDO', 'CONCLUIDO') DEFAULT 'PENDENTE',
    detalhe_erro TEXT NULL,
    base_inss DECIMAL(10,2) DEFAULT 0.00,
    base_irrf DECIMAL(10,2) DEFAULT 0.00,
    base_fgts DECIMAL(10,2) DEFAULT 0.00,
    valor_liquido DECIMAL(10,2) DEFAULT 0.00,
    INDEX idx_snapshot (id_snapshot),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
