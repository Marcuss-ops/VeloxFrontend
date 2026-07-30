/**
 * ChannelKpiGrid — the 2-row KPI grid. Row 1: Views, Watch time,
 * SubscribersNet, EstimatedRevenue. Row 2: VideosPublished,
 * AverageViewsPerVideo, SubscribersGained, SubscribersLost.
 *
 * Each row-1 card and the AvgViews/Published cards carry a
 * MetricComparison from the backend; the Gained/Lost cards do NOT
 * (the contract.per-page only compares SubscribersNet, gained/lost
 * are absolute counts) so they render without a comparison arrow.
 *
 * Pure presentation: every value is formatted via formatKpi utils;
 * no fetch, no calculations.
 */

import type {
  AnalyticsComparison,
  AnalyticsMetricComparison,
  AnalyticsSummary,
} from '../types';
import {
  formatCompact,
  formatInt,
  formatRevenue,
  formatWatchTime,
  trendFor,
} from '../utils/formatKpi';

const TREND_COLOR: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  flat: 'text-muted-foreground',
};

interface KpiCardProps {
  title: string;
  currentDisplay: string;
  comparison?: AnalyticsMetricComparison;
}

function KpiCard({ title, currentDisplay, comparison }: KpiCardProps) {
  const trend = trendFor(comparison);
  return (
    <article
      aria-label={`${title}: ${currentDisplay}`}
      className="border rounded-lg p-3 flex flex-col gap-1 bg-card"
    >
      <h3 className="text-xs text-muted-foreground">{title}</h3>
      <p className="text-lg font-semibold tabular-nums">{currentDisplay}</p>
      {comparison ? (
        comparison.percentage_change !== undefined ? (
          <p className={`text-xs flex items-center gap-1 ${TREND_COLOR[trend.color]}`}>
            <span aria-hidden="true">{trend.arrow}</span>
            <span>
              {trend.label}
              {trend.label && ' · '}
              {formatCompact(Math.abs(comparison.absolute_change))}
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nessun confronto (precedente = 0)
          </p>
        )
      ) : null}
    </article>
  );
}

export interface ChannelKpiGridProps {
  summary: AnalyticsSummary;
  comparison: AnalyticsComparison;
}

export function ChannelKpiGrid({ summary, comparison }: ChannelKpiGridProps) {
  return (
    <section
      aria-label="KPI principali del canale"
      className="space-y-3"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Visualizzazioni"
          currentDisplay={formatCompact(summary.views)}
          comparison={comparison.views}
        />
        <KpiCard
          title="Watch time"
          currentDisplay={formatWatchTime(summary.watch_time_minutes)}
          comparison={comparison.watch_time_minutes}
        />
        <KpiCard
          title="Iscritti netti"
          currentDisplay={formatInt(summary.subscribers_net)}
          comparison={comparison.subscribers_net}
        />
        <KpiCard
          title="Entrate stimate"
          currentDisplay={formatRevenue(summary.estimated_revenue_cents ?? null)}
          comparison={comparison.estimated_revenue}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Video pubblicati"
          currentDisplay={formatInt(summary.videos_published)}
          comparison={comparison.videos_published}
        />
        <KpiCard
          title="Media views/video"
          currentDisplay={formatCompact(summary.average_views_per_video)}
          comparison={comparison.average_views_per_video}
        />
        <KpiCard
          title="Iscritti acquisiti"
          currentDisplay={formatInt(summary.subscribers_gained)}
        />
        <KpiCard
          title="Iscritti persi"
          currentDisplay={formatInt(summary.subscribers_lost)}
        />
      </div>
    </section>
  );
}

export default ChannelKpiGrid;
