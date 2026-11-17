-- FOLHA BEM VINDO — estrutura do banco + tabelas de configuração da folha
-- Origem: estrutura da Frimelo em produção (phpMyAdmin, 17/11/2026), SEM dados de funcionários/usuários/lançamentos.
-- Dados incluídos só de: eventos_folha, aliquotas_inss, aliquotas_irrf, feriados, dsr_he_config_eventos.
-- Roda automaticamente só na PRIMEIRA subida do container do banco (volume vazio).

-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Tempo de geração: 17/11/2026 às 20:18
-- Versão do servidor: 5.7.44-48
-- Versão do PHP: 8.4.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `aliquotas_inss`
--

CREATE TABLE `aliquotas_inss` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `faixa_inicio` decimal(12,2) NOT NULL,
  `faixa_fim` decimal(12,2) NOT NULL,
  `aliquota` decimal(5,2) NOT NULL COMMENT 'Percentual da alíquota',
  `vigencia_inicio` date NOT NULL,
  `vigencia_fim` date DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `aliquotas_inss`
--

INSERT INTO `aliquotas_inss` (`id`, `faixa_inicio`, `faixa_fim`, `aliquota`, `vigencia_inicio`, `vigencia_fim`, `ativo`, `created_at`) VALUES
(1, 0.00, 1412.00, 7.50, '2024-01-01', NULL, 1, '2026-01-30 16:50:16'),
(2, 1412.01, 2666.68, 9.00, '2024-01-01', NULL, 1, '2026-01-30 16:50:16'),
(3, 2666.69, 4000.03, 12.00, '2024-01-01', NULL, 1, '2026-01-30 16:50:16'),
(4, 4000.04, 7786.02, 14.00, '2024-01-01', NULL, 1, '2026-01-30 16:50:16'),
(5, 0.00, 1621.00, 7.50, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(6, 1621.01, 2902.84, 9.00, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(7, 2902.85, 4354.27, 12.00, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(8, 4354.28, 8666.44, 14.00, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(9, 0.00, 1621.00, 7.50, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(10, 1621.01, 2902.84, 9.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(11, 2902.85, 4354.27, 12.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(12, 4354.28, 8666.44, 14.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(13, 0.00, 1621.00, 7.50, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(14, 1621.01, 2902.84, 9.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(15, 2902.85, 4354.27, 12.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(16, 4354.28, 8666.44, 14.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(17, 0.00, 1621.00, 7.50, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(18, 1621.01, 2902.84, 9.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(19, 2902.85, 4354.27, 12.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(20, 4354.28, 8666.44, 14.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(21, 0.00, 1621.00, 7.50, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(22, 1621.01, 2902.84, 9.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(23, 2902.85, 4354.27, 12.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(24, 4354.28, 8666.44, 14.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(25, 0.00, 1621.00, 7.50, '2026-01-01', NULL, 1, '2026-05-22 12:55:47'),
(26, 1621.00, 2902.84, 9.00, '2026-01-01', NULL, 1, '2026-05-22 12:55:47'),
(27, 2902.84, 4354.27, 12.00, '2026-01-01', NULL, 1, '2026-05-22 12:55:47'),
(28, 4354.27, 8475.55, 14.00, '2026-01-01', NULL, 1, '2026-05-22 12:55:47');

-- --------------------------------------------------------

--
-- Estrutura para tabela `aliquotas_irrf`
--

CREATE TABLE `aliquotas_irrf` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `faixa_inicio` decimal(12,2) NOT NULL,
  `faixa_fim` decimal(12,2) NOT NULL,
  `aliquota` decimal(5,2) NOT NULL,
  `parcela_deduzir` decimal(12,2) NOT NULL DEFAULT '0.00',
  `vigencia_inicio` date NOT NULL,
  `vigencia_fim` date DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `aliquotas_irrf`
--

INSERT INTO `aliquotas_irrf` (`id`, `faixa_inicio`, `faixa_fim`, `aliquota`, `parcela_deduzir`, `vigencia_inicio`, `vigencia_fim`, `ativo`, `created_at`) VALUES
(1, 0.00, 2259.20, 0.00, 0.00, '2024-01-01', NULL, 0, '2026-01-30 16:50:16'),
(2, 2259.21, 2826.65, 7.50, 169.44, '2024-01-01', NULL, 0, '2026-01-30 16:50:16'),
(3, 2826.66, 3751.05, 15.00, 381.44, '2024-01-01', NULL, 0, '2026-01-30 16:50:16'),
(4, 3751.06, 4664.68, 22.50, 662.77, '2024-01-01', NULL, 0, '2026-01-30 16:50:16'),
(5, 4664.69, 999999.99, 27.50, 896.00, '2024-01-01', NULL, 0, '2026-01-30 16:50:16'),
(6, 0.00, 2428.80, 0.00, 0.00, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(7, 2428.80, 3036.00, 7.50, 182.16, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(8, 3036.01, 4028.00, 15.00, 409.80, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(9, 4028.01, 5009.00, 22.50, 712.00, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(10, 5009.01, 999999.99, 27.50, 962.45, '2026-01-01', NULL, 0, '2026-01-30 17:22:04'),
(11, 0.00, 2428.80, 0.00, 0.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(12, 2428.80, 3036.00, 7.50, 182.16, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(13, 3036.01, 4028.00, 15.00, 409.80, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(14, 4028.01, 5009.00, 22.50, 712.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(15, 5009.01, 999999.99, 27.50, 962.45, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(16, 0.00, 2428.80, 0.00, 0.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(17, 2428.80, 3036.00, 7.50, 182.16, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(18, 3036.01, 4028.00, 15.00, 409.80, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(19, 4028.01, 5009.00, 22.50, 712.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(20, 5009.01, 999999.99, 27.50, 962.45, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(21, 0.00, 2428.80, 0.00, 0.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(22, 2428.80, 3036.00, 7.50, 182.16, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(23, 3036.01, 4028.00, 15.00, 409.80, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(24, 4028.01, 5009.00, 22.50, 712.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(25, 5009.01, 999999.99, 27.50, 962.45, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(26, 0.00, 2428.80, 0.00, 0.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(27, 2428.80, 3036.00, 7.50, 182.16, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(28, 3036.01, 4028.00, 15.00, 409.80, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(29, 4028.01, 5009.00, 22.50, 712.00, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(30, 5009.01, 999999.99, 27.50, 962.45, '2026-01-01', NULL, 0, '2026-02-19 00:37:13'),
(31, 0.00, 2428.80, 0.00, 0.00, '2026-01-01', NULL, 1, '2026-05-16 19:00:34'),
(32, 2428.80, 2826.65, 7.50, 182.16, '2026-01-01', NULL, 1, '2026-05-16 19:00:34'),
(33, 2826.65, 3751.05, 15.00, 394.16, '2026-01-01', NULL, 1, '2026-05-16 19:00:34'),
(34, 3751.05, 4664.68, 22.50, 675.49, '2026-01-01', NULL, 1, '2026-05-16 19:00:34'),
(35, 4664.68, 999999.99, 27.50, 908.73, '2026-01-01', NULL, 1, '2026-05-16 19:00:34');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cargos`
--

CREATE TABLE `cargos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cbo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Código Brasileiro de Ocupações',
  `piso_salarial` decimal(10,2) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `competencias`
--

CREATE TABLE `competencias` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `mes` tinyint(3) UNSIGNED NOT NULL,
  `ano` smallint(5) UNSIGNED NOT NULL,
  `status` enum('ABERTA','FECHADA') COLLATE utf8mb4_unicode_ci DEFAULT 'ABERTA',
  `data_abertura` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_fechamento` datetime DEFAULT NULL,
  `justificativa_status` text COLLATE utf8mb4_unicode_ci,
  `id_empresa` int(10) UNSIGNED NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `competencia_atestados`
--

CREATE TABLE `competencia_atestados` (
  `id` int(10) UNSIGNED NOT NULL,
  `funcionario_id` int(10) UNSIGNED NOT NULL,
  `competencia_id` int(10) UNSIGNED NOT NULL,
  `id_empresa` int(10) UNSIGNED NOT NULL DEFAULT '1',
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `dependentes`
--

CREATE TABLE `dependentes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `funcionario_id` bigint(20) UNSIGNED NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` char(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_nascimento` date NOT NULL,
  `tipo_parentesco` enum('FILHO','CONJUGE','PAI_MAE','OUTRO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `irrf` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Deduzir do IRRF?',
  `salario_familia` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Recebe Salário Família?',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `dsr_calculado`
--

CREATE TABLE `dsr_calculado` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `funcionario_id` bigint(20) UNSIGNED NOT NULL,
  `competencia_id` bigint(20) UNSIGNED NOT NULL,
  `mes` tinyint(3) UNSIGNED NOT NULL,
  `ano` smallint(5) UNSIGNED NOT NULL,
  `dias_uteis_mes` tinyint(3) UNSIGNED NOT NULL DEFAULT '0',
  `dias_dsr_mes` tinyint(3) UNSIGNED NOT NULL DEFAULT '0',
  `faltas_pre_dsr_qtd` tinyint(3) UNSIGNED NOT NULL DEFAULT '0',
  `dsr_horas_extras` decimal(12,2) DEFAULT '0.00',
  `dsr_comissoes` decimal(12,2) DEFAULT '0.00',
  `dsr_horista` decimal(12,2) DEFAULT '0.00',
  `dsr_bruto` decimal(12,2) DEFAULT '0.00',
  `dsr_desconto_faltas` decimal(12,2) DEFAULT '0.00',
  `dsr_liquido` decimal(12,2) DEFAULT '0.00',
  `memoria_calculo` text COLLATE utf8mb4_unicode_ci,
  `calculado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `calculado_por` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'sistema'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `dsr_config_eventos`
--

CREATE TABLE `dsr_config_eventos` (
  `id` int(10) UNSIGNED NOT NULL,
  `evento_id` bigint(20) UNSIGNED NOT NULL,
  `tipo_dsr` enum('horas_extras','comissao','producao') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `dsr_faltas_pre_dsr`
--

CREATE TABLE `dsr_faltas_pre_dsr` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `funcionario_id` bigint(20) UNSIGNED NOT NULL,
  `competencia_id` bigint(20) UNSIGNED NOT NULL,
  `data_falta` date NOT NULL,
  `data_dsr_perdido` date DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `dsr_fila_recalculo`
--

CREATE TABLE `dsr_fila_recalculo` (
  `funcionario_id` bigint(20) UNSIGNED NOT NULL,
  `competencia_id` bigint(20) UNSIGNED NOT NULL,
  `id_empresa` int(10) UNSIGNED NOT NULL,
  `marcado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `dsr_he_config_eventos`
--

CREATE TABLE `dsr_he_config_eventos` (
  `id` int(10) UNSIGNED NOT NULL,
  `codigo_evento_fonte` int(10) UNSIGNED NOT NULL COMMENT 'Código do evento de HE que entra na base (ex: 49, 48)',
  `descricao` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descrição para log/UI (ex: HE 100%)',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rubricas de HE diurnas que compõem a base da Rubrica 59 (DSR s/ HE). Adicione novas rubricas aqui sem alterar código.';

--
-- Despejando dados para a tabela `dsr_he_config_eventos`
--

INSERT INTO `dsr_he_config_eventos` (`id`, `codigo_evento_fonte`, `descricao`, `ativo`, `criado_em`, `atualizado_em`) VALUES
(1, 49, 'Horas Extras 100%', 1, '2026-03-27 21:45:58', '2026-03-27 21:45:58');

-- --------------------------------------------------------

--
-- Estrutura para tabela `empresas`
--

CREATE TABLE `empresas` (
  `id` int(10) UNSIGNED NOT NULL,
  `razao_social` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logradouro` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complemento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bairro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cnpj` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uf` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_cidade` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cep` char(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_empresa_erp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `filial_erp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '0001',
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativa` tinyint(1) DEFAULT '1',
  `valor_mensalidade` decimal(10,2) DEFAULT '0.00',
  `plano` enum('BRONZE','SILVER','GOLD','PLATINUM') COLLATE utf8mb4_unicode_ci DEFAULT 'BRONZE',
  `limite_funcionarios` int(11) DEFAULT '10',
  `vencimento_dia` int(11) DEFAULT '10',
  `data_cadastro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `eventos_folha`
--

CREATE TABLE `eventos_folha` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `codigo_evento` int(10) UNSIGNED NOT NULL,
  `nome_evento` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('CREDITO','DEBITO','INFORMATIVO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `natureza` enum('PROVENTO','DESCONTO','BASE','OUTRO') COLLATE utf8mb4_unicode_ci DEFAULT 'PROVENTO',
  `unidade` enum('VALOR','HORA','DIA','UNIDADE','PERCENTUAL') COLLATE utf8mb4_unicode_ci DEFAULT 'VALOR',
  `formula` text COLLATE utf8mb4_unicode_ci,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `incide_inss` tinyint(1) NOT NULL DEFAULT '1',
  `incide_fgts` tinyint(1) NOT NULL DEFAULT '1',
  `incide_irrf` tinyint(1) NOT NULL DEFAULT '1',
  `obrigatorio` tinyint(1) NOT NULL DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ordem_exportacao` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `eventos_folha`
--

INSERT INTO `eventos_folha` (`id`, `codigo_evento`, `nome_evento`, `tipo`, `natureza`, `unidade`, `formula`, `descricao`, `incide_inss`, `incide_fgts`, `incide_irrf`, `obrigatorio`, `ativo`, `ordem_exportacao`, `created_at`, `updated_at`) VALUES
(1, 883, 'Pontualidade', 'CREDITO', 'PROVENTO', 'VALOR', NULL, NULL, 1, 1, 1, 1, 1, 1, '2026-02-27 21:46:50', '2026-05-11 22:38:37'),
(2, 88, 'Gratificação', 'CREDITO', 'PROVENTO', 'VALOR', NULL, NULL, 1, 1, 1, 1, 1, 2, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(3, 719, 'Prêmio Domingo', 'CREDITO', 'PROVENTO', 'VALOR', NULL, NULL, 1, 1, 1, 1, 1, 3, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(4, 49, 'Horas Extras 100%', 'CREDITO', 'PROVENTO', 'HORA', NULL, NULL, 1, 1, 1, 1, 1, 4, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(5, 1080, 'Feriado Trabalhado', 'CREDITO', 'PROVENTO', 'DIA', NULL, NULL, 1, 1, 1, 1, 1, 5, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(6, 71, 'Faltas', 'DEBITO', 'DESCONTO', 'DIA', NULL, NULL, 0, 0, 0, 1, 1, 9, '2026-02-27 21:46:50', '2026-04-06 14:58:13'),
(7, 191, 'Desc Vale', 'DEBITO', 'DESCONTO', 'VALOR', NULL, NULL, 0, 0, 0, 1, 1, 10, '2026-02-27 21:46:50', '2026-04-06 14:58:13'),
(8, 936, 'Mensalidade Sindical', 'DEBITO', 'DESCONTO', 'VALOR', NULL, NULL, 0, 0, 0, 1, 1, 11, '2026-02-27 21:46:50', '2026-04-06 14:58:13'),
(9, 4004, 'Empréstimo Consignado', 'DEBITO', 'DESCONTO', 'VALOR', NULL, NULL, 0, 0, 0, 1, 1, 12, '2026-02-27 21:46:50', '2026-04-06 14:58:13'),
(10, 62, 'Insalubridade s/ Mínimo', 'CREDITO', 'PROVENTO', 'PERCENTUAL', NULL, NULL, 1, 1, 1, 1, 1, 7, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(11, 833, 'Prêmio Assiduidade', 'CREDITO', 'PROVENTO', 'PERCENTUAL', NULL, NULL, 1, 1, 1, 1, 1, 8, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(33, 33, 'Salário', 'CREDITO', 'PROVENTO', 'VALOR', NULL, NULL, 1, 1, 1, 1, 1, 0, '2026-02-27 21:46:50', '2026-05-11 22:38:33'),
(34, 59, 'DSR s/ Horas Extras Diurnas', 'CREDITO', 'PROVENTO', 'VALOR', 'Calculado: (SUM(rubricas_he_ativas) / dias_uteis) * (domingos + feriados)', NULL, 1, 1, 1, 1, 1, 55, '2026-03-27 21:45:58', '2026-03-27 21:45:58'),
(35, 1000, 'Adic. Tempo de Serviço', 'CREDITO', 'PROVENTO', 'PERCENTUAL', NULL, NULL, 1, 1, 1, 0, 1, 8, '2026-04-16 21:31:22', '2026-05-11 22:38:33'),
(36, 35, 'INSS', 'DEBITO', 'DESCONTO', 'VALOR', NULL, NULL, 0, 0, 0, 1, 1, 50, '2026-05-06 23:35:33', '2026-05-06 23:35:33'),
(37, 1900, 'FGTS (Encargo Empregador)', 'INFORMATIVO', 'OUTRO', 'PERCENTUAL', NULL, NULL, 1, 1, 1, 0, 1, NULL, '2026-05-11 22:05:14', '2026-05-11 22:38:57'),
(38, 1920, 'IRRF', 'DEBITO', 'DESCONTO', 'VALOR', NULL, NULL, 0, 0, 0, 1, 1, 99, '2026-05-16 19:00:34', '2026-05-16 19:00:34');

-- --------------------------------------------------------

--
-- Estrutura para tabela `fechamento_fila`
--

CREATE TABLE `fechamento_fila` (
  `id` int(11) NOT NULL,
  `id_snapshot` int(11) NOT NULL,
  `id_funcionario` int(11) NOT NULL,
  `status` enum('PENDENTE','ERRO_VALIDACAO','PROCESSANDO','CONCLUIDO') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDENTE',
  `detalhe_erro` text COLLATE utf8mb4_unicode_ci,
  `base_inss` decimal(10,2) DEFAULT '0.00',
  `base_irrf` decimal(10,2) DEFAULT '0.00',
  `base_fgts` decimal(10,2) DEFAULT '0.00',
  `valor_liquido` decimal(10,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `fechamento_snapshot`
--

CREATE TABLE `fechamento_snapshot` (
  `id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `id_competencia` int(11) NOT NULL,
  `status` enum('PENDENTE','VALIDADO','ERRO','PROCESSANDO','CONCLUIDO') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDENTE',
  `data_snapshot` datetime DEFAULT CURRENT_TIMESTAMP,
  `data_conclusao` datetime DEFAULT NULL,
  `total_colaboradores` int(11) DEFAULT '0',
  `erros` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `feriados`
--

CREATE TABLE `feriados` (
  `id` int(10) UNSIGNED NOT NULL,
  `data` date NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('nacional','estadual','municipal') COLLATE utf8mb4_unicode_ci DEFAULT 'nacional',
  `uf` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recorrente` tinyint(1) NOT NULL DEFAULT '1',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `empresa_id` int(10) UNSIGNED DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `feriados`
--

INSERT INTO `feriados` (`id`, `data`, `nome`, `tipo`, `uf`, `cidade`, `recorrente`, `ativo`, `empresa_id`, `criado_em`) VALUES
(23, '2026-01-01', 'Confraternização Universal', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(24, '2026-02-17', 'Carnaval 2026', 'nacional', NULL, NULL, 0, 1, NULL, '2026-03-27 23:27:41'),
(25, '2026-04-03', 'Sexta-feira Santa 2026', 'nacional', NULL, NULL, 0, 1, NULL, '2026-03-27 23:27:41'),
(26, '2026-04-21', 'Tiradentes', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(27, '2026-05-01', 'Dia do Trabalho', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(28, '2026-06-04', 'Corpus Christi 2026', 'nacional', NULL, NULL, 0, 0, NULL, '2026-03-27 23:27:41'),
(29, '2026-09-07', 'Independência do Brasil', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(30, '2026-10-12', 'Nossa Sra. Aparecida', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(31, '2026-11-02', 'Finados', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(32, '2026-11-15', 'Proclamação da República', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(33, '2026-11-20', 'Dia da Consciência Negra', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41'),
(34, '2026-12-25', 'Natal', 'nacional', NULL, NULL, 1, 1, NULL, '2026-03-27 23:27:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `ferias`
--

CREATE TABLE `ferias` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `funcionario_id` bigint(20) UNSIGNED NOT NULL,
  `periodo_aquisitivo_inicio` date NOT NULL,
  `periodo_aquisitivo_fim` date NOT NULL,
  `periodo_gozo_inicio` date NOT NULL,
  `periodo_gozo_fim` date NOT NULL,
  `dias_gozo` int(11) NOT NULL,
  `dias_abono` int(11) DEFAULT '0',
  `valor_pago` decimal(10,2) DEFAULT NULL,
  `status` enum('PROGRAMADA','EM_ANDAMENTO','CONCLUIDA','CANCELADA') COLLATE utf8mb4_unicode_ci DEFAULT 'PROGRAMADA',
  `observacao` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios`
--

CREATE TABLE `funcionarios` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `id_empresa` int(10) UNSIGNED DEFAULT '1',
  `id_contrato` int(10) UNSIGNED NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` char(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_admissao` date DEFAULT NULL,
  `data_demissao` date DEFAULT NULL,
  `cargo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carga_horaria` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '220:00',
  `sindicato_codigo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '0066',
  `dep_ir` tinyint(3) UNSIGNED DEFAULT '0',
  `dep_sf` tinyint(3) UNSIGNED DEFAULT '0',
  `deducao_ir` decimal(12,2) DEFAULT '0.00',
  `salario_base` decimal(12,2) DEFAULT '0.00',
  `cbo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `filial` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '0001',
  `local` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `centro_custo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_contrato` enum('CLT','PJ','ESTAGIO','OUTRO') COLLATE utf8mb4_unicode_ci DEFAULT 'CLT',
  `status` enum('ATIVO','DESLIGADO','AFASTADO') COLLATE utf8mb4_unicode_ci DEFAULT 'ATIVO',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `insalubridade_perc` decimal(5,2) DEFAULT '20.00',
  `assiduidade_perc` decimal(5,2) DEFAULT '11.00',
  `adic_tempo_servico_perc` decimal(5,2) DEFAULT '0.00',
  `mensalidade_sindical` decimal(10,2) DEFAULT '0.00',
  `emprestimo_consignado` decimal(10,2) DEFAULT '0.00',
  `gratificacao` decimal(10,2) DEFAULT '0.00' COMMENT 'Gratificacao do funcionario. Alimenta rubrica 88 em competencias abertas.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `jwt_blacklist`
--

CREATE TABLE `jwt_blacklist` (
  `jti` char(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `expira_em` int(10) UNSIGNED NOT NULL COMMENT 'Unix timestamp do exp do token',
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `lancamentos_eventos`
--

CREATE TABLE `lancamentos_eventos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `funcionario_id` bigint(20) UNSIGNED NOT NULL,
  `competencia_id` bigint(20) UNSIGNED NOT NULL,
  `evento_id` bigint(20) UNSIGNED NOT NULL,
  `quantidade` decimal(10,2) DEFAULT NULL,
  `valor_unitario` decimal(10,2) DEFAULT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `origem` enum('MANUAL','CALCULO','IMPORTADO') COLLATE utf8mb4_unicode_ci DEFAULT 'MANUAL',
  `observacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id_empresa` int(10) UNSIGNED NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Acionadores `lancamentos_eventos`
--
DELIMITER $$
CREATE TRIGGER `trg_lanc_dsr_delete` AFTER DELETE ON `lancamentos_eventos` FOR EACH ROW INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
            SELECT OLD.funcionario_id, OLD.competencia_id, OLD.id_empresa
            FROM (SELECT 1) AS dummy
            WHERE OLD.origem != 'CALCULO'
              AND EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = OLD.evento_id AND `ativo` = 1)
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_lanc_dsr_insert` AFTER INSERT ON `lancamentos_eventos` FOR EACH ROW INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
            SELECT NEW.funcionario_id, NEW.competencia_id, NEW.id_empresa
            FROM (SELECT 1) AS dummy
            WHERE NEW.origem != 'CALCULO'
              AND EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = NEW.evento_id AND `ativo` = 1)
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_lanc_dsr_update` AFTER UPDATE ON `lancamentos_eventos` FOR EACH ROW INSERT IGNORE INTO `dsr_fila_recalculo` (funcionario_id, competencia_id, id_empresa)
            SELECT NEW.funcionario_id, NEW.competencia_id, NEW.id_empresa
            FROM (SELECT 1) AS dummy
            WHERE NEW.origem != 'CALCULO'
              AND (NEW.valor_total != OLD.valor_total OR NEW.evento_id != OLD.evento_id)
              AND (
                  EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = NEW.evento_id AND `ativo` = 1)
                  OR 
                  EXISTS (SELECT 1 FROM `dsr_config_eventos` WHERE `evento_id` = OLD.evento_id AND `ativo` = 1)
              )
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `logs_auditoria`
--

CREATE TABLE `logs_auditoria` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `entidade` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade_id` bigint(20) UNSIGNED NOT NULL,
  `acao` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalhes` text COLLATE utf8mb4_unicode_ci,
  `id_empresa` int(10) UNSIGNED NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `parametros_sistema`
--

CREATE TABLE `parametros_sistema` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `id_empresa` int(10) UNSIGNED NOT NULL,
  `chave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('TEXTO','NUMERO','BOOLEANO','JSON') COLLATE utf8mb4_unicode_ci DEFAULT 'TEXTO',
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `id_empresa` int(10) UNSIGNED DEFAULT '1',
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfil` enum('ADMIN','RH','GESTOR','LEITURA','SUPERADMIN') COLLATE utf8mb4_unicode_ci DEFAULT 'RH',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = usuario deve trocar a senha no proximo login'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `_migrations`
--

CREATE TABLE `_migrations` (
  `id` int(11) NOT NULL,
  `version` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `aliquotas_inss`
--
ALTER TABLE `aliquotas_inss`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vigencia` (`vigencia_inicio`,`vigencia_fim`),
  ADD KEY `idx_ativo` (`ativo`);

--
-- Índices de tabela `aliquotas_irrf`
--
ALTER TABLE `aliquotas_irrf`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vigencia` (`vigencia_inicio`,`vigencia_fim`);

--
-- Índices de tabela `cargos`
--
ALTER TABLE `cargos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nome` (`nome`);

--
-- Índices de tabela `competencias`
--
ALTER TABLE `competencias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_mes_ano_empresa` (`mes`,`ano`,`id_empresa`),
  ADD KEY `idx_comp_empresa` (`id_empresa`);

--
-- Índices de tabela `competencia_atestados`
--
ALTER TABLE `competencia_atestados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_atestado_func_comp` (`funcionario_id`,`competencia_id`),
  ADD KEY `idx_atestado_comp` (`competencia_id`),
  ADD KEY `idx_atestado_empresa` (`id_empresa`);

--
-- Índices de tabela `dependentes`
--
ALTER TABLE `dependentes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dep_funcionario` (`funcionario_id`);

--
-- Índices de tabela `dsr_calculado`
--
ALTER TABLE `dsr_calculado`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_func_comp_dsr` (`funcionario_id`,`competencia_id`);

--
-- Índices de tabela `dsr_config_eventos`
--
ALTER TABLE `dsr_config_eventos`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `dsr_faltas_pre_dsr`
--
ALTER TABLE `dsr_faltas_pre_dsr`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_falta_dsr` (`funcionario_id`,`competencia_id`,`data_falta`);

--
-- Índices de tabela `dsr_fila_recalculo`
--
ALTER TABLE `dsr_fila_recalculo`
  ADD PRIMARY KEY (`funcionario_id`,`competencia_id`);

--
-- Índices de tabela `dsr_he_config_eventos`
--
ALTER TABLE `dsr_he_config_eventos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_codigo_evento_fonte` (`codigo_evento_fonte`);

--
-- Índices de tabela `empresas`
--
ALTER TABLE `empresas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_slug` (`slug`);

--
-- Índices de tabela `eventos_folha`
--
ALTER TABLE `eventos_folha`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo_evento` (`codigo_evento`),
  ADD KEY `idx_codigo_evento` (`codigo_evento`),
  ADD KEY `idx_obrigatorio` (`obrigatorio`),
  ADD KEY `idx_ativo` (`ativo`);

--
-- Índices de tabela `fechamento_fila`
--
ALTER TABLE `fechamento_fila`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_snapshot` (`id_snapshot`),
  ADD KEY `idx_status` (`status`);

--
-- Índices de tabela `fechamento_snapshot`
--
ALTER TABLE `fechamento_snapshot`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_empresa_comp` (`id_empresa`,`id_competencia`);

--
-- Índices de tabela `feriados`
--
ALTER TABLE `feriados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_feriado_data_local` (`data`,`tipo`,`uf`,`cidade`,`empresa_id`),
  ADD KEY `idx_feriado_empresa` (`empresa_id`),
  ADD KEY `idx_feriado_busca` (`tipo`,`uf`,`cidade`,`ativo`);

--
-- Índices de tabela `ferias`
--
ALTER TABLE `ferias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ferias_funcionario` (`funcionario_id`);

--
-- Índices de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_contrato_empresa` (`id_contrato`,`id_empresa`),
  ADD KEY `idx_id_contrato` (`id_contrato`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_func_empresa` (`id_empresa`);

--
-- Índices de tabela `jwt_blacklist`
--
ALTER TABLE `jwt_blacklist`
  ADD PRIMARY KEY (`jti`),
  ADD KEY `idx_jwt_blacklist_expira` (`expira_em`);

--
-- Índices de tabela `lancamentos_eventos`
--
ALTER TABLE `lancamentos_eventos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_func_comp_evento` (`funcionario_id`,`competencia_id`,`evento_id`),
  ADD KEY `fk_lanc_evento` (`evento_id`),
  ADD KEY `idx_func_comp` (`funcionario_id`,`competencia_id`),
  ADD KEY `idx_comp_evento` (`competencia_id`,`evento_id`),
  ADD KEY `idx_lanc_empresa` (`id_empresa`);

--
-- Índices de tabela `logs_auditoria`
--
ALTER TABLE `logs_auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_entidade` (`entidade`,`entidade_id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_logs_empresa` (`id_empresa`);

--
-- Índices de tabela `parametros_sistema`
--
ALTER TABLE `parametros_sistema`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_empresa_chave` (`id_empresa`,`chave`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_perfil` (`perfil`),
  ADD KEY `idx_usuarios_empresa` (`id_empresa`),
  ADD KEY `idx_id_empresa` (`id_empresa`);

--
-- Índices de tabela `_migrations`
--
ALTER TABLE `_migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `version` (`version`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `aliquotas_inss`
--
ALTER TABLE `aliquotas_inss`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT de tabela `aliquotas_irrf`
--
ALTER TABLE `aliquotas_irrf`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de tabela `cargos`
--
ALTER TABLE `cargos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `competencias`
--
ALTER TABLE `competencias`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `competencia_atestados`
--
ALTER TABLE `competencia_atestados`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `dependentes`
--
ALTER TABLE `dependentes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `dsr_calculado`
--
ALTER TABLE `dsr_calculado`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `dsr_config_eventos`
--
ALTER TABLE `dsr_config_eventos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `dsr_faltas_pre_dsr`
--
ALTER TABLE `dsr_faltas_pre_dsr`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `dsr_he_config_eventos`
--
ALTER TABLE `dsr_he_config_eventos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `empresas`
--
ALTER TABLE `empresas`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `eventos_folha`
--
ALTER TABLE `eventos_folha`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT de tabela `fechamento_fila`
--
ALTER TABLE `fechamento_fila`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `fechamento_snapshot`
--
ALTER TABLE `fechamento_snapshot`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `feriados`
--
ALTER TABLE `feriados`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de tabela `ferias`
--
ALTER TABLE `ferias`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `lancamentos_eventos`
--
ALTER TABLE `lancamentos_eventos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `logs_auditoria`
--
ALTER TABLE `logs_auditoria`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `parametros_sistema`
--
ALTER TABLE `parametros_sistema`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `_migrations`
--
ALTER TABLE `_migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `dependentes`
--
ALTER TABLE `dependentes`
  ADD CONSTRAINT `fk_dep_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `ferias`
--
ALTER TABLE `ferias`
  ADD CONSTRAINT `fk_ferias_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `lancamentos_eventos`
--
ALTER TABLE `lancamentos_eventos`
  ADD CONSTRAINT `fk_lanc_competencia` FOREIGN KEY (`competencia_id`) REFERENCES `competencias` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_lanc_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_folha` (`id`),
  ADD CONSTRAINT `fk_lanc_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `logs_auditoria`
--
ALTER TABLE `logs_auditoria`
  ADD CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `parametros_sistema`
--
ALTER TABLE `parametros_sistema`
  ADD CONSTRAINT `fk_param_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
