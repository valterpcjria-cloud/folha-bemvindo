/**
 * UnsavedChangesDialog - diálogo de "Alterações não salvas" (v4.56.0)
 * Montado uma vez no Layout. Registra-se em utils/unsavedChanges para que
 * confirmarDescarteAlteracoes() abra este modal no lugar do window.confirm().
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { DecisaoAlteracoes, getSalvamento, registrarDialogo } from '../utils/unsavedChanges';

const UnsavedChangesDialog: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [descricao, setDescricao] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const resolverRef = useRef<((decisao: DecisaoAlteracoes) => void) | null>(null);

    useEffect(() => {
        registrarDialogo((desc, resolver) => {
            // Pedido anterior ainda aberto → trata como "continuar editando"
            resolverRef.current?.('cancelar');
            resolverRef.current = resolver;
            setDescricao(desc);
            setErro(null);
            setIsSaving(false);
            setIsOpen(true);
        });
        return () => registrarDialogo(null);
    }, []);

    const finalizar = useCallback((decisao: DecisaoAlteracoes) => {
        setIsOpen(false);
        const resolver = resolverRef.current;
        resolverRef.current = null;
        resolver?.(decisao);
    }, []);

    const handleSalvar = useCallback(async () => {
        const salvar = getSalvamento();
        if (!salvar) {
            setErro('Não foi possível salvar daqui. Use o botão "Salvar Alterações" da folha.');
            return;
        }
        setIsSaving(true);
        setErro(null);
        try {
            const ok = await salvar();
            if (ok) {
                finalizar('salvar');
            } else {
                setErro('A folha não foi salva. Tente novamente.');
            }
        } catch (e: any) {
            setErro(`Erro ao salvar: ${e?.message || 'falha desconhecida'}`);
        } finally {
            setIsSaving(false);
        }
    }, [finalizar]);

    const mensagem = descricao
        ? `Você alterou lançamentos da competência ${descricao} que ainda não foram salvos.\nSe sair agora, essas alterações serão perdidas.`
        : 'Você alterou lançamentos que ainda não foram salvos.\nSe sair agora, essas alterações serão perdidas.';

    return (
        <ConfirmModal
            isOpen={isOpen}
            variant="warning"
            title="Alterações não salvas"
            message={mensagem}
            extraText="Salvar e continuar"
            extraIcon={<Save size={16} />}
            onExtra={handleSalvar}
            confirmText="Sair sem salvar"
            onConfirm={() => finalizar('descartar')}
            cancelText="Continuar editando"
            onCancel={() => finalizar('cancelar')}
            isLoading={isSaving}
            errorText={erro}
        />
    );
};

export default UnsavedChangesDialog;
