/**
 * ChannelPerformanceChart — single line chart of the daily_series
 * with a metric selector (Views / Watch time / Subscribers net /
 * Revenue). The metric selector is local React state; the chart
 * swaps dataset + label on every change.
 *
 * Uses raw chart.js to mirror existing app conventions (FinanceChart,
 * installed via package.json). Chart.register(...registerables) is
 * idempotent so duplicate registrations across views are a no-op.
 */

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import type { AnalyticsDailyPoint } from '../types';
import { formatCompact, formatDateLabel, formatRevenue } from '../utils/formatKpi';

Chart.register(...registerables);
// NOTE: registerables covers every chart.js controller/element/scale
// we need today. If a new chart type is introduced in the future
// (Bar, Doughnut, Radar...), keep `registerables` OR import the new
// controller here AND register it above. Skipping this step yields
// silent "chart is blank" bugs at runtime.

type MetricKey = 'views' | 'watch_time_minutes' | 'subscribers_net' | 'estimated_revenue_cents';

interface MetricDef {
  key: MetricKey;
  label: string;
  /** Pull the metric from a DailyPoint, returning null when the field is not available. */
  fromPoint: (p: AnalyticsDailyPoint) => number | null;
  /** Display formatter called on the y-typed value (chart.js may hand us null for empty labels). */
  displayValue: (n: number | null) => string;
  /** Y-axis tick formatter. */
  yTick: (n: number | null) => string;
}

const ZERO_NULL = (v: number | null): number => (v == null || !Number.isFinite(v) ? 0 : v);

const METRICS: MetricDef[] = [
  {
    key: 'views',
    label: 'Visualizzazioni',
    fromPoint: (p) => p.views,
    displayValue: (n) => formatCompact(n ?? null),
    yTick: (n) => formatCompact(n ?? null),
  },
  {
    key: 'watch_time_minutes',
    label: 'Watch time',
    fromPoint: (p) => p.watch_time_minutes,
    displayValue: (n) => `${formatCompact(n ?? null)} min`,
    yTick: (n) => formatCompact(n ?? null),
  },
  {
    key: 'subscribers_net',
    label: 'Iscritti netti',
    fromPoint: (p) => p.subscribers_net,
    displayValue: (n) => formatCompact(n ?? null),
    yTick: (n) => formatCompact(n ?? null),
  },
  {
    key: 'estimated_revenue_cents',
    label: 'Entrate',
    fromPoint: (p) => (p.estimated_revenue_cents ?? null),
    displayValue: (n) => formatRevenue(n ?? null),
    yTick: (n) => formatRevenue(n ?? null),
  },
];

export interface ChannelPerformanceChartProps {
  dailySeries: AnalyticsDailyPoint[];
  ariaLabel?: string;
}

export function ChannelPerformanceChart({
  dailySeries,
  ariaLabel = 'Andamento giornaliero del canale',
}: ChannelPerformanceChartProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>('views');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const selected = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
    const labels = dailySeries.map((p) => formatDateLabel(p.date));
    const series = dailySeries.map((p) => ZERO_NULL(selected.fromPoint(p)));

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: selected.label,
            data: series,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            tension: 0.2,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y ?? 0;
                return `${selected.label}: ${selected.displayValue(v)}`;
              },
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => selected.yTick(Number(v) as number | null),
            },
          },
        },
      },
    };

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [dailySeries, metricKey]);

  return (
    <section aria-label={ariaLabel} className="border rounded-lg p-4 space-y-3 bg-card">
      <div
        role="group"
        aria-label="Selettore metrica"
        className="inline-flex border rounded-md overflow-hidden"
      >
        {METRICS.map((m) => {
          const active = metricKey === m.key;
          return (
            <button
              key={m.key}
              type="button"
              data-metric={m.key}
              aria-pressed={active}
              onClick={() => setMetricKey(m.key)}
              className={`px-3 py-1 text-xs border-r last:border-r-0 ${
                active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="h-48 relative">
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
      </div>
    </section>
  );
}

export default ChannelPerformanceChart;
