-- Migration: Adicionar Evento de Prêmio Assiduidade (833)
-- v4.16.3

-- Inserir ou Atualizar o evento 833 (Prêmio Assiduidade)
-- A tabela eventos_folha é global (não possui id_empresa)
INSERT INTO eventos_folha (id, codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao)
VALUES (11, 833, 'Prêmio Assiduidade', 'CREDITO', 'PROVENTO', 'VALOR', 1, 11)
ON DUPLICATE KEY UPDATE 
    codigo_evento = VALUES(codigo_evento),
    nome_evento = VALUES(nome_evento),
    tipo = VALUES(tipo),
    natureza = VALUES(natureza),
    unidade = VALUES(unidade),
    obrigatorio = VALUES(obrigatorio),
    ordem_exportacao = VALUES(ordem_exportacao);
