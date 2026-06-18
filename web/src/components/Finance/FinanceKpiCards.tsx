import React from 'react';
import { FinanceData } from './FinanceDashboardApp';
import { useCountUp } from './useCountUp';

interface KpiCardProps {
    label: string;
    value: number;
    format: (v: number) => string;
    icon: string;
    color: string;
    bg: string;
    glow: string;
    delay: number;
    growth?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, format, icon, color, bg, glow, delay, growth }) => {
    const animated = useCountUp(value, 900, value < 100 ? 2 : 0);

    return (
        <div
            className="relative rounded-2xl p-5 border overflow-hidden flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            style={{
                background: 'rgba(10,10,20,0.7)',
                borderColor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                animationDelay: `${delay}ms`,
            }}
        >
            {/* Glow blob */}
            <div
                className="absolute -top-4 -right-4 size-28 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: glow }}
            />

            <div
                className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}
                style={{ boxShadow: `0 0 15px ${glow}40` }}
            >
                <span className={`material-symbols-rounded text-2xl ${color}`}>{icon}</span>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs text-text-muted font-medium uppercase tracking-widest truncate">{label}</p>
                    {growth !== undefined && growth !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${growth > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            <span className="material-symbols-rounded text-[12px]">{growth > 0 ? 'trending_up' : 'trending_down'}</span>
                            {Math.abs(growth).toFixed(1)}%
                        </span>
                    )}
                </div>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{format(animated)}</p>
            </div>
        </div>
    );
};

interface FinanceKpiCardsProps {
    data: FinanceData;
}

export const FinanceKpiCards: React.FC<FinanceKpiCardsProps> = ({ data }) => {
    const totalRevenue = data.totals.revenue;
    const totalViews = data.totals.views;
    const channels = data.channels.length;
    const avgRpm = totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
                label="Revenue Totale"
                value={totalRevenue}
                format={v => `€${v.toFixed(2)}`}
                icon="payments"
                color="text-emerald-400"
                bg="bg-emerald-500/15"
                glow="#10b981"
                delay={0}
                growth={data.mom?.revenue_growth}
            />
            <KpiCard
                label="Views Totali"
                value={totalViews}
                format={v => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toLocaleString()}
                icon="bar_chart"
                color="text-blue-400"
                bg="bg-blue-500/15"
                glow="#3b82f6"
                delay={80}
                growth={data.mom?.views_growth}
            />
            <KpiCard
                label="Canali"
                value={channels}
                format={v => v.toString()}
                icon="subscriptions"
                color="text-violet-400"
                bg="bg-violet-500/15"
                glow="#8b5cf6"
                delay={160}
            />
            <KpiCard
                label="RPM Medio"
                value={avgRpm}
                format={v => `€${v.toFixed(2)}`}
                icon="trending_up"
                color="text-amber-400"
                bg="bg-amber-500/15"
                glow="#f59e0b"
                delay={240}
            />
        </div>
    );
};
