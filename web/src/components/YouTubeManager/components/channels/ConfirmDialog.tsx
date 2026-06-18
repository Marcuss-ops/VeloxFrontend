import React from 'react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#1C1C1E] rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-100 mb-2">{title}</h3>
                <p className="text-gray-400 text-sm mb-4">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                        Conferma
                    </button>
                </div>
            </div>
        </div>
    );
};
