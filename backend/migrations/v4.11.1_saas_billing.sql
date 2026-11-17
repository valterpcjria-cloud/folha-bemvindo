-- v4.11.1_saas_billing.sql
-- Adiciona colunas de faturamento e limites para o modelo de negócios SaaS

ALTER TABLE `empresas` 
ADD COLUMN `valor_mensalidade` DECIMAL(10,2) DEFAULT 0.00 AFTER `ativa`,
ADD COLUMN `plano` VARCHAR(50) DEFAULT 'BRONZE' AFTER `valor_mensalidade`,
ADD COLUMN `limite_funcionarios` INT UNSIGNED DEFAULT 10 AFTER `plano`,
ADD COLUMN `vencimento_dia` TINYINT UNSIGNED DEFAULT 10 AFTER `limite_funcionarios`;

-- Atualizar empresa Frimelo com valores padrão
UPDATE `empresas` SET 
    `valor_mensalidade` = 1500.00, 
    `plano` = 'PLATINUM', 
    `limite_funcionarios` = 100, 
    `vencimento_dia` = 5 
WHERE `id` = 1;
