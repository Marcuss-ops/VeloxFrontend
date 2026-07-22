import React from 'react';

import { DestinationSelector } from './DestinationSelector';

interface StyleGroupSelectorProps {
    selectedGroup: string | null;
    selectedStyle: import('../types').VideoStyle;
    onGroupChange: (group: string) => void;
    onStyleChange: (style: import('../types').VideoStyle) => void;
    onHistoryClick?: () => void;
}


const VIDEO_MODES: { value: import('../types').VideoStyle; label: string; icon: string; desc: string }[] = [
    { value: 'normal', label: 'Normal', icon: 'videocam', desc: 'Video standard con clip e stock' },
    { value: 'ai-image', label: 'AiImage', icon: 'image', desc: 'Solo immagini generate da AI' },
    { value: 'ai-video', label: 'AiVideo', icon: 'smart_display', desc: 'Video Full AI generato' },
];


export const StyleGroupSelector: React.FC<StyleGroupSelectorProps> = ({
    selectedGroup,
    selectedStyle,
    onGroupChange,
    onStyleChange,
    onHistoryClick,
}) => {

    return (
        <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-200 text-xl">auto_fix_high</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                        Script Generator
                    </h3>

                    {/* VIDEO MODE BUTTONS: Normal · AiImage · AiVideo */}
                    <div className="flex items-center gap-1.5 ml-3 bg-slate-950/60 rounded-xl p-1 border border-white/5">
                        {VIDEO_MODES.map((mode) => {
                            const isActive = selectedStyle === mode.value;
                            return (
                                <button
                                    key={mode.value}
                                    onClick={() => onStyleChange(mode.value)}
                                    title={mode.desc}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all duration-200 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30 border border-blue-400/30'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{mode.icon}</span>
                                    {mode.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onHistoryClick}
                        className="px-3 py-2 bg-slate-900/70 hover:bg-slate-800/80 text-slate-300 rounded-lg border border-white/10 transition-colors flex items-center gap-2 text-xs font-medium"
                        title="Storico configurazioni precedenti"
                    >
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        Storico
                    </button>
                </div>
            </div>

            <DestinationSelector selectedId={selectedGroup} onChange={onGroupChange} />
        </div>
    );
};
