import React from 'react';

interface RegenerateToastProps {
    ok: boolean;
    message: string;
    onClose: () => void;
}

export const RegenerateToast: React.FC<RegenerateToastProps> = ({ ok, message, onClose }) => {
    return (
        <div className={`fixed bottom-4 right-4 z-50 max-w-md p-4 rounded-xl border shadow-lg ${
            ok
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
            <div className="flex items-start gap-3">
                <span className="material-symbols-rounded">
                    {ok ? 'check_circle' : 'error'}
                </span>
                <div className="flex-1">
                    <div className="font-medium">{ok ? 'Bundle Rigenerato' : 'Errore'}</div>
                    <div className="text-sm opacity-80 mt-1">{message}</div>
                </div>
                <button
                    onClick={onClose}
                    className="opacity-70 hover:opacity-100"
                >
                    <span className="material-symbols-rounded text-[18px]">close</span>
                </button>
            </div>
        </div>
    );
};

export default RegenerateToast;
