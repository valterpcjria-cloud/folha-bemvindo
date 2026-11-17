/**
 * ConfirmModal - Modal de confirmação customizado
 * Substitui o confirm() nativo do browser por um design consistente
 *
 * v4.56.0: ação extra opcional (3º botão, destaque principal), estado de carregamento
 * e mensagem de erro — usados pelo diálogo de "Alterações não salvas".
 */

import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
    /** 3º botão opcional, exibido em destaque acima dos demais (ex: "Salvar e continuar") */
    extraText?: string;
    extraIcon?: React.ReactNode;
    onExtra?: () => void;
    /** Desabilita os botões e mostra spinner no botão extra */
    isLoading?: boolean;
    errorText?: string | null;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel,
    extraText,
    extraIcon,
    onExtra,
    isLoading = false,
    errorText = null
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'text-red-500',
            button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            iconBg: 'bg-red-100'
        },
        warning: {
            icon: 'text-amber-500',
            button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
            iconBg: 'bg-amber-100'
        },
        info: {
            icon: 'text-sky-500',
            button: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500',
            iconBg: 'bg-sky-100'
        }
    };

    const styles = variantStyles[variant];
    const hasExtra = Boolean(extraText && onExtra);
    const handleCancel = () => { if (!isLoading) onCancel(); };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={handleCancel}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
                    {/* Close button */}
                    <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                    >
                        <X size={20} />
                    </button>

                    {/* Content */}
                    <div className="flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
                            <AlertTriangle className={styles.icon} size={32} />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {title}
                        </h3>

                        {/* Message */}
                        <p className="text-slate-600 text-sm mb-6 whitespace-pre-line">
                            {message}
                        </p>

                        {errorText && (
                            <p className="w-full -mt-3 mb-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                {errorText}
                            </p>
                        )}

                        {/* Ação extra (principal) */}
                        {hasExtra && (
                            <button
                                onClick={onExtra}
                                disabled={isLoading}
                                className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-60"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : extraIcon}
                                {extraText}
                            </button>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-60"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${styles.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
