import React, { useEffect, useMemo, useState } from 'react';

import { type GroupChannel } from '../types';
import { useScript } from '../../../app/providers/ScriptProvider';
import { useChannelLanguages } from '../hooks/useChannelLanguages';
import { type SocialDestination } from '@/lib/api/socialDestinationsApi';

interface StyleGroupSelectorProps {
    selectedGroup: string | null;
    selectedStyle: import('../types').VideoStyle;
    onGroupChange: (group: string) => void;
    onStyleChange: (style: import('../types').VideoStyle) => void;
    onHistoryClick?: () => void;
}

interface UiGroup {
    id: string;
    label: string;
    icon: string;
    color: string;
    channels: GroupChannel[];
}

const GROUP_COLORS = [
    'from-red-500 to-red-600',
    'from-orange-500 to-amber-600',
    'from-blue-500 to-cyan-600',
    'from-slate-600 to-slate-800',
    'from-yellow-500 to-orange-600',
    'from-purple-500 to-pink-600',
    'from-pink-500 to-rose-600',
    'from-emerald-500 to-teal-600',
];

const iconByLabel = (label: string): string => {
    const n = label.toLowerCase();
    if (n.includes('rap') || n.includes('hip') || n.includes('music')) return 'music_note';
    if (n.includes('crime') || n.includes('news')) return 'local_police';
    if (n.includes('discover')) return 'explore';
    if (n.includes('wwe') || n.includes('mma') || n.includes('box')) return 'sports_mma';
    return 'video_library';
};

const VIDEO_MODES: { value: import('../types').VideoStyle; label: string; icon: string; desc: string }[] = [
    { value: 'normal', label: 'Normal', icon: 'videocam', desc: 'Video standard con clip e stock' },
    { value: 'ai-image', label: 'AiImage', icon: 'image', desc: 'Solo immagini generate da AI' },
    { value: 'ai-video', label: 'AiVideo', icon: 'smart_display', desc: 'Video Full AI generato' },
];

/** Map a SocialDestination into the legacy UiGroup shape used by the ScriptProvider. */
function destinationToUiGroup(destination: SocialDestination, index: number): UiGroup {
    return {
        id: destination.external_destination_id,
        label: destination.label || destination.external_destination_id,
        icon: iconByLabel(destination.label || ''),
        color: GROUP_COLORS[index % GROUP_COLORS.length],
        channels: [],
    };
}

export const StyleGroupSelector: React.FC<StyleGroupSelectorProps> = ({
    selectedGroup,
    selectedStyle,
    onGroupChange,
    onStyleChange,
    onHistoryClick,
}) => {
    const { setGroupChannels } = useScript();
    const { youtubeDestinations, loading: isLoadingGroups } = useChannelLanguages();
    const [groups, setGroups] = useState<UiGroup[]>([]);

    useEffect(() => {
        const mapped = youtubeDestinations.map((d, i) => destinationToUiGroup(d, i));
        setGroups(mapped);

        // Update ScriptProvider context so downstream components still see group channels.
        const map: Record<string, GroupChannel[]> = {};
        youtubeDestinations.forEach((d, i) => {
            map[d.external_destination_id] = [];
        });
        setGroupChannels(map);
    }, [youtubeDestinations, setGroupChannels]);

    const selectedGroupData = useMemo(() => groups.find((g) => g.id === selectedGroup), [groups, selectedGroup]);

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
                    {isLoadingGroups ? (
                        <div className="text-[11px] text-slate-500 font-medium">Caricamento destinazioni...</div>
                    ) : (
                        <div className="text-[11px] text-slate-500 font-medium">{groups.length} destinazioni</div>
                    )}
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

            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium tracking-wide">
                <span className="material-symbols-outlined text-[15px]">video_library</span>
                Destinazioni YouTube
            </div>
            <div className="flex flex-wrap gap-2">
                {groups.length === 0 && !isLoadingGroups && (
                    <div className="text-xs text-slate-500">Nessuna destinazione YouTube collegata.</div>
                )}
                {groups.map((group) => (
                    <button
                        key={group.id}
                        onClick={() => onGroupChange(group.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors duration-200 ${selectedGroup === group.id
                            ? 'bg-slate-200 text-slate-900 border-slate-100'
                            : 'bg-slate-900/70 border-white/10 text-slate-300 hover:border-white/20 hover:bg-slate-800/70'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[14px]">{group.icon}</span>
                        <span className="text-[11px] font-semibold tracking-wide">{group.label}</span>
                        {selectedGroup === group.id && (
                            <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                    </button>
                ))}
            </div>

            {selectedGroup && selectedGroupData && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white/5 rounded-xl border border-white/5 animate-fadeIn">
                    <span className="text-[11px] text-slate-400">Destinazione selezionata:</span>
                    <span className="text-[11px] font-semibold text-slate-200">{selectedGroupData.label}</span>
                </div>
            )}
        </div>
    );
};
