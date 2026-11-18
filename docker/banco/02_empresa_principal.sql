-- FOLHA BEM VINDO — empresa principal (id 1) e parâmetros da folha 2026
-- Valores de parâmetros = os vigentes na Frimelo em 2026 (migrations v4.53.2 e v4.53.9).
-- Dados da empresa informados pelo Valter em 17/11/2026 (CEP pendente — ajustar pela tela de empresas).

INSERT INTO `empresas` (`id`, `razao_social`, `cnpj`, `logradouro`, `numero`, `complemento`, `bairro`,
                        `uf`, `nome_cidade`, `slug`, `ativa`, `plano`, `limite_funcionarios`)
VALUES (1, 'Supermercado Bem Vindo', '41.403.240/0001-14', 'Kisleu Dias Maciel', 'SN', 'Quadra 142 Lote 01',
        'Parque Estrela Dalva II', 'GO', 'Luziânia', 'bemvindo', 1, 'PLATINUM', 1000);

INSERT INTO `parametros_sistema` (`id_empresa`, `chave`, `valor`, `tipo`) VALUES
(1, 'RAZAO_SOCIAL', 'Supermercado Bem Vindo', 'TEXTO'),
(1, 'CNPJ', '41.403.240/0001-14', 'TEXTO'),
(1, 'CODIGO_SERIAL_ERP', 'GERADO-BEMVINDO', 'TEXTO'),
(1, 'TETO_INSS', '8475.55', 'NUMERO'),
(1, 'ALIQUOTA_FGTS', '8.0', 'NUMERO'),
(1, 'FAIXA_ISENCAO_IRRF', '2428.80', 'NUMERO'),
(1, 'VALOR_DEDUCAO_DEPENDENTE', '189.59', 'NUMERO');
