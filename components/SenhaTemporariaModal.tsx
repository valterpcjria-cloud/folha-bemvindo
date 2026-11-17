/**
 * SenhaTemporariaModal - exibe UMA ÚNICA VEZ a senha temporária gerada
 * para um usuário novo (v4.57.0). O servidor não guarda a senha em texto puro.
 */

import React, { useState } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';

interface SenhaTemporariaModalProps {
    email: string;
    senha: string;
    onClose: () => void;
}

const SenhaTemporariaModal: React.FC<SenhaTemporariaModalProps> = ({ email, senha, onClose }) => {
    const [copiado, setCopiado] = useState(false);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(senha);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // Clipboard indisponível (http/permissão): usuário copia manualmente
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mb-4">
                        <KeyRound className="text-sky-600" size={30} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Usuário criado</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Senha temporária de <span className="font-semibold">{email}</span>.
                        No primeiro acesso, o sistema vai pedir para trocá-la.
                    </p>

                    <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3">
                        <code className="flex-1 text-left text-lg font-bold tracking-wider text-slate-800 select-all">{senha}</code>
                        <button onClick={copiar}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors">
                            {copiado ? <Check size={14} /> : <Copy size={14} />}
                            {copiado ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>

                    <p className="w-full text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-5">
                        ⚠️ Anote ou envie agora: esta senha <strong>não será exibida novamente</strong>.
                    </p>

                    <button onClick={onClose}
                        className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        Concluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SenhaTemporariaModal;
