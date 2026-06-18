import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle, RefreshCw, Search, Video } from 'lucide-react';
import { useYouTubeOrchestratorData } from './hooks/useYouTubeOrchestratorData';
import type { GroupSummary } from './hooks/useYouTubeOrchestratorData';

type RefreshFeedback = { type: 'success' | 'error'; message: string };

const matchesQuery = (group: GroupSummary, query: string) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
        group.groupName.toLowerCase().includes(q) ||
        (group.logoChannelTitle || '').toLowerCase().includes(q) ||
        group.channels.some(channel =>
            channel.title.toLowerCase().includes(q) ||
            channel.id.toLowerCase().includes(q)
        )
    );
};

const getGroupAvatarLabel = (group: GroupSummary) => {
    const source = group.logoChannelTitle || group.channels[0]?.title || group.groupName;
    return source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'YT';
};

export const YouTubeOrchestrator: React.FC = () => {
    const { groups, isLoading: dataLoading, error: dataError, refetch } = useYouTubeOrchestratorData();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [refreshFeedback, setRefreshFeedback] = useState<RefreshFeedback | null>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleRefreshMetadata = useCallback(async () => {
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

        setRefreshing(true);
        setRefreshFeedback(null);
        try {
            await refetch();
            setRefreshFeedback({
                type: 'success',
                message: 'Gruppi e video privati aggiornati',
            });
        } catch (err) {
            setRefreshFeedback({
                type: 'error',
                message: 'Errore aggiornamento dati: ' + (err instanceof Error ? err.message : 'connessione fallita'),
            });
        } finally {
            setRefreshing(false);
            feedbackTimeoutRef.current = setTimeout(() => setRefreshFeedback(null), 5000);
        }
    }, [refetch]);

    const visibleGroups = useMemo(() => {
        return groups
            .filter(group => matchesQuery(group, searchQuery))
            .sort((a, b) => {
                if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
                return a.groupName.localeCompare(b.groupName);
            });
    }, [groups, searchQuery]);

    const totalPendingCount = useMemo(
        () => visibleGroups.reduce((sum, group) => sum + group.pendingCount, 0),
        [visibleGroups]
    );

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black tracking-tight text-white">
                        Publishing Orchestrator
                    </h1>
                    <p className="text-slate-400 font-medium text-sm">
                        {visibleGroups.length} gruppi · {totalPendingCount} video da pubblicare
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Cerca gruppi o video..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition-all text-white placeholder-slate-500"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefreshMetadata}
                            disabled={refreshing}
                            className="bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/5 active:scale-95 text-sm"
                            title="Aggiorna metadati canali"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Aggiornamento...' : 'Refresh Metadata'}
                        </button>
                    </div>
                </div>

                {refreshFeedback && (
                    <div
                        className={`inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-lg text-xs font-bold
                            ${refreshFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
                            ${refreshFeedback.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
                        `}
                    >
                        {refreshFeedback.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {refreshFeedback.message}
                    </div>
                )}
            </div>

            {dataLoading && (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="text-center">
                        <div className="relative mx-auto w-14 h-14 mb-4">
                            <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping" />
                            <div className="absolute inset-2 border-2 border-red-500/10 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">Caricamento gruppi...</p>
                    </div>
                </div>
            )}

            {dataError && !dataLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                        <AlertCircle size={28} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Errore di caricamento</h3>
                    <p className="text-slate-400 mt-2 max-w-md text-sm">{dataError}</p>
                    <button
                        onClick={refetch}
                        className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold text-slate-300 hover:text-white transition-all"
                    >
                        <RefreshCw size={14} className="inline mr-2" />
                        Riprova
                    </button>
                </div>
            )}

            {!dataLoading && !dataError && (
                <>
                    {visibleGroups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {visibleGroups.map((group, idx) => (
                                <motion.button
                                    key={group.groupName}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="w-full text-left bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-all hover:shadow-2xl hover:shadow-black/40"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-600">
                                            {group.logoThumbnail ? (
                                                <img
                                                    src={group.logoThumbnail}
                                                    alt={group.logoChannelTitle || group.groupName}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="text-[10px] font-black tracking-widest text-slate-300">
                                                    {getGroupAvatarLabel(group)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-bold text-white truncate">{group.groupName}</h3>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white tabular-nums">
                                                {group.pendingCount}
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center mb-6 text-slate-700">
                                <Video size={40} />
                            </div>
                            <h3 className="text-lg font-bold text-white">Nessun video da pubblicare</h3>
                            <p className="text-slate-500 mt-2 max-w-sm text-sm">
                                {searchQuery ? 'Prova a modificare la ricerca' : 'Non ci sono gruppi disponibili.'}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default YouTubeOrchestrator;
