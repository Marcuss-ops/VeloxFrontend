import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { DailyStat } from './types';

// Register all Chart.js components
Chart.register(...registerables);

interface FinanceChartProps {
    data: DailyStat[];
    activeTab: 'revenue' | 'views';
}

export const FinanceChart: React.FC<FinanceChartProps> = ({ data, activeTab }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        const init = () => {
            if (!canvasRef.current) {
                return;
            }
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) {
                return;
            }

            if (!data || data.length === 0) {
                if (chartInstance.current) chartInstance.current.destroy();
                chartInstance.current = null;
                return;
            }

            const labels = data.map(d => d.date);
            const revenueData = data.map(d => d.revenue);
            const viewsData = data.map(d => d.views);

            const gradRevenue = ctx.createLinearGradient(0, 0, 0, 350);
            gradRevenue.addColorStop(0, 'rgba(16,185,129,0.25)');
            gradRevenue.addColorStop(1, 'rgba(16,185,129,0)');

            const gradViews = ctx.createLinearGradient(0, 0, 0, 350);
            gradViews.addColorStop(0, 'rgba(59,130,246,0.25)');
            gradViews.addColorStop(1, 'rgba(59,130,246,0)');

            if (chartInstance.current) chartInstance.current.destroy();

            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Revenue (€)',
                            data: revenueData,
                            borderColor: '#10b981',
                            backgroundColor: gradRevenue,
                            borderWidth: 2,
                            tension: 0.45,
                            fill: true,
                            pointRadius: 3,
                            pointBackgroundColor: '#10b981',
                            pointBorderColor: 'rgba(16,185,129,0.3)',
                            pointHoverRadius: 6,
                            yAxisID: 'y',
                            hidden: activeTab !== 'revenue',
                        },
                        {
                            label: 'Views',
                            data: viewsData,
                            borderColor: '#3b82f6',
                            backgroundColor: gradViews,
                            borderWidth: 2,
                            tension: 0.45,
                            fill: true,
                            pointRadius: 3,
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: 'rgba(59,130,246,0.3)',
                            pointHoverRadius: 6,
                            yAxisID: 'y1',
                            hidden: activeTab !== 'views',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeInOutQuart' },
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(5,8,22,0.95)',
                            titleColor: '#e2e8f0',
                            bodyColor: '#94a3b8',
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 10,
                            titleFont: { size: 12, weight: 'bold' as const },
                            bodyFont: { size: 12 },
                        },
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { color: '#475569', font: { size: 10 }, maxTicksLimit: 8 },
                        },
                        y: {
                            type: 'linear',
                            display: activeTab === 'revenue',
                            position: 'left',
                            grid: { color: 'rgba(255,255,255,0.04)' },
                            border: { display: false },
                            ticks: {
                                color: '#475569',
                                font: { size: 10 },
                                callback: (v: number | string) => `€${v}`,
                            },
                        },
                        y1: {
                            type: 'linear',
                            display: activeTab === 'views',
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            border: { display: false },
                            ticks: { color: '#475569', font: { size: 10 } },
                        },
                    },
                },
            });
        };

        // Use rAF for smoother init
        const raf = requestAnimationFrame(init);
        return () => {
            cancelAnimationFrame(raf);
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [data, activeTab]);

    if (!data || data.length === 0) {
        return (
            <div
                className="rounded-2xl p-6 mb-6"
                style={{
                    background: 'rgba(10,10,20,0.7)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Performance Trend</h3>
                    <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${activeTab === 'revenue' ? 'text-emerald-400' : 'text-text-muted'}`}>
                            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
                            Revenue
                        </span>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${activeTab === 'views' ? 'text-blue-400' : 'text-text-muted'}`}>
                            <span className="size-2 rounded-full bg-blue-400 inline-block" />
                            Views
                        </span>
                    </div>
                </div>
                <div className="h-64 w-full flex items-center justify-center rounded-xl border border-dashed border-white/10 text-text-muted text-sm">
                    Nessun dato reale disponibile per il periodo selezionato.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl p-6 mb-6"
            style={{
                background: 'rgba(10,10,20,0.7)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Performance Trend</h3>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${activeTab === 'revenue' ? 'text-emerald-400' : 'text-text-muted'}`}>
                        <span className="size-2 rounded-full bg-emerald-400 inline-block" />
                        Revenue
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${activeTab === 'views' ? 'text-blue-400' : 'text-text-muted'}`}>
                        <span className="size-2 rounded-full bg-blue-400 inline-block" />
                        Views
                    </span>
                </div>
            </div>
            <div className="h-64 w-full relative">
                <canvas 
                    ref={canvasRef} 
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
};
