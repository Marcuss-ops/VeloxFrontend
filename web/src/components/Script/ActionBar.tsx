import React from 'react';

interface ActionBarProps {
    isGenerating: boolean;
    progress: number;
    onExecute: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({ isGenerating, progress, onExecute }) => {
    return (
        <div className="sticky bottom-4 z-40 w-full max-w-7xl mx-auto mt-16">
            <div className="glass-panel justify-center rounded-2xl border border-white/10 p-4 shadow-2xl flex items-center bg-slate-950/80 backdrop-blur-xl transition-all">
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Stato Generazione</div>
                        <div className="text-xs text-slate-300 flex items-center gap-2">
                            {progress}%
                            {isGenerating && (
                                <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onExecute}
                        disabled={isGenerating}
                        className={`px-10 py-3.5 rounded-xl font-bold shadow-lg border border-blue-400/20 transition-all transform hover:scale-[1.02] flex items-center gap-3 text-sm tracking-wide ${isGenerating
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                Generazione in corso...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">rocket_launch</span>
                                Esegui & Genera
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
