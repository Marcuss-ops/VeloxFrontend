import React from 'react';

import { youtubeApi } from '@/lib/api';

export interface AddYouTubeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddYouTubeModal: React.FC<AddYouTubeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1C1C1E] rounded-2xl p-6 max-w-lg mx-4 shadow-2xl border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center">
                        <span className="material-icons text-blue-400">add_circle</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100">Aggiungi Canale YouTube</h3>
                        <p className="text-xs text-gray-500">Collega un nuovo canale YouTube al sistema</p>
                    </div>
                </div>

                <div className="bg-[#2C2C2E] rounded-xl p-4 mb-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">1</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Clicca &quot;Link Channel&quot; o &quot;Add Account&quot;</p>
                            <p className="text-xs text-gray-500 mt-0.5">Verrai reindirizzato alla pagina di autenticazione Google</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">2</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Seleziona il tuo account Google</p>
                            <p className="text-xs text-gray-500 mt-0.5">Scegli l&apos;account associato al canale YouTube</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">&#9888;</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Accetta TUTTE le autorizzazioni</p>
                            <p className="text-xs text-amber-400 mt-0.5">Importante: includi i permessi per YouTube Analytics!</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">3</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Ritorna qui e aggiorna</p>
                            <p className="text-xs text-gray-500 mt-0.5">Il canale apparirà automaticamente nella lista</p>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                    <p className="text-xs text-amber-300">
                        <span className="font-semibold">Nota:</span> Se ricevi un errore &quot;400: redirect_uri_mismatch&quot;,
                        dobbiamo aggiornare l&apos;URL nel file di configurazione del server.
                    </p>
                </div>

                <button
                    onClick={() => {
                        youtubeApi.startOAuth()
                            .then(result => {
                                if (result.auth_url) window.open(result.auth_url, '_blank');
                            })
                            .catch(err => {
                                console.error('OAuth start failed:', err);
                            });
                        onClose();
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-red-500/30 bg-black/30 text-white font-medium hover:bg-red-500/10 transition-all"
                >
                    <span className="material-icons text-blue-400">add_circle</span>
                    <span>Collega Canale YouTube</span>
                </button>

                <button
                    onClick={onClose}
                    className="w-full mt-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                >
                    Chiudi
                </button>
            </div>
        </div>
    );
};
