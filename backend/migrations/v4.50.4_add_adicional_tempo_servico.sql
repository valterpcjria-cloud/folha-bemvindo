-- Migration: Adicionar Evento Adicional de Tempo de Serviço (1000)
-- v4.50.4
-- Cálculo: valor_unitario = SalárioMínimo / 100; valor_total = quantidade(%) × valor_unitario
-- Posição: após rubrica 833 (Prêmio Assiduidade), antes de 71 (Faltas)

-- 1. Abrir espaço na ordem: deslocar 71, 191, 936, 4004 uma posição para frente
UPDATE eventos_folha SET ordem_exportacao = 12 WHERE codigo_evento = 4004;
UPDATE eventos_folha SET ordem_exportacao = 11 WHERE codigo_evento = 936;
UPDATE eventos_folha SET ordem_exportacao = 10 WHERE codigo_evento = 191;
UPDATE eventos_folha SET ordem_exportacao = 9  WHERE codigo_evento = 71;

-- 2. Inserir evento 1000 na posição 8 (logo após a 833)
INSERT INTO eventos_folha (codigo_evento, nome_evento, tipo, natureza, unidade, obrigatorio, ordem_exportacao)
VALUES (1000, 'Adic. Tempo de Serviço', 'CREDITO', 'PROVENTO', 'PERCENTUAL', 0, 8)
ON DUPLICATE KEY UPDATE
    nome_evento       = VALUES(nome_evento),
    tipo              = VALUES(tipo),
    natureza          = VALUES(natureza),
    unidade           = VALUES(unidade),
    ordem_exportacao  = VALUES(ordem_exportacao);
