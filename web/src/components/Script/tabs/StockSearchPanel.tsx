import React from 'react';

interface StockSearchPanelProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isLoading: boolean;
    onSubmit: () => void;
}

export const StockSearchPanel: React.FC<StockSearchPanelProps> = ({
    searchQuery,
    onSearchChange,
    isLoading,
    onSubmit,
}) => {
    return (
        <>
            {/* Search Query Section */}
            <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <span className="material-symbols-outlined text-amber-400 text-xl">search</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Ricerca Stock</h3>
                        <p className="text-xs text-slate-500">Cerca video stock su Pexels, Pixabay, ecc.</p>
                    </div>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Es: city night timelapse, nature mountains, abstract technology..."
                        className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500/40 outline-none resize-none transition-all hover:border-white/20"
                    />
                </div>
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-4 z-40">
                <div className="glass-panel rounded-2xl border border-white/10 p-4 shadow-2xl flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
                    <button
                        onClick={onSubmit}
                        disabled={isLoading}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold shadow-lg border border-amber-400/20 transition-all transform hover:scale-[1.02] ${
                            isLoading
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/20'
                        }`}
                    >
                        <span className="material-symbols-outlined">search</span>
                        {isLoading ? 'Ricerca...' : 'Cerca Stock'}
                    </button>
                </div>
            </div>
        </>
    );
};