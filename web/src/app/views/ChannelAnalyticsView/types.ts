/**
 * types.ts — view-local re-exports + view-only constants.
 *
 * The canonical TS types live in `web/src/lib/api/channelAnalyticsApi.ts`
 * (mirror of the Go DTO contract). This file imports them so view
 * components import from a single path that does not bleed into the
 * api client namespace, and adds view-only enums (the period list,
 * labels, default).
 *
 * Note: `AnalyticsPeriodDays` is BOTH re-exported (for callers) AND
 * used locally (for the labels + period list typing), so an import
 * statement is needed — `export type { X } from '...'` re-exports
 * without bringing the symbol into the local scope.
 */

import type { AnalyticsPeriodDays } from '../../../lib/api/channelAnalyticsApi';

export type {
  ChannelPerformanceResponse,
  AnalyticsChannelInfo,
  AnalyticsPeriod,
  AnalyticsSummary,
  AnalyticsComparison,
  AnalyticsMetricComparison,
  AnalyticsDailyPoint,
  AnalyticsTopVideo,
  AnalyticsTopVideos,
  AnalyticsDataFreshness,
  AnalyticsPeriodDays,
} from '../../../lib/api/channelAnalyticsApi';

/** Canonical ordered list of period days the selector renders. */
export const ANALYTICS_PERIODS: AnalyticsPeriodDays[] = [7, 14, 28];

/** Default period used when ?period= is missing or out of range. */
export const ANALYTICS_DEFAULT_PERIOD: AnalyticsPeriodDays = 7;

/** Period selector labels (kept here so tests can assert the wire). */
export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriodDays, string> = {
  7: '7 giorni',
  14: '14 giorni',
  28: '28 giorni',
};
