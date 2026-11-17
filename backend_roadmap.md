# Roadmap de Melhorias - Backend PHP (v1)

> ⚠️ **Documento histórico** (sugestões genéricas antigas). Pendências oficiais e atualizadas: **SPEC.md §20** (2026-10-01, v4.58.1).

Após analisar o código fonte atual, identifiquei oportunidades para tornar o sistema ainda mais **profissional, seguro e fácil de manter**. Abaixo estão as melhorias sugeridas:

## 1. 🏗️ Arquitetura e Organização
- **Service Layer (Camada de Serviço)**: Mover lógicas de negócio (como cálculos de folha e verificações de limites SaaS) dos arquivos da pasta `routes/` para classes `Service`. 
  - *Benefício*: Facilita testes automatizados e torna o código mais limpo.
- **BaseController**: Centralizar o tratamento de erros, entrada de dados (JSON) e respostas HTTP em uma classe pai.
  - *Benefício*: Padronização total de todas as respostas da API.

## 2. 💾 Gerenciamento de Dados
- **Sistema de Migrations Estruturado**: Criar uma ferramenta simples que gerencia as mudanças no banco de dados (`ALTER TABLE`, `INSERT` de configuração) via arquivos numerados.
  - *Benefício*: Evita conflitos em times de desenvolvimento e garante que o banco esteja sempre correto em novos servidores.
- **Repository Pattern**: Isolar as queries SQL em classes `Repository`.
  - *Benefício*: Se você decidir mudar o banco de dados ou otimizar uma query, altera em um único lugar.

## 3. 🔐 Segurança e Robustez
- **Validação com DTO/Schemas**: Implementar uma camada de validação que verifica se os campos enviados no POST estão corretos (tipo, tamanho, formato) **antes** de tentar salvar no banco.
  - *Benefício*: Previne bugs causados por dados inválidos e melhora a experiência do desenvolvedor frontend.
- **Logging Estruturado**: Evoluir o `registrarLog` para um formato JSON e incluir níveis de erro (INFO, WARNING, CRITICAL).
  - *Benefício*: Facilita a busca por erros e permite integração com ferramentas de monitoramento.

## 4. ⚡ Performance e Escalabilidade
- **Carga sob demanda (Pagination)**: Garantir que todas as rotas de listagem suportem paginação (`limit`/`offset`) para que a interface não fique lenta com milhares de registros.
- **Caching de Configurações**: Armazenar os parâmetros do sistema em memória (ou um cache simples) para evitar consultas frequentes à tabela `parametros`.

---

**Sugestão de Próximo Passo:**
Qual dessas melhorias você gostaria de ver implementada primeiro como um exemplo? Eu recomendaria começar pela **Service Layer** ou pelo **Sistema de Migrations**.
