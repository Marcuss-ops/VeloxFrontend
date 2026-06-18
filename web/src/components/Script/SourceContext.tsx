import React from 'react';

interface SourceContextProps {
    value: string;
    onChange: (value: string) => void;
}

export const SourceContext: React.FC<SourceContextProps> = ({ value, onChange }) => {
    return (
        <div className="p-4 border-b border-white/5 bg-slate-900/20">
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-400 text-lg">description</span>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Source Context</label>
                <div className="ml-auto flex items-center gap-1.5 bg-slate-950/40 px-2 py-1 rounded-lg border border-white/5">
                    <span className="material-symbols-outlined text-[10px] text-slate-500">schedule</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Storico Video</span>
                </div>
            </div>

            <div className="relative group">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste link or text... Incolla link o testi di riferimento per l'AI..."
                    className="w-full h-24 bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500/50 outline-none resize-none transition-all hover:border-white/20 custom-scrollbar"
                />
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-10 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                    <span className="material-symbols-outlined text-sm text-slate-500">content_paste</span>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">AI reference context</span>
                <div className="flex-1 h-px bg-gradient-to-l from-white/10 to-transparent"></div>
            </div>
        </div>
    );
};
