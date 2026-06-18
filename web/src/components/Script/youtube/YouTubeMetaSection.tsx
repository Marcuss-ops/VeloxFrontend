import React from 'react';

interface YouTubeMetaSectionProps {
    titles: string[];
    titleDescriptions: Record<string, string>;
    projectTags: string[];
    isGeneratingMeta: boolean;
    onGenerateMeta: () => void;
}

export const YouTubeMetaSection: React.FC<YouTubeMetaSectionProps> = ({
    titles,
    titleDescriptions,
    projectTags,
    isGeneratingMeta,
    onGenerateMeta
}) => {
    const validTitles = titles.map((t) => t.trim()).filter(Boolean);

    return (
        <div className="relative group rounded-[32px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-violet-500/5 opacity-50" />
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
            <div className="relative border border-white/10 rounded-[32px] shadow-2xl shadow-black/20 p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-fuchsia-400 text-xl">sell</span>
                        <div>
                            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Meta Sezioni Video</h4>
                            <p className="text-[11px] text-slate-500">Descrizioni e tag per invio al master</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onGenerateMeta}
                        disabled={isGeneratingMeta || validTitles.length === 0}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                            isGeneratingMeta || validTitles.length === 0
                                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                : 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/40 hover:bg-fuchsia-600/30'
                        }`}
                    >
                        {isGeneratingMeta ? 'Generazione...' : 'Genera Meta'}
                    </button>
                </div>

                {validTitles.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">Inserisci almeno un titolo per mostrare le sezioni meta.</div>
                ) : (
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Tag Progetto</div>
                            <div className="flex flex-wrap gap-2">
                                {projectTags.length > 0 ? (
                                    projectTags.map((tag) => (
                                        <span key={tag} className="px-2 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/25 text-[11px] text-fuchsia-200">
                                            #{tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[11px] text-slate-500">Nessun tag generato.</span>
                                )}
                            </div>
                        </div>

                        {validTitles.map((title, idx) => (
                            <div key={`${idx}-${title}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">
                                    Titolo #{idx + 1}
                                </div>
                                <div className="text-xs text-slate-300 font-semibold mb-2">{title}</div>
                                <textarea
                                    readOnly
                                    value={titleDescriptions[title] || ''}
                                    className="w-full min-h-[90px] rounded-xl bg-slate-900/70 border border-white/10 p-3 text-xs text-slate-300 resize-y"
                                    placeholder="Descrizione non ancora generata."
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

