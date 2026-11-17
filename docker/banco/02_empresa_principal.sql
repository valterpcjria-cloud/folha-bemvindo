-- FOLHA BEM VINDO — empresa principal (id 1) e parâmetros da folha 2026
-- Valores de parâmetros = os vigentes na Frimelo em 2026 (migrations v4.53.2 e v4.53.9).
-- Razão social / CNPJ podem ser ajustados depois pela tela de empresas.

INSERT INTO `empresas` (`id`, `razao_social`, `cnpj`, `slug`, `ativa`, `plano`, `limite_funcionarios`)
VALUES (1, '__RAZAO_SOCIAL__', '__CNPJ__', 'bemvindo', 1, 'PLATINUM', 1000);

INSERT INTO `parametros_sistema` (`id_empresa`, `chave`, `valor`, `tipo`) VALUES
(1, 'RAZAO_SOCIAL', '__RAZAO_SOCIAL__', 'TEXTO'),
(1, 'CNPJ', '__CNPJ__', 'TEXTO'),
(1, 'CODIGO_SERIAL_ERP', 'GERADO-BEMVINDO', 'TEXTO'),
(1, 'TETO_INSS', '8475.55', 'NUMERO'),
(1, 'ALIQUOTA_FGTS', '8.0', 'NUMERO'),
(1, 'FAIXA_ISENCAO_IRRF', '2428.80', 'NUMERO'),
(1, 'VALOR_DEDUCAO_DEPENDENTE', '189.59', 'NUMERO');
