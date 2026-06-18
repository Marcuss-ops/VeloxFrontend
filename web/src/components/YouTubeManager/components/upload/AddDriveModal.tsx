import React from 'react';

export interface AddDriveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenDriveOAuth: () => void;
}

export const AddDriveModal: React.FC<AddDriveModalProps> = ({ isOpen, onClose, onOpenDriveOAuth }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1C1C1E] rounded-2xl p-6 max-w-lg mx-4 shadow-2xl border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <span className="material-icons text-white text-xl">cloud_upload</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100">Collega Google Drive</h3>
                        <p className="text-xs text-gray-500">Per caricare e gestire i video</p>
                    </div>
                </div>

                <div className="bg-[#2C2C2E] rounded-xl p-4 mb-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">1</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Clicca &quot;Connect Drive&quot;</p>
                            <p className="text-xs text-gray-500 mt-0.5">Verrai reindirizzato alla pagina di autenticazione Google</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">2</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Seleziona il tuo account Google</p>
                            <p className="text-xs text-gray-500 mt-0.5">Scegli l&apos;account per gestire i file su Drive</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">3</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-300">Accetta i permessi per la gestione file</p>
                            <p className="text-xs text-gray-500 mt-0.5">Il sistema potrà caricare e organizzare i video</p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                    <p className="text-xs text-green-300 font-medium mb-1">Cosa succede &quot;dietro le quinte&quot;:</p>
                    <ul className="text-xs text-gray-400 space-y-1 ml-3">
                        <li>• Il server riceverà il nuovo codice da Google</li>
                        <li>• Creerà automaticamente i nuovi file .json</li>
                        <li>• I video saranno pronti per essere caricati</li>
                    </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                    <p className="text-xs text-amber-300">
                        <span className="font-semibold">Nota:</span> Se ricevi un errore &quot;400: redirect_uri_mismatch&quot;,
                        dobbiamo aggiornare l&apos;URL nel file di configurazione del server.
                    </p>
                </div>

                <button
                    onClick={() => {
                        onOpenDriveOAuth();
                        onClose();
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20"
                >
                    <span className="material-icons text-lg">cloud_upload</span>
                    <span>Collega Google Drive</span>
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
