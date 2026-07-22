import React, { useEffect, useMemo, useState } from 'react';

import { VideoStyle, type GroupChannel } from '../types';
import { useScript } from '../../../app/providers/ScriptProvider';

interface StyleGroupSelectorProps {
    selectedGroup: string | null;
    selectedStyle: VideoStyle;
    onGroupChange: (group: string) => void;
    onStyleChange: (style: VideoStyle) => void;
    onHistoryClick?: () => void;
}

interface UiGroup {
    id: string;
    label: string;
    icon: string;
    color: string;
    channels: GroupChannel[];
}

interface ChannelData {
    id?: string;
    channelId?: string;
    channel_id?: string;
    title?: string;
    channel?: string;
    name?: string;
    default_language?: string;
    lang?: string;
}

interface GroupData {
    name?: string;
    channels?: (string | ChannelData)[];
}

interface ChannelsPayload {
    channels?: ChannelData[];
    groups?: GroupData[];
}

const FALLBACK_GROUPS: UiGroup[] = [
    { id: 'WWE', label: 'WWE', icon: 'sports_mma', color: 'from-red-500 to-red-600', channels: [] },
    { id: 'HipHop', label: 'HIPHOP', icon: 'music_note', color: 'from-orange-500 to-amber-600', channels: [] },
    { id: 'Discovery', label: 'DISCOVERY', icon: 'explore', color: 'from-blue-500 to-cyan-600', channels: [] },
    { id: 'Crime', label: 'CRIME', icon: 'local_police', color: 'from-slate-600 to-slate-800', channels: [] },
    { id: 'Boxe', label: 'BOXE', icon: 'sports_handball', color: 'from-yellow-500 to-orange-600', channels: [] },
    { id: 'Music', label: 'MUSIC', icon: 'queue_music', color: 'from-purple-500 to-pink-600', channels: [] },
    { id: 'Pop', label: 'POP', icon: 'star', color: 'from-pink-500 to-rose-600', channels: [] },
];

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

const CACHE_KEY = 'script_youtube_groups_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
let memoryCache: { ts: number; groups: UiGroup[] } | null = null;

const iconByGroupName = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('rap') || n.includes('hip') || n.includes('music')) return 'music_note';
    if (n.includes('crime') || n.includes('news')) return 'local_police';
    if (n.includes('discover')) return 'explore';
    if (n.includes('wwe') || n.includes('mma') || n.includes('box')) return 'sports_mma';
    return 'video_library';
};

const normalizeGroupsPayload = (channelsPayload: ChannelsPayload): UiGroup[] => {
    const channelsList = Array.isArray(channelsPayload?.channels) ? channelsPayload.channels : [];
    const byId = new Map<string, ChannelData>();
    channelsList.forEach((ch: ChannelData) => {
        const id = String(ch?.id || ch?.channelId || '').trim();
        if (id) byId.set(id, ch);
    });

    const groupsRaw = Array.isArray(channelsPayload?.groups) ? channelsPayload.groups : [];
    const groups = groupsRaw
        .map((g: GroupData, idx: number): UiGroup | null => {
            const name = String(g?.name || '').trim();
            if (!name) return null;
            const channelsRaw = Array.isArray(g?.channels) ? g.channels : [];

            const channels: GroupChannel[] = channelsRaw
                .map((entry: string | ChannelData): GroupChannel | null => {
                    if (typeof entry === 'string') {
                        const channelData = byId.get(entry);
                        return {
                            id: entry,
                            channel: String(channelData?.title || entry),
                            lang: String(channelData?.default_language || '').trim() || undefined,
                        };
                    }
                    const id = String(entry?.id || entry?.channelId || entry?.channel_id || '').trim();
                    const channel = String(entry?.title || entry?.channel || entry?.name || id).trim();
                    if (!id && !channel) return null;
                    return {
                        id: id || channel,
                        channel: channel || id,
                        lang: String(entry?.lang || entry?.default_language || '').trim() || undefined,
                    };
                })
                .filter((x: GroupChannel | null): x is GroupChannel => !!x);

            return {
                id: name,
                label: name.toUpperCase(),
                icon: iconByGroupName(name),
                color: GROUP_COLORS[idx % GROUP_COLORS.length],
                channels,
            };
        })
        .filter((x: UiGroup | null): x is UiGroup => !!x);

    return groups;
};

const normalizeGroupsOnlyPayload = (groupsPayload: any): UiGroup[] => {
    const groupsRaw = Array.isArray(groupsPayload?.groups) ? groupsPayload.groups : [];
    return groupsRaw
        .map((g: any, idx: number): UiGroup | null => {
            const name = String(g?.name || '').trim();
            if (!name) return null;
            const channelsRaw = Array.isArray(g?.channels) ? g.channels : [];
            const channels: GroupChannel[] = channelsRaw
                .map((entry: any): GroupChannel | null => {
                    if (typeof entry === 'string') {
                        return { id: entry, channel: entry, lang: undefined };
                    }
                    const id = String(entry?.id || entry?.channelId || entry?.channel_id || '').trim();
                    const channel = String(entry?.title || entry?.channel || entry?.name || id).trim();
                    if (!id && !channel) return null;
                    return { id: id || channel, channel: channel || id, lang: undefined };
                })
                .filter((x: GroupChannel | null): x is GroupChannel => !!x);

            return {
                id: name,
                label: name.toUpperCase(),
                icon: iconByGroupName(name),
                color: GROUP_COLORS[idx % GROUP_COLORS.length],
                channels,
            };
        })
        .filter((x: UiGroup | null): x is UiGroup => !!x);
};

const readCachedGroups = (): UiGroup[] | null => {
    const now = Date.now();
    if (memoryCache && now - memoryCache.ts < CACHE_TTL_MS) return memoryCache.groups;
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.ts || !Array.isArray(parsed?.groups)) return null;
        if (now - parsed.ts > CACHE_TTL_MS) return null;
        memoryCache = { ts: parsed.ts, groups: parsed.groups as UiGroup[] };
        return memoryCache.groups;
    } catch {
        return null;
    }
};

const writeCachedGroups = (groups: UiGroup[]) => {
    const payload = { ts: Date.now(), groups };
    memoryCache = payload;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
        // best-effort cache only
    }
};

const getStaticGroups = async (): Promise<UiGroup[]> => {
    // YouTube Manager has been removed; static fallback groups remain available.
    return FALLBACK_GROUPS;
};

const VIDEO_MODES: { value: VideoStyle; label: string; icon: string; desc: string }[] = [
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
    const { setGroupChannels } = useScript();
    const [groups, setGroups] = useState<UiGroup[]>(FALLBACK_GROUPS);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);

    useEffect(() => {
        let alive = true;
        setIsLoadingGroups(true);
        getStaticGroups()
            .then((loaded) => {
                if (!alive) return;
                const activeGroups = loaded.length > 0 ? loaded : FALLBACK_GROUPS;
                setGroups(activeGroups);

                // Update React Context instead of window.groupChannels
                const map: Record<string, GroupChannel[]> = {};
                activeGroups.forEach((g) => { map[g.id] = g.channels || []; });
                setGroupChannels(map);
            })
            .catch(() => {
                if (!alive) return;
                setGroups(FALLBACK_GROUPS);
                // Update React Context instead of window.groupChannels
                const map: Record<string, GroupChannel[]> = {};
                FALLBACK_GROUPS.forEach((g) => { map[g.id] = g.channels || []; });
                setGroupChannels(map);
            })
            .finally(() => {
                if (alive) setIsLoadingGroups(false);
            });
        return () => {
            alive = false;
        };
    }, [setGroupChannels]);

    const selectedGroupData = useMemo(() => groups.find(g => g.id === selectedGroup), [groups, selectedGroup]);

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
                        <div className="text-[11px] text-slate-500 font-medium">Caricamento gruppi...</div>
                    ) : (
                        <div className="text-[11px] text-slate-500 font-medium">{groups.length} gruppi</div>
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
                Gruppi Video
            </div>
            <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                    <button
                        key={group.id}
                        onClick={() => onGroupChange(group.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors duration-200 ${selectedGroup === group.id
                            ? 'bg-slate-200 text-slate-900 border-slate-100'
                            : 'bg-slate-900/70 border-white/10 text-slate-300 hover:border-white/20 hover:bg-slate-800/70'
                            }`}
                    >
                        <span className="text-[11px] font-semibold tracking-wide">{group.label}</span>
                        {selectedGroup === group.id && (
                            <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                    </button>
                ))}
            </div>

            {selectedGroup && selectedGroupData?.channels && selectedGroupData.channels.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white/5 rounded-xl border border-white/5 animate-fadeIn">
                    {selectedGroupData.channels.slice(0, 6).map((chan: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-slate-950/60 rounded-md border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {chan.channel?.split(' ')[0]}
                        </div>
                    ))}
                    {selectedGroupData.channels.length > 6 && (
                        <span className="text-[10px] font-bold text-slate-600 px-1">+{selectedGroupData.channels.length - 6}</span>
                    )}
                </div>
            )}
        </div>
    );
};
