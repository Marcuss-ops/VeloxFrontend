import React, { useState, useEffect } from 'react';
import { 
    AlertCircle, 
    Eye, 
    DollarSign, 
    Video, 
    TrendingUp,
    BarChart3,
    UserCircle
} from 'lucide-react';
import { AnalyticsTimelinePoint, AnalyticsSummary, TopVideo, TopChannel } from './types';

interface AnalyticsData {
    summary: AnalyticsSummary | null;
    timeline: AnalyticsTimelinePoint[];
    topVideos: TopVideo[];
    topChannels: TopChannel[];
    loading: boolean;
    error: string | null;
}

async function fetchJSON<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export const DashboardAnalyticsTab: React.FC = () => {
    const [period, setPeriod] = useState<'7' | '30'>('30');
    const [data, setData] = useState<AnalyticsData>({
        summary: null,
        timeline: [],
        topVideos: [],
        topChannels: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchData = async () => {
            setData(prev => ({ ...prev, loading: true, error: null }));
            try {
                const [summaryRes, timelineRes, channelsRes] = await Promise.all([
                    fetchJSON<AnalyticsSummary>('/api/v1/analytics/summary').catch(() => null),
                    fetchJSON<{ timeline: AnalyticsTimelinePoint[] }>(`/api/v1/analytics/timeline?days=${period}`).catch(() => ({ timeline: [] })),
                    fetchJSON<{ channels: TopChannel[] }>('/api/v1/analytics/top-channels?limit=5').catch(() => ({ channels: [] })),
                ]);

                const maxDays = Math.min(Number(period), 30);
                const safeTimeline = (timelineRes.timeline || []).slice(-maxDays);

                setData({
                    summary: summaryRes,
                    timeline: safeTimeline,
                    topVideos: [],  // Feature not implemented
                    topChannels: (channelsRes.channels || []).slice(0, 5),
                    loading: false,
                    error: null,
                });
            } catch (e) {
                setData(prev => ({
                    ...prev,
                    loading: false,
                    error: e instanceof Error ? e.message : 'Errore caricamento dati',
                }));
            }
        };
        fetchData();
    }, [period]);

    const formatNumber = (n: number): string => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toString();
    };

    const formatCurrency = (n: number): string => {
        return `€${n.toFixed(2)}`;
    };

    const viewsInRange = data.timeline.reduce((sum, point) => sum + point.views, 0);
    const revenueInRange = data.timeline.reduce((sum, point) => sum + point.revenue, 0);
    const daysVisible = data.timeline.length;
    const channelsVisible = data.topChannels.length;

    // Calculate max values for chart scaling
    const maxViews = Math.max(...data.timeline.map(t => t.views), 1);
    const maxRevenue = Math.max(...data.timeline.map(t => t.revenue), 0.01);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header with Period Selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-white text-2xl font-bold tracking-tight">Analytics</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                        Dati limitati agli ultimi 30 giorni per conformità policy.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {(['7', '30'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                period === p
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            {p === '7' ? '7 giorni' : '30 giorni'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-50">
                Fonte policy:
                {' '}
                <a className="underline underline-offset-2 hover:text-white" href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noreferrer">III.E.4</a>
                {' '}
                e
                {' '}
                <a className="underline underline-offset-2 hover:text-white" href="https://developers.google.com/youtube/terms/developer-policies-guide" target="_blank" rel="noreferrer">policy guide</a>.
                {' '}
                L'interfaccia nasconde periodi superiori a 30 giorni e mostra solo aggregazioni calcolate sul periodo visibile.
            </div>

            {data.loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-slate-900/80 p-5">
                            <div className="h-3 bg-white/5 rounded w-1/3 mb-3"></div>
                            <div className="h-8 bg-white/5 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : data.error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
                    <AlertCircle className="size-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400">{data.error}</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Eye className="size-5 text-blue-400" />
                                </div>
                                <span className="text-slate-400 text-sm">Visualizzazioni Totali</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {formatNumber(viewsInRange)}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">Ultimi {period} giorni</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <DollarSign className="size-5 text-green-400" />
                                </div>
                                <span className="text-slate-400 text-sm">Revenue Totale</span>
                            </div>
                            <div className="text-3xl font-bold text-green-400">
                                {formatCurrency(revenueInRange)}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">Ultimi {period} giorni</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Video className="size-5 text-purple-400" />
                                </div>
                                <span className="text-slate-400 text-sm">Copertura Dashboard</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {daysVisible}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">{channelsVisible} canali mostrati</div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Views Chart */}
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="size-5 text-blue-400" />
                                Views nel Tempo
                            </h3>
                            <div className="h-48 flex items-end gap-1">
                                {data.timeline.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                                        Nessun dato disponibile
                                    </div>
                                ) : (
                                    data.timeline.slice(-14).map((point, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 flex flex-col items-center gap-1"
                                        >
                                            <div
                                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-300"
                                                style={{
                                                    height: `${(point.views / maxViews) * 150}px`,
                                                    minHeight: point.views > 0 ? '4px' : '0px',
                                                }}
                                                title={`${point.date}: ${formatNumber(point.views)} views`}
                                            />
                                            {i % 2 === 0 && (
                                                <span className="text-[9px] text-slate-400 truncate w-full text-center">
                                                    {point.date.slice(5)}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Revenue Chart */}
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="size-5 text-green-400" />
                                Revenue nel Tempo
                            </h3>
                            <div className="h-48 flex items-end gap-1">
                                {data.timeline.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                                        Nessun dato disponibile
                                    </div>
                                ) : (
                                    data.timeline.slice(-14).map((point, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 flex flex-col items-center gap-1"
                                        >
                                            <div
                                                className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all duration-300 hover:from-green-500 hover:to-green-300"
                                                style={{
                                                    height: `${(point.revenue / maxRevenue) * 150}px`,
                                                    minHeight: point.revenue > 0 ? '4px' : '0px',
                                                }}
                                                title={`${point.date}: ${formatCurrency(point.revenue)}`}
                                            />
                                            {i % 2 === 0 && (
                                                <span className="text-[9px] text-slate-400 truncate w-full text-center">
                                                    {point.date.slice(5)}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-5">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <UserCircle className="size-5 text-purple-400" />
                            Canali inclusi nella dashboard
                        </h3>
                        <div className="space-y-3">
                            {data.topChannels.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">Nessun dato</p>
                            ) : (
                                data.topChannels.map((channel, i) => (
                                    <div key={channel.channel_id || i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                        <div className="size-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm">
                                            #{i + 1}
                                        </div>
                                        {channel.thumbnail_url ? (
                                            <img
                                                src={channel.thumbnail_url}
                                                alt={channel.channel_title}
                                                className="size-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center">
                                                <UserCircle className="size-6 text-slate-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">
                                                {channel.channel_title}
                                            </p>
                                            <p className="text-slate-400 text-xs">
                                                Incluso nel pannello conforme agli ultimi 30 giorni
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
