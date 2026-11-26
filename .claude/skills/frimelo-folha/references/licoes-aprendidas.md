# Lições Aprendidas (sintoma → causa → solução)

Tabela histórica completa: `SPEC.md` §16. Ao descobrir uma nova, registre aqui e lá.

| Sintoma | Causa | Solução / regra |
|---|---|---|
| "Salvou mas sumiu no refresh" | `id_empresa` fora do `ON DUPLICATE KEY UPDATE` | Incluir sempre `id_empresa = VALUES(id_empresa)` |
| Campos zerados após save | `codigo_evento` ausente no payload | Enviar sempre |
| HE "voltou" para outro valor após F5 | Edição não salva (só estado local) | Antes de caçar bug, perguntar se clicou **Salvar**; v4.55+/v4.56 avisam |
| HE sem Gratificação | Fórmula duplicada em 5 lugares | Helper único `calcBaseHE()` + backend |
| Competência fechada mostrando valor ≠ pago | Cascata recalculava na tela em fechada | `recalcularCascataCompleta(..., compAberta)` |
| DSR/feriado errado só em produção | Backend de dias retornava null → fallback local | Corrigir os **dois** caminhos |
| Modal DSR / Fórmulas vazios sem erro | `fetch` lia `sessionStorage('token')`, chave inexistente | Usar `api.*` / `authHeaders()` |
| Botão sem ação (Imprimir/PDF) | Componente reutilizado sem passar callback opcional (`onPrint`) | Conferir props opcionais ao reutilizar |
| Script de manutenção executável sem login | `.htaccess` só reescrevia arquivos inexistentes | Só `index.php` acessível; endpoint = rota |
| Limite de login burlável | IP lido de `X-Forwarded-For` | IP só de `REMOTE_ADDR` / Cloudflare verificado |
| Zip com arquivos duplicados / script quebrando | Laço antigo no `create_zip.py` | Validar com `scripts/validar_zip.py` |
| FATAL_BOOT_ERROR pós-deploy | `index.html` em cache com chunks antigos | `no-cache` no `index.html` (`public/.htaccess`) + Ctrl+F5 |
| Usuário caiu na troca obrigatória "sem motivo" | Ele mesmo redefiniu a senha na tela Usuários | Conferir `logs_auditoria`; desde v4.58.0 editar a própria senha não força |
| `git push` parado | Caixa de senha no topo do VSCode | Orientar a olhar o topo |
| `git fetch` "repository not found" | Conta gh ativa sem acesso | Fluxo de push do `release-deploy.md` |
| Valor antigo persiste ao zerar quantidade | `if (qty<=0) return` sem zerar total | Sempre zerar `valor_total` quando `qty<=0` |
| IRRF positivo para RTM ≤ 5.000 | Redutor aplicado sobre BC | Redutor usa RTM; checar isenção antes |
| **BV** DSR dias úteis 500 no Docker | Imagem PHP sem `calendar` (`cal_days_in_month`, `easter_date`) | Dockerfile com `calendar gd bcmath pdo_mysql`; `php -m` a cada imagem |
| **BV** Tela sempre no cálculo reserva de feriados | `:uf` repetido na query → HY093 (prepares nativos) | Nomes distintos (`:uf2`). A Frimelo tem o mesmo bug — avisado, não mexido |
| **BV** PDF "- -GO" | Coluna é `nome_cidade`, código lia `cidade` | Fallback `cidade ?? nome_cidade` |
| **BV** Funcionário novo com insalubridade 324,20 sem ter direito | Padrão herdado 20% / assiduidade 11% | v1.1.0: padrão 0% em 4 lugares (form, API, cálculo, DEFAULT) |
| **BV** Proposta de trocar INSS 35 → 1950 pela resposta do escritório | Código do Questor é o da outra folha | Código existente nunca muda; só rubrica nova usa código novo |
| **BV** Cascata manual em `updateLancamento` esquecia rubricas novas | Cadeia repetida à mão em 3 lugares | v1.2.0: edição chama `recalcularCascataCompleta` |
| **BV** Imagem anterior sumiu da VPS | Cron do CRM `docker image prune -af --filter until=24h` | Reenviar do PC; não mexer no cron do CRM |
| **BV** "Conexão recusada" em localhost:8090 | Túnel SSH fechado | `ssh -N -L 8090:127.0.0.1:8090 luzitec-vps` |
| **BV** Consulta via `ssh '... -e "..."'` quebra | Aspas aninhadas | Mandar o SQL pelo stdin |
| **BV** PC sem espaço (0 MB), saídas sumindo | Imagens Docker de rebuilds acumuladas | `docker builder prune -f` + `docker image prune -f` com autorização |
| **BV** PDF do relatório com `"` no lugar de `−` | jsPDF/helvetica não tem U+2212 | Usar `-` em texto de PDF (v1.3.0) |

## Hábitos que evitaram problemas
- Reproduzir conta nova em Python/planilha com exemplo real e mostrar ao Valter.
- Antes de afirmar risco de segurança em produção, confirmar no código; para testar de fora, só endpoints inofensivos.
- Separar versões (stash) para cada zip conter só o que foi testado.
- Quando o Valter some no meio do trabalho: salvar ponto de parada na memória, não subir nada, deixar resumo do que ele precisa fazer.
- **BV:** antes de implementar coluna/regra do protótipo, conferir se ela depende de pergunta enviada à contabilidade (P1–P30); se depender, esperar.
- **BV:** testar a restauração do backup, não só a criação.
| **BV** Abrir o 2º mês daria 500 | `origem = 'COPIA_COMPETENCIA'` fora do ENUM; MariaDB com STRICT_TRANS_TABLES | ENUM ampliado na migration 14 (v1.4.0). Valor novo em coluna ENUM = migration |
| **BV** Lançamento gravado em competência fechada | Só o `saveBulk` checava o status | `saveSingle` também recusa (409) desde v1.4.0 |
