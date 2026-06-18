import React from 'react';

export interface CanvasToolbarProps {
    onOpenHistory: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onOpenHistory }) => {
    return (
        <>
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sky-400 text-lg">description</span>
                <label className="text-xs font-semibold text-slate-300 tracking-wide">Source Context</label>
                <button
                    type="button"
                    onClick={onOpenHistory}
                    className="ml-auto flex items-center gap-1.5 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-slate-800/70 hover:border-white/20 transition-all cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[12px] text-slate-500">schedule</span>
                    <span className="text-[10px] font-semibold text-slate-500 tracking-wide">Storico</span>
                </button>
            </div>
            <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none shrink-0">AI context</span>
                <div className="flex-1 h-px bg-gradient-to-l from-white/10 via-white/5 to-transparent"></div>
            </div>
        </>
    );
};