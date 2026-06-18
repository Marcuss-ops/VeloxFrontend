import React from 'react';

interface AIPromptSectionProps {
    description: string;
    selectedStyle: string;
    onDescriptionChange: (val: string) => void;
    onStyleChange: (val: string) => void;
}

const AI_STYLES: { value: string; label: string; icon: string; color: string; desc: string }[] = [
    { value: 'medievale', label: 'Medievale', icon: 'castle', color: 'from-amber-700 to-amber-900', desc: 'Castelli, cavalieri, atmosfere medievali' },
    { value: 'rinascimentale', label: 'Rinascimentale', icon: 'account_balance', color: 'from-stone-600 to-stone-800', desc: 'Armonia classica, prospettiva, arte rinascimentale' },
    { value: 'realistico', label: 'Realistico', icon: 'photo_camera', color: 'from-slate-600 to-slate-800', desc: 'Stile fotorealistico, dettagli naturali' },
    { value: 'art', label: 'Art', icon: 'palette', color: 'from-purple-600 to-pink-700', desc: 'Stile artistico libero, espressione creativa' },
];

export const AIPromptSection: React.FC<AIPromptSectionProps> = ({
    description,
    selectedStyle,
    onDescriptionChange,
    onStyleChange,
}) => {
    return (
        <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20">
            <div className="p-6 space-y-5">
                {/* HEADER */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10 flex items-center justify-center border border-indigo-500/30">
                        <span className="material-symbols-outlined text-indigo-400 text-xl">auto_awesome</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-100 tracking-wide">AI Prompt</h3>
                        <p className="text-[11px] text-slate-500">Descrivi il video che vuoi generare</p>
                    </div>
                </div>

                {/* DESCRIPTION TEXTAREA */}
                <div className="relative">
                    <textarea
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Descrivi il video nei dettagli... es. 'Un paesaggio montano al tramonto con nuvole rosse e arancioni, stile realistico cinematografico'"
                        className="w-full min-h-[140px] bg-slate-950/70 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/40 outline-none resize-none transition-all hover:border-white/20 custom-scrollbar"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 font-medium">
                        {description.length} caratteri
                    </div>
                </div>

                {/* ART STYLE SELECTOR */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">palette</span>
                        <span className="text-xs font-semibold text-slate-300 tracking-wide">Stile Artistico</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {AI_STYLES.map((style) => {
                            const isActive = selectedStyle === style.value;
                            return (
                                <button
                                    key={style.value}
                                    onClick={() => onStyleChange(style.value)}
                                    title={style.desc}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 group ${
                                        isActive
                                            ? `bg-gradient-to-br ${style.color} border-white/20 text-white shadow-lg`
                                            : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20 hover:bg-slate-900/80'
                                    }`}
                                >
                                    <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                        {style.icon}
                                    </span>
                                    <span className="text-[11px] font-bold tracking-wide">{style.label}</span>
                                    {isActive && (
                                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {/* STYLE DESCRIPTION */}
                    <div className="text-[11px] text-slate-500 italic pl-1">
                        {AI_STYLES.find(s => s.value === selectedStyle)?.desc || 'Seleziona uno stile per il video AI'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIPromptSection;
