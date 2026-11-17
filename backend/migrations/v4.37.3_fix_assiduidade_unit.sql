-- Migration v4.37.3
-- Objetivo: Alterar a unidade da Assiduidade e Insalubridade para PERCENTUAL

UPDATE eventos_folha 
SET unidade = 'PERCENTUAL' 
WHERE codigo_evento IN (833, 62);
