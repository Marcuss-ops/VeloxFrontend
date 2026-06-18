import React, { useMemo } from 'react';

interface GroupChannel {
    id?: string;
    channel?: string;
    lang?: string;
}

interface YouTubeCardProps {
    title: string;
    titleIndex: number;
    lang: string;
    channels: GroupChannel[];
    selectedChannelKey: string;
    onChangeChannel: (nextKey: string) => void;
}

const langMap: Record<string, { flag: string; label: string }> = {
    'it-IT': { flag: '🇮🇹', label: 'Italiano' },
    'es-ES': { flag: '🇪🇸', label: 'Español' },
    'fr-FR': { flag: '🇫🇷', label: 'Français' },
    'en-US': { flag: '🇬🇧', label: 'English' },
    'de-DE': { flag: '🇩🇪', label: 'Deutsch' },
};

const baseLang = (lang: string) => lang.split('-')[0].toLowerCase();
const channelKey = (c: GroupChannel) => String(c?.id || c?.channel || '').trim();
const channelLabel = (c: GroupChannel) => String(c?.channel || c?.id || 'Canale').trim();

const pickBestChannel = (lang: string, channels: GroupChannel[]): GroupChannel | null => {
    const base = baseLang(lang);
    const exact = channels.find((c) => String(c?.lang || '').toLowerCase() === base);
    if (exact) return exact;
    const prefixed = channels.find((c) => String(c?.lang || '').toLowerCase().startsWith(`${base}-`));
    if (prefixed) return prefixed;
    return channels[0] || null;
};

const YouTubeCard: React.FC<YouTubeCardProps> = ({
    title,
    titleIndex,
    lang,
    channels,
    selectedChannelKey,
    onChangeChannel,
}) => {
    const { flag, label } = langMap[lang] || { flag: '🌐', label: lang };
    const selected = channels.find((c) => channelKey(c) === selectedChannelKey) || pickBestChannel(lang, channels);
    const selectedValue = selected ? channelKey(selected) : '';
    const orderedChannels = useMemo(() => {
        const base = baseLang(lang);
        return [...channels].sort((a, b) => {
            const aScore = String(a?.lang || '').toLowerCase().startsWith(base) ? 0 : 1;
            const bScore = String(b?.lang || '').toLowerCase().startsWith(base) ? 0 : 1;
            if (aScore !== bScore) return aScore - bScore;
            return channelLabel(a).localeCompare(channelLabel(b), 'it');
        });
    }, [channels, lang]);

    return (
        <div className="group relative flex flex-col rounded-3xl overflow-hidden bg-slate-900/90 border border-slate-700/60 shadow-lg transition-all duration-300 hover:border-red-500/50 hover:shadow-[0_8px_24px_rgba(239,68,68,0.2)] hover:-translate-y-0.5 animate-fadeIn">
            <div className="flex flex-col flex-1 p-4 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Lingua</span>
                    <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-600/80 text-slate-200">In coda</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-bold text-slate-400">#{titleIndex + 1}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold shrink-0">
                        <span>{flag}</span>
                        <span className="truncate max-w-[100px]">{label}</span>
                    </span>
                </div>
                <div className="mb-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Canale associato</div>
                    <div className="w-full px-3 py-2 rounded-2xl bg-slate-800/80 border border-slate-600/50 text-sm font-medium text-white hover:border-red-500/50 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0">video_library</span>
                        <select
                            value={selectedValue}
                            onChange={(e) => onChangeChannel(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm text-white"
                        >
                            {orderedChannels.length === 0 && <option value="">Nessun canale</option>}
                            {orderedChannels.map((c) => {
                                const key = channelKey(c);
                                return (
                                    <option key={key} value={key} className="bg-slate-900 text-white">
                                        {channelLabel(c)}{c?.lang ? ` (${c.lang})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                        <span className="material-symbols-outlined text-slate-500 text-[14px] shrink-0">arrow_drop_down</span>
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Titolo</div>
                    <p className="text-sm font-semibold text-slate-200 line-clamp-2 leading-snug">{title}</p>
                </div>
            </div>
        </div>
    );
};

interface YouTubePreviewCardsProps {
    titles: string[];
    group: string | null;
    voiceoverLangs: string[];
    channelByLang: Record<string, string>;
    onChannelChange: (lang: string, channelKey: string) => void;
}

export const YouTubePreviewCards: React.FC<YouTubePreviewCardsProps> = ({
    titles,
    group,
    voiceoverLangs,
    channelByLang,
    onChannelChange,
}) => {
    const validTitles = titles.filter((t) => t.trim());
    const langs = (voiceoverLangs || []).filter(Boolean);
    const channels: GroupChannel[] = useMemo(() => {
        const raw = (window as any).groupChannels?.[group || ''] || [];
        return Array.isArray(raw) ? raw : [];
    }, [group]);

    if (validTitles.length === 0) {
        return (
            <section className="w-full max-w-7xl mx-auto mt-8">
                <div className="text-xs text-slate-500 text-center py-4 bg-slate-900/20 rounded-2xl border border-white/5">
                    Nessun titolo inserito. Inserisci un titolo per vedere le card YouTube qui.
                </div>
            </section>
        );
    }

    return (
        <section className="w-full max-w-7xl mx-auto mt-8">
            <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-gray-400 text-xl">video_library</span>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Canali Video per voiceover</h3>
                <span className="text-[10px] text-slate-500">Auto-match per lingua, modificabile dal dropdown</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {validTitles.map((title, tIdx) =>
                    langs.map((lang) => (
                        <YouTubeCard
                            key={`${tIdx}-${lang}`}
                            title={title}
                            titleIndex={tIdx}
                            lang={lang}
                            channels={channels}
                            selectedChannelKey={channelByLang[lang] || ''}
                            onChangeChannel={(nextKey) => onChannelChange(lang, nextKey)}
                        />
                    )),
                )}
            </div>
        </section>
    );
};

