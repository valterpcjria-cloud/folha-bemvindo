-- Migration: Reordenar Eventos (Proventos antes de Descontos)
-- v4.16.4

UPDATE eventos_folha SET ordem_exportacao = 0 WHERE codigo_evento = 33;
UPDATE eventos_folha SET ordem_exportacao = 1 WHERE codigo_evento = 883;
UPDATE eventos_folha SET ordem_exportacao = 2 WHERE codigo_evento = 88;
UPDATE eventos_folha SET ordem_exportacao = 3 WHERE codigo_evento = 719;
UPDATE eventos_folha SET ordem_exportacao = 4 WHERE codigo_evento = 907;
UPDATE eventos_folha SET ordem_exportacao = 5 WHERE codigo_evento = 1080;
UPDATE eventos_folha SET ordem_exportacao = 6 WHERE codigo_evento = 62;
UPDATE eventos_folha SET ordem_exportacao = 7 WHERE codigo_evento = 833;
UPDATE eventos_folha SET ordem_exportacao = 8 WHERE codigo_evento = 71;
UPDATE eventos_folha SET ordem_exportacao = 9 WHERE codigo_evento = 191;
UPDATE eventos_folha SET ordem_exportacao = 10 WHERE codigo_evento = 936;
UPDATE eventos_folha SET ordem_exportacao = 11 WHERE codigo_evento = 4004;
