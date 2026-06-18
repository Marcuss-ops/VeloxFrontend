import React from 'react';
import { FinanceData } from './FinanceDashboardApp';

interface FinanceRevenueTableProps {
    data: FinanceData;
    currentSort: string;
    currentDays: number;
}

// Progress bar component
const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div className="flex items-center gap-3 justify-end">
        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(value, 100)}%`, background: color }}
            />
        </div>
        <span className="text-text-secondary font-medium w-12 text-right text-xs">{value.toFixed(1)}%</span>
    </div>
);

export const FinanceRevenueTable: React.FC<FinanceRevenueTableProps> = ({ data, currentSort, currentDays }) => {
    return (
        <div className="space-y-6">
            {/* Big Number */}
            <div className="rounded-2xl p-8 flex items-center justify-between relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(10,10,20,0.8) 60%)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.08) 0%, transparent 60%)'
                }} />
                <div>
                    <p className="text-xs font-semibold text-emerald-500 mb-1 uppercase tracking-widest">
                        Estimated Revenue ({data.period})
                    </p>
                    <h2 className="text-5xl font-bold text-white tracking-tight">
                        €{data.totals.revenue.toFixed(2)}
                    </h2>
                </div>
                <div className="size-16 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0"
                    style={{
                        background: 'rgba(16,185,129,0.15)',
                        boxShadow: '0 0 30px rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.25)'
                    }}>
                    <span className="material-symbols-rounded text-3xl">payments</span>
                </div>
            </div>

            {/* Channel Breakdown Table */}
            <div className="rounded-2xl p-6 overflow-hidden"
                style={{
                    background: 'rgba(10,10,20,0.7)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                    <span className="material-symbols-rounded text-emerald-400 text-[18px]">monitoring</span>
                    Revenue by Channel
                    <span className="ml-auto text-xs text-text-muted font-normal normal-case">
                        {data.channels.length} canali
                    </span>
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="pb-3 pr-4 text-[10px] font-bold text-text-muted uppercase tracking-widest w-12">#</th>
                                <th className="pb-3 pr-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Canale</th>
                                <th className="pb-3 pr-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                                    <a
                                        href={`?days=${currentDays}&sort_by=revenue`}
                                        className={`flex items-center justify-end gap-1 hover:text-white transition-colors ${currentSort === 'revenue' ? 'text-emerald-400' : ''}`}
                                    >
                                        Revenue
                                        {currentSort === 'revenue' && <span className="material-symbols-rounded text-[10px]">arrow_downward</span>}
                                    </a>
                                </th>
                                <th className="pb-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">% Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.channels.map((ch, idx) => {
                                const pct = data.totals.revenue > 0 ? (ch.revenue / data.totals.revenue) * 100 : 0;

                                return (
                                    <tr
                                        key={idx}
                                        className="group border-t transition-colors"
                                        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                    >
                                        <td className="py-3.5 pr-4 text-text-muted font-mono text-xs">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </td>
                                        <td className="py-3.5 pr-4">
                                            <div className="flex items-center gap-3">
                                                {ch.thumbnail_url ? (
                                                    <img src={ch.thumbnail_url} alt={ch.name}
                                                        className="size-8 rounded-full border shrink-0 group-hover:ring-2 ring-emerald-500/30 transition-all"
                                                        style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                                                ) : (
                                                    <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 group-hover:ring-2 ring-emerald-500/30 transition-all"
                                                        style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                                                        {ch.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-medium text-text-primary group-hover:text-white transition-colors text-sm">
                                                    {ch.name}
                                                </span>
                                                {ch.auth_error && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                                        🔒
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 pr-6 text-right font-mono font-semibold text-emerald-400 text-sm">
                                            €{ch.revenue.toFixed(2)}
                                        </td>
                                        <td className="py-3.5">
                                            <ProgressBar value={pct} color="linear-gradient(90deg, #10b981, #34d399)" />
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.channels.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-10 text-center text-text-muted text-sm">
                                        Nessun dato disponibile per questo periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
