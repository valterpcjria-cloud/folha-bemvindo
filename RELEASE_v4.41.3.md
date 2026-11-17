# Sistema de Folha de Pagamento RH - Frimelo
## Release Notes - v4.41.3

**Data de Lançamento:** 26 de Março de 2026

Esta atualização introduz a automação do DSR e o pipeline real de fechamento de folha, substituindo as lógicas de simulação por cálculos baseados em regras de negócio.

### 🚀 Novidades

1.  **Lançamento Automático do DSR:** 
    - O `DsrService::calcularDSR()` agora persiste automaticamente o evento DSR (código 9999) na tabela `lancamentos_eventos`.
2.  **Pipeline Real de Fechamento:** 
    - Implementação dos 10 passos de cálculo por funcionário no `FechamentoService` (Salário Base → Eventos Variáveis → Base DSR → DSR → INSS → FGTS → IRRF → Líquido → Persistência).
3.  **Integração no Fechamento Expresso:** 
    - Remoção de valores randômicos. O processamento em lote agora utiliza o cálculo real para cada colaborador.

### 🛠 Alterações Técnicas

-   **PayrollConstants:** Adicionado código `DSR = 9999` aos eventos globais.
-   **Setup DB:** Evento DSR (ID 20) incluído no seed de eventos obrigatórios para novas instalações.
-   **Rotas:** Atualização no endpoint `/dsr.php` para utilizar o `id_empresa` dinâmico do contexto JWT.

### 📦 Instruções de Atualização

1.  Certifique-se de que o banco de dados está atualizado (o `setup_db.php` deve ser executado se for uma nova instância).
2.  Efetue o deploy dos novos arquivos de service em `backend/v1/services/`.
3.  Limpe o cache do navegador para garantir que as novas lógicas de exportação sejam carregadas corretamente.
