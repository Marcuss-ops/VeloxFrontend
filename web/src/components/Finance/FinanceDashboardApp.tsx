import React, { useState, useEffect } from 'react';
import { FinanceChart } from './FinanceChart';
import { FinanceRevenueTable } from './FinanceRevenueTable';
import { FinanceViewsTable } from './FinanceViewsTable';
import { FinanceKpiCards } from './FinanceKpiCards';

import type { ChannelStats, FinanceData } from './types';

interface FinanceDashboardAppProps {
    initialTab?: 'revenue' | 'views';
    onTabChange?: (tab: 'revenue' | 'views') => void;
}

// Skeleton loading placeholder
const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`rounded-lg bg-white/5 animate-pulse ${className}`}
        style={{ animationDuration: '1.5s' }}
    />
);

const FinanceSkeleton: React.FC = () => (
    <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl p-5 border border-white/5 h-24 flex gap-4 items-center">
                    <SkeletonBlock className="size-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <SkeletonBlock className="h-3 w-3/4" />
                        <SkeletonBlock className="h-6 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
        {/* Chart */}
        <div className="rounded-2xl border border-white/5 p-6 h-72">
            <SkeletonBlock className="h-4 w-40 mb-4" />
            <SkeletonBlock className="h-48 w-full rounded-xl" />
        </div>
        {/* Table */}
        <div className="rounded-2xl border border-white/5 p-6 space-y-3">
            <SkeletonBlock className="h-5 w-48 mb-4" />
            {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 py-2">
                    <SkeletonBlock className="size-8 rounded-full shrink-0" />
                    <SkeletonBlock className="h-4 flex-1" />
                    <SkeletonBlock className="h-4 w-16" />
                    <SkeletonBlock className="h-4 w-12" />
                </div>
            ))}
        </div>
    </div>
);

interface RawChannelData {
    name?: string;
    channel?: string;
    thumbnail_url?: string;
    thumbnail?: string;
    revenue?: number | string;
    views?: number | string;
    subscribers?: number | string;
    minutes_watched?: number | string;
    auth_error?: boolean;
}

interface RawDailyStat {
    date?: string;
    revenue?: number | string;
    views?: number | string;
}

interface RawFinanceData {
    period?: string;
    totals?: {
        revenue?: number | string;
        views?: number | string;
    };
    summary?: {
        total_revenue?: number | string;
        total_views?: number | string;
        period?: string;
        channels?: number | string;
    };
    top_channels?: RawChannelData[];
    chart_data?: RawDailyStat[];
    mom?: {
        current_month_revenue?: number;
        prev_month_revenue?: number;
        revenue_growth?: number;
        current_month_views?: number;
        prev_month_views?: number;
        views_growth?: number;
    };
    channels?: RawChannelData[];
    daily_stats?: RawDailyStat[];
    daily?: RawDailyStat[];
}

const toNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const normalizeFinanceData = (raw: RawFinanceData | null | undefined, days: number): FinanceData => {
    const channelsRaw = Array.isArray(raw?.channels)
        ? raw.channels
        : Array.isArray(raw?.top_channels)
            ? raw.top_channels
            : [];
    const dailyRaw = Array.isArray(raw?.daily_stats)
        ? raw.daily_stats
        : Array.isArray(raw?.chart_data)
            ? raw.chart_data
        : Array.isArray(raw?.daily)
            ? raw.daily
            : [];

    const channels: ChannelStats[] = channelsRaw.map((c: RawChannelData) => ({
        name: String(c?.name || c?.channel || 'Unknown'),
        thumbnail_url: c?.thumbnail_url || c?.thumbnail || undefined,
        revenue: toNumber(c?.revenue),
        views: toNumber(c?.views),
        subscribers: toNumber(c?.subscribers),
        minutes_watched: toNumber(c?.minutes_watched),
        auth_error: Boolean(c?.auth_error),
    }));

    const totalsFromChannels = channels.reduce(
        (acc, ch) => ({
            revenue: acc.revenue + ch.revenue,
            views: acc.views + ch.views,
        }),
        { revenue: 0, views: 0 }
    );

    return {
        period: String(raw?.period || raw?.summary?.period || `last_${days}d`),
        totals: {
            revenue: toNumber(raw?.totals?.revenue) || toNumber(raw?.summary?.total_revenue) || totalsFromChannels.revenue,
            views: toNumber(raw?.totals?.views) || toNumber(raw?.summary?.total_views) || totalsFromChannels.views,
        },
        mom: raw?.mom ? {
            current_month_revenue: toNumber(raw.mom.current_month_revenue),
            prev_month_revenue: toNumber(raw.mom.prev_month_revenue),
            revenue_growth: toNumber(raw.mom.revenue_growth),
            current_month_views: toNumber(raw.mom.current_month_views),
            prev_month_views: toNumber(raw.mom.prev_month_views),
            views_growth: toNumber(raw.mom.views_growth),
        } : undefined,
        channels,
        daily_stats: dailyRaw.map((d: RawDailyStat) => ({
            date: String(d?.date || ''),
            revenue: toNumber(d?.revenue),
            views: toNumber(d?.views),
        })),
    };
};

export const FinanceDashboardApp: React.FC<FinanceDashboardAppProps> = ({ initialTab = 'revenue', onTabChange }) => {
    const [data, setData] = useState<FinanceData | null>(null);
    const [currentDays, setCurrentDays] = useState<number>(30);
    const [currentSort, setCurrentSort] = useState<string>('revenue');
    const [activeTab, setActiveTab] = useState<'revenue' | 'views'>(initialTab);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            let loadedFromTag = false;
            try {
                const dataEl = document.getElementById('finance-backend-data');
                if (dataEl && dataEl.textContent) {
                    const parsed = JSON.parse(dataEl.textContent);
                    if (parsed?.data && typeof parsed.data === 'object') {
                        const parsedDays = Number(parsed.current_days) || 30;
                        setData(normalizeFinanceData(parsed.data, parsedDays));
                        setCurrentDays(parsedDays);
                        setCurrentSort(String(parsed.current_sort || 'revenue'));
                        loadedFromTag = true;
                    }
                }
            } catch (e) {
                console.error('Failed to parse finance backend data', e);
            }

            if (loadedFromTag) return;

            try {
                const res = await fetch('/api/v1/dashboard/finance?period=30');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const payload = await res.json();
                const rawData = payload || {};
                setData(normalizeFinanceData(rawData, currentDays));
                setError(null);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Finance load failed';
                setError(msg);
                // Keep UI usable with empty data instead of infinite skeleton.
                setData(
                    normalizeFinanceData(
                        { period: `last_${currentDays}d`, totals: { revenue: 0, views: 0 }, channels: [], daily_stats: [] },
                        currentDays
                    )
                );
            }
        };

        void load();

        // Trigger entrance animation after a brief delay
        setTimeout(() => setMounted(true), 50);
    }, [currentDays]);

    useEffect(() => {
        onTabChange?.(activeTab);
    }, [activeTab, onTabChange]);

    if (!data) {
        return (
            <div
                className="p-6 transition-opacity duration-700"
                style={{ opacity: mounted ? 1 : 0 }}
            >
                <FinanceSkeleton />
            </div>
        );
    }

    return (
        <div
            className="space-y-0 transition-opacity duration-700"
            style={{ opacity: mounted ? 1 : 0 }}
        >
            {error && (
                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                    Finance in fallback mode: {error}
                </div>
            )}
            {/* Finance Tabs */}
            <div className="flex border-b border-white/10 mb-6 sticky top-0 z-10 backdrop-blur-sm bg-black/30 px-1 pt-1">
                {(['revenue', 'views'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-6 py-3 text-sm font-medium transition-all duration-300 focus:outline-none ${activeTab === tab
                                ? tab === 'revenue'
                                    ? 'text-emerald-400'
                                    : 'text-blue-400'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {tab === 'revenue' ? 'Revenue' : 'Views'}
                        {/* Active underline */}
                        <span
                            className={`absolute bottom-0 left-0 w-full h-0.5 rounded-full transition-all duration-300 ${activeTab === tab
                                    ? tab === 'revenue' ? 'bg-emerald-400 scale-x-100' : 'bg-blue-400 scale-x-100'
                                    : 'scale-x-0'
                                }`}
                        />
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <FinanceKpiCards data={data} />

            {/* Chart */}
            <FinanceChart data={data.daily_stats} activeTab={activeTab} />

            {/* Tab content with fade transition */}
            <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'revenue' ? (
                    <FinanceRevenueTable data={data} currentSort={currentSort} currentDays={currentDays} />
                ) : (
                    <FinanceViewsTable data={data} currentSort={currentSort} currentDays={currentDays} />
                )}
            </div>
        </div>
    );
};
