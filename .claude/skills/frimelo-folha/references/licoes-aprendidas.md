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

## Hábitos que evitaram problemas
- Reproduzir conta nova em Python/planilha com exemplo real e mostrar ao Valter.
- Antes de afirmar risco de segurança em produção, confirmar no código; para testar de fora, só endpoints inofensivos.
- Separar versões (stash) para cada zip conter só o que foi testado.
- Quando o Valter some no meio do trabalho: salvar ponto de parada na memória, não subir nada, deixar resumo do que ele precisa fazer.
