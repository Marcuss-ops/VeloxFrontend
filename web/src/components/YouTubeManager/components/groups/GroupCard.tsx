import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel, ChannelGroup } from '../../types';
import { ChannelItem } from '../channels/ChannelItem';
import { groupColors, capitalizeName } from '../../constants';
import { youtubeApi } from '@/lib/api';

interface ChannelAnalytics {
    views: number;
    revenue: number;
    loading: boolean;
    channelCount: number;
}

export interface GroupCardProps {
    group: ChannelGroup;
    onReconnect: (channel: Channel) => void;
    onSaveLanguage: (channelId: string, language: string, groupName: string) => void;
    onDelete: (channel: Channel, groupName: string) => void;
    onDragStart: (channel: Channel, groupName: string) => void;
    onDragEnd: () => void;
    draggingChannel: Channel | null;
    onDrop: (targetGroupName: string) => void;
    selectedChannels: Set<string>;
    onToggleSelect: (channelId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
    group, onReconnect, onSaveLanguage, onDelete, onDragStart, onDragEnd, draggingChannel, onDrop, selectedChannels, onToggleSelect
}) => {
    const capitalizedName = capitalizeName(group.name);
    const color = groupColors[capitalizedName] || groupColors['Default'];
    const expiredCount = group.channels.filter(c => c.tokenStatus === 'expired' || c.tokenStatus === 'error').length;
    const healthyCount = group.channels.length - expiredCount;
    const [isDragOver, setIsDragOver] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [analytics, setAnalytics] = useState<ChannelAnalytics>({ views: 0, revenue: 0, loading: false, channelCount: 0 });

    // Fetch analytics for all channels in this group
    useEffect(() => {
        if (!isStatsOpen || group.channels.length === 0) return;

        let cancelled = false;
        setAnalytics(prev => ({ ...prev, loading: true }));

        const channelIds = group.channels.map(c => c.id).filter(Boolean);

        Promise.all(
            channelIds.map(id =>
                youtubeApi.getChannelAnalytics(id, 7).catch(() => null)
            )
        ).then(results => {
            if (cancelled) return;
            let totalViews = 0;
            let totalRevenue = 0;
            let count = 0;
            for (const r of results) {
                if (r?.channel_data?.views) totalViews += r.channel_data.views;
                if (r?.channel_data?.revenue) totalRevenue += r.channel_data.revenue;
                count++;
            }
            setAnalytics({ views: totalViews, revenue: totalRevenue, loading: false, channelCount: count });
        }).catch(() => {
            if (!cancelled) setAnalytics(prev => ({ ...prev, loading: false }));
        });

        return () => { cancelled = true; };
    }, [isStatsOpen, group.channels]);

    const formatNumber = useCallback((n: number): string => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return Math.round(n).toString();
    }, []);

    const formatRevenue = useCallback((n: number): string => {
        if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
        if (n > 0) return '$' + n.toFixed(2);
        return '—';
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(group.name);
    };

    const groupColorMap: Record<string, string> = {
        'bg-red-500': 'from-red-500/20 to-red-600/5',
        'bg-blue-500': 'from-blue-500/20 to-blue-600/5',
        'bg-green-500': 'from-green-500/20 to-green-600/5',
        'bg-amber-500': 'from-amber-500/20 to-amber-600/5',
        'bg-purple-500': 'from-purple-500/20 to-purple-600/5',
        'bg-pink-500': 'from-pink-500/20 to-pink-600/5',
        'bg-cyan-500': 'from-cyan-500/20 to-cyan-600/5',
        'bg-emerald-500': 'from-emerald-500/20 to-emerald-600/5',
        'bg-indigo-500': 'from-indigo-500/20 to-indigo-600/5',
        'bg-orange-500': 'from-orange-500/20 to-orange-600/5',
    };
    const gradientBg = groupColorMap[color] || 'from-gray-500/20 to-gray-600/5';

    return (
        <div
            className={`relative rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden ${
                isDragOver
                    ? 'border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.1]'
            }`}
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Top gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${gradientBg}`} />

            {/* Header */}
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-lg ${color.replace('bg-', 'shadow-')}/30`} />
                    <h2 className="text-sm font-semibold text-gray-100 truncate">{capitalizedName}</h2>
                    <div className="flex items-center gap-1.5 ml-1">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-medium text-gray-400 border border-white/[0.04]">
                            {group.channels.length}
                        </span>
                        {expiredCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-[10px] font-medium text-red-400 border border-red-500/15">
                                {expiredCount} scaduti
                            </span>
                        )}
                        {healthyCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-medium text-emerald-400 border border-emerald-500/15">
                                {healthyCount} ok
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-white/[0.06] rounded-lg transition-colors text-gray-500 hover:text-gray-300"
                >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Channel list */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="p-1.5">
                            {group.channels.length === 0 ? (
                                <div className="py-6 text-center">
                                    <p className="text-xs text-gray-600">Nessun canale in questo gruppo</p>
                                </div>
                            ) : (
                                <>
                                    <ul className="space-y-0.5">
                                        {group.channels.map((channel: Channel, idx: number) => (
                                            <motion.li
                                                key={channel.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.2, delay: idx * 0.02 }}
                                            >
                                                <ChannelItem
                                                    channel={channel}
                                                    groupName={group.name}
                                                    onReconnect={onReconnect}
                                                    onSaveLanguage={onSaveLanguage}
                                                    onDelete={onDelete}
                                                    onDragStart={onDragStart}
                                                    onDragEnd={onDragEnd}
                                                    isDragging={draggingChannel?.id === channel.id}
                                                    isSelected={selectedChannels.has(channel.id)}
                                                    onToggleSelect={onToggleSelect}
                                                />
                                            </motion.li>
                                        ))}
                                    </ul>

                                    {/* Mini Analytics Dashboard */}
                                    <div className="mx-1 mt-2 mb-1">
                                        <button
                                            onClick={() => setIsStatsOpen(!isStatsOpen)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-400 transition-colors">
                                                    Statistiche (7 giorni)
                                                </span>
                                            </div>
                                            <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isStatsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        <AnimatePresence>
                                            {isStatsOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-2 pb-1 px-1">
                                                        {analytics.loading ? (
                                                            <div className="flex items-center gap-2 py-3 px-3">
                                                                <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                                                                <span className="text-[11px] text-gray-500">Caricamento statistiche...</span>
                                                            </div>
                                                        ) : analytics.channelCount > 0 ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="px-3 py-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                                    <p className="text-[10px] text-blue-400/70 font-medium uppercase tracking-wider mb-1">Views (7g)</p>
                                                                    <p className="text-sm font-semibold text-gray-100">{formatNumber(analytics.views)}</p>
                                                                </div>
                                                                <div className="px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                                    <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wider mb-1">Revenue (7g)</p>
                                                                    <p className="text-sm font-semibold text-gray-100">{formatRevenue(analytics.revenue)}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="py-3 px-3">
                                                                <p className="text-[11px] text-gray-600">Nessun dato analytics disponibile. Esegui 'Sync Analytics' nel backend.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};