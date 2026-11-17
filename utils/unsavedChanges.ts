/**
 * Registro global de "alterações não salvas" da folha.
 * O app usa <BrowserRouter> (sem data router), então useBlocker não está disponível:
 * o grid publica aqui seu estado e o menu lateral/logout/troca de empresa consultam antes de navegar.
 *
 * v4.55.0: criado (window.confirm).
 * v4.56.0: diálogo visual (UnsavedChangesDialog) com "Salvar e continuar" — fluxo assíncrono.
 */

export const MENSAGEM_ALTERACOES_NAO_SALVAS =
    'Você tem alterações não salvas na folha.\n\nSe sair agora, elas serão perdidas. Deseja sair sem salvar?';

/** 'salvar' = já salvo com sucesso pelo diálogo; 'descartar' = sair sem salvar; 'cancelar' = continuar editando. */
export type DecisaoAlteracoes = 'salvar' | 'descartar' | 'cancelar';

type AbrirDialogo = (descricao: string, resolver: (decisao: DecisaoAlteracoes) => void) => void;

let alteracoesPendentes = false;
let descricaoPendencia = '';
let salvarHandler: (() => Promise<boolean>) | null = null;
let abrirDialogo: AbrirDialogo | null = null;

/** Publicado pelo grid. `descricao` identifica o contexto (ex: "09/2026"). */
export function setAlteracoesPendentes(valor: boolean, descricao = ''): void {
    alteracoesPendentes = valor;
    descricaoPendencia = valor ? descricao : '';
}

export function hasAlteracoesPendentes(): boolean {
    return alteracoesPendentes;
}

/** Grid registra a função de salvar usada pelo botão "Salvar e continuar". */
export function registrarSalvamento(fn: (() => Promise<boolean>) | null): void {
    salvarHandler = fn;
}

export function getSalvamento(): (() => Promise<boolean>) | null {
    return salvarHandler;
}

/** UnsavedChangesDialog (montado no Layout) registra como se abrir. */
export function registrarDialogo(fn: AbrirDialogo | null): void {
    abrirDialogo = fn;
}

/**
 * Resolve true se pode prosseguir com a navegação
 * (sem pendências, usuário salvou pelo diálogo ou escolheu descartar).
 */
export async function confirmarDescarteAlteracoes(): Promise<boolean> {
    if (!alteracoesPendentes) return true;

    if (!abrirDialogo) {
        // Fallback: diálogo não montado (não deveria ocorrer dentro do Layout)
        return window.confirm(MENSAGEM_ALTERACOES_NAO_SALVAS);
    }

    const decisao = await new Promise<DecisaoAlteracoes>(resolve => abrirDialogo!(descricaoPendencia, resolve));
    return decisao !== 'cancelar';
}
