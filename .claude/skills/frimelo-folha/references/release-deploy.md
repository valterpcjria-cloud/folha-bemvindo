# Versão, Zip, Deploy, Push e Release

## Sequência
1. **Confirme o número da versão com o Valter.** Patch = correção; minor = funcionalidade nova. Hotfix urgente com ele ausente: patch óbvio + avisar.
2. Build e pacote:
   ```bash
   npm --no-git-tag-version version X.Y.Z && npx vite build && python3 create_zip.py --version X.Y.Z
   python3 .claude/skills/frimelo-folha/scripts/validar_zip.py deploy-frimelo-X.Y.Z.zip --versao X.Y.Z
   ```
   O zip (gitignored) contém `dist/` na raiz + `backend/` (sem `.env`, sem `logs/`/`sys_logs/`).
3. **Entregue no mesmo turno:** caminho do zip, se há SQL (cole o conteúdo), mudanças em linguagem simples, o que testar sem alterar dado real, rollback (zip anterior).
4. Valter: roda migration (se houver) → sobe e extrai o zip no cPanel → Ctrl+F5 → confere versão no menu lateral → testa. Você pode checar de fora com `scripts/verificar_producao.sh`.
5. **Após OK**: atualize docs — `CHANGELOG.md` (seções Adicionado/Alterado/Corrigido/Segurança/Banco de Dados), `SPEC.md` (versão do documento, "Versão Atual", seções afetadas, tabela §19, pendências §20), `PRD.md` (cabeçalho de versão), `CLAUDE.md` (regras novas + "Última atualização"). Se mudou regra, fórmula, fluxo ou surgiu lição nova, atualize **esta skill** (`.claude/skills/frimelo-folha/`) no mesmo commit de docs.
6. Commits separados (Conventional Commits, PT-BR, com a linha de co-autoria exigida pelo ambiente):
   `feat|fix(vX.Y.Z): ...` (código + package.json/lock) e `docs: atualiza CHANGELOG, SPEC, PRD e CLAUDE para vX.Y.Z`; depois `git tag vX.Y.Z`.
   Se precisar separar versões que estão misturadas no working tree, use `git stash` para isolar (feito no hotfix v4.57.1).
7. Escreva as notas de release num arquivo (scratchpad) no formato: título, "Versão anterior → Nova", seções por área, "Deploy" (zip + SQL).
8. Passe ao Valter os comandos (ele roda no terminal do VSCode):
   ```bash
   git push origin main vX.Y.Z
   ```
   ```bash
   read -s -p "Token: " GH_TOKEN; export GH_TOKEN; /home/valterpcjria/.local/bin/gh release create vX.Y.Z deploy-frimelo-X.Y.Z.zip --repo valterpcjria-cloud/folha-frimelo --title "vX.Y.Z — ..." --notes-file /caminho/notas.md; unset GH_TOKEN
   ```
   Por quê: a conta gh ativa (`edusilvapereira2012-web`) não acessa o repo e ele não pode trocá-la (outros sistemas). O remote local já usa `https://valterpcjria-cloud@github.com/...` com `credential.helper` vazio; a senha (token fine-grained `frimelo-deploy`, vence 31/12/2027) aparece numa caixa **no topo do VSCode**. `gh` não está no PATH do `sh` → caminho completo.
9. Confirme: `git status -sb` sem `[ahead N]`.

## Armadilhas
- Colar `cd "..."` no `sh` do VSCode quebra (bracketed paste) — mande comandos sem `cd`.
- Você não consegue fazer push (sem prompt de senha no seu shell) — não tente contornar com o token.
- Nunca grave o token em arquivo, memória ou mensagem.
- Se o push "não acontece nada", a caixa de senha está no topo do VSCode.
