import React from 'react';

interface PanoramaStatsProps {
    views48h: number;
    revenue48h: number;
    completedCount: number;
    toPostCount: number;
}

const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
};

const formatCurrency = (n: number): string => {
    return '€' + formatNumber(n);
};

interface StatCardProps {
    icon: string;
    label: string;
    value: string;
    subValue?: string;
    gradient: string;
    iconBg: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, gradient, iconBg }) => (
    <div className={`rounded-2xl border border-white/5 p-5 bg-surface/50 hover:border-white/10 transition-all duration-300 group`}>
        <div className="flex items-center gap-4">
            <div className={`size-12 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-105 transition-transform duration-300`}>
                <span className="material-symbols-rounded text-white text-xl">{icon}</span>
            </div>
            <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                    {value}
                </p>
                {subValue && <p className="text-xs text-text-muted mt-0.5">{subValue}</p>}
            </div>
        </div>
    </div>
);

export const PanoramaStats: React.FC<PanoramaStatsProps> = ({
    views48h,
    revenue48h,
    completedCount,
    toPostCount,
}) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon="visibility"
                label="Views 48h"
                value={formatNumber(views48h)}
                gradient="from-blue-400 to-cyan-400"
                iconBg="bg-gradient-to-br from-blue-500/30 to-cyan-500/30"
            />
            <StatCard
                icon="payments"
                label="Revenue 48h"
                value={formatCurrency(revenue48h)}
                gradient="from-emerald-400 to-green-400"
                iconBg="bg-gradient-to-br from-emerald-500/30 to-green-500/30"
            />
            <StatCard
                icon="check_circle"
                label="Completati 24h"
                value={formatNumber(completedCount)}
                subValue="video processati"
                gradient="from-violet-400 to-purple-400"
                iconBg="bg-gradient-to-br from-violet-500/30 to-purple-500/30"
            />
            <StatCard
                icon="schedule"
                label="Da Postare"
                value={formatNumber(toPostCount)}
                subValue="in attesa"
                gradient="from-amber-400 to-orange-400"
                iconBg="bg-gradient-to-br from-amber-500/30 to-orange-500/30"
            />
        </div>
    );
};