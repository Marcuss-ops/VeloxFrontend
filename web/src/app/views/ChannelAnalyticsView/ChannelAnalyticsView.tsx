/**
 * ChannelAnalyticsView — top-level view composition.
 *
 * Pipeline (thinker's step-9 state machine):
 *   1. Loading (isLoading)         → AnalyticsSkeleton
 *   2. Error   (isError)           → AnalyticsErrorState (mapped by ApiError.status)
 *   3. Empty   (success + views=0  → AnalyticsEmptyState (only when cache is NOT stale;
 *              + !is_stale)              stale data is shown with the banner instead)
 *   4. Success                     → render Header + PeriodSelector + KpiGrid + Chart + Table
 *
 * The view is intentionally thin: every interactive element reads
 * state from the hook and forwards mutations back through callbacks.
 * Period state is URL-bound via useAnalyticsPeriod.
 *
 * The component receives the platformAccountId as a prop (the router
 * :platformAccountId segment) so the URL is the source of truth and
 * the view works without a global context.
 */

import { useChannelAnalytics } from './useChannelAnalytics';
import { useAnalyticsPeriod } from './useAnalyticsPeriod';

import { ChannelAnalyticsHeader } from './components/ChannelAnalyticsHeader';
import { AnalyticsPeriodSelector } from './components/AnalyticsPeriodSelector';
import { ChannelKpiGrid } from './components/ChannelKpiGrid';
import { ChannelPerformanceChart } from './components/ChannelPerformanceChart';
import { TrendingVideosTable } from './components/TrendingVideosTable';
import { AnalyticsEmptyState } from './components/AnalyticsEmptyState';
import { AnalyticsErrorState } from './components/AnalyticsErrorState';
import { AnalyticsSkeleton } from './components/AnalyticsSkeleton';

export interface ChannelAnalyticsViewProps {
  platformAccountId: number;
  onBack?: () => void;
  onReconnect?: () => void;
}

export function ChannelAnalyticsView({
  platformAccountId,
  onBack,
  onReconnect,
}: ChannelAnalyticsViewProps) {
  // Pin the URL period so the period selector renders with the right
  // highlighted button even before data arrives; useAnalyticsPeriod
  // owns the read/write of ?period= via useSearchParams.
  useAnalyticsPeriod();
  const query = useChannelAnalytics({ platformAccountId, period: 7 });

  if (query.isLoading) {
    return (
      <main className="space-y-4 p-4 max-w-6xl mx-auto">
        <AnalyticsPeriodSelector />
        <AnalyticsSkeleton />
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="space-y-4 p-4 max-w-6xl mx-auto">
        <AnalyticsPeriodSelector />
        <AnalyticsErrorState
          error={query.error}
          isStale={false}
          onReconnect={onReconnect}
          onRefresh={() => void query.refetch()}
        />
      </main>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <main className="space-y-4 p-4 max-w-6xl mx-auto">
        <AnalyticsPeriodSelector />
        <AnalyticsEmptyState period={7} />
      </main>
    );
  }

  const isEmpty = data.summary.views === 0 && !data.data_freshness.is_stale;

  return (
    <main className="space-y-4 p-4 max-w-6xl mx-auto">
      <ChannelAnalyticsHeader
        channel={data.channel}
        dataFreshness={data.data_freshness}
        onRefresh={() => void query.refetch()}
        onBack={onBack}
      />
      <AnalyticsPeriodSelector />
      {isEmpty ? (
        <AnalyticsEmptyState
          period={data.period.days}
          isReauthRequired={false}
          onReconnect={onReconnect}
        />
      ) : (
        <>
          <ChannelKpiGrid summary={data.summary} comparison={data.comparison} />
          <ChannelPerformanceChart dailySeries={data.daily_series} />
          <TrendingVideosTable topVideos={data.top_videos} />
        </>
      )}
    </main>
  );
}

export default ChannelAnalyticsView;
