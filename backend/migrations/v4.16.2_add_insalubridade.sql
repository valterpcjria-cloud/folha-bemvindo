-- Migration: Adicionar Evento de Insalubridade (62)
-- v4.16.2

-- 1. Atualizar ENUM de unidade para suportar PERCENTUAL
ALTER TABLE eventos_folha MODIFY COLUMN unidade ENUM('VALOR','HORA','DIA','UNIDADE','PERCENTUAL') DEFAULT 'VALOR';

-- 2. Inserir ou Atualizar o evento 62 (Insalubridade s/ Mínimo)
-- Note: A tabela eventos_folha é global (não possui id_empresa)
INSERT INTO eventos_folha (id, codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao)
VALUES (10, 62, 'Insalubridade s/ Mínimo', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 1, 10)
ON DUPLICATE KEY UPDATE 
    codigo_evento = VALUES(codigo_evento),
    nome_evento = VALUES(nome_evento),
    unidade = VALUES(unidade),
    obrigatorio = VALUES(obrigatorio),
    ordem_exportacao = VALUES(ordem_exportacao);
