# Sistema de Folha de Pagamento RH - Frimelo
## Release Notes - v4.39.4

**Data de Lançamento:** 19 de Março de 2026

Atualização pontual que corrige os códigos das rubricas conforme solicitação.

### 🛠 Correções

1.  **Código de Evento — Horas Extras 100%:**
    - O código do evento "Horas Extras 100%" foi alterado de **907** para **49**.
    - Ajuste aplicado em toda a aplicação (frontend e scripts de banco).

2.  **Código de Evento — DSR Reflexo:**
    - O código do evento "DSR Reflexo" foi alterado de **55** para **60**.
    - Ajuste aplicado nas regras de cálculo (frontend e backend).

### ⚠️ Ação Obrigatória no Banco de Dados

Após o upload, execute o seguinte comando SQL no banco de produção para atualizar os registros existentes:

```sql
UPDATE eventos_folha SET codigo_evento = 49 WHERE codigo_evento = 907;
UPDATE eventos_folha SET codigo_evento = 60 WHERE codigo_evento = 55;
```

### 📦 Instruções de Atualização

1.  Efetue o Upload do pacote **`deploy-frimelo-4.39.4.zip`**.
2.  Extraia os arquivos no servidor HostGator (substituindo o Backend e Frontend).
3.  **EXECUÇÃO OBRIGATÓRIA:** Execute os comandos SQL acima no phpMyAdmin para atualizar os códigos no banco.
4.  Atualize o sistema (**F5**) e verifique se as configurações foram refletidas.
