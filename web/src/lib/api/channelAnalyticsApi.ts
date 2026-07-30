/**
 * channelAnalyticsApi — per-channel performance endpoint client.
 *
 * Wire shape mirrors the canonical Go DTO from
 * InstaeditLogin/internal/analytics/contract.go. Any change there MUST
 * be reflected here; mismatches are caught at runtime by the consumer
 * hook (useChannelAnalytics) and at typecheck time by this file.
 *
 * The contract is the single source of truth — Step 7 deliberately
 * does NOT duplicate the wire shape as a separate frontend schema.
 *
 * Endpoint:
 *   GET /api/v1/accounts/{platform_account_id}/performance?days=7|14|28
 *
 * The function is the ONLY place that talks to the endpoint. UI
 * components MUST go through this client (or its React Query hook in
 * useChannelAnalytics) so fetch logic stays testable in isolation.
 */

import { apiGet } from './client';

/**
 * Closed period set the per-channel endpoint canonical accepts. The
 * literal union narrows `days` at compile time so a refactor that
 * re-introduces 30/90/365 surfaces as a type error before reaching
 * QA. Mirrors analytics.AllowedPeriodDays on the backend.
 */
export type AnalyticsPeriodDays = 7 | 14 | 28;

/** Channel identity. PlatformAccountID is the stable SPA-facing ID. */
export interface AnalyticsChannelInfo {
  platform_account_id: number;
  youtube_channel_id: string;
  channel_name: string;
  avatar_url?: string;
  status: string;
}

/**
 * Resolved current + previous windows. Both windows are ALWAYS the
 * same length (the resolver rejects any other combination with 400).
 * Timezone is always "UTC".
 */
export interface AnalyticsPeriod {
  days: AnalyticsPeriodDays;
  start_date: string;
  end_date: string;
  previous_start_date: string;
  previous_end_date: string;
  timezone: string;
}

/**
 * Aggregated headline KPIs for the current window. estimated_revenue_cents,
 * impressions and ctr are OPTIONAL — they are populated only when the
 * underlying OAuth scope and analytics granularity surface them, and are
 * OMITTED (not zero) otherwise so the UI can render "no data" without
 * smuggling a misleading 0.
 */
export interface AnalyticsSummary {
  views: number;
  watch_time_minutes: number;
  subscribers_gained: number;
  subscribers_lost: number;
  subscribers_net: number;
  estimated_revenue_cents?: number;
  videos_published: number;
  average_views_per_video: number;
  impressions?: number;
  ctr?: number;
}

/**
 * Per-KPI delta between current and previous same-length windows.
 * percentage_change is OMITTED (not 0, not null) when previous_value
 * is 0 — the SPA uses absence to render "no comparison" instead of
 * an Infinity percent change that would crash the chart.
 */
export interface AnalyticsMetricComparison {
  current_value: number;
  previous_value: number;
  absolute_change: number;
  percentage_change?: number;
}

/**
 * KPI card comparison map. Each entry corresponds to one card on
 * the SPA dashboard.
 */
export interface AnalyticsComparison {
  views: AnalyticsMetricComparison;
  watch_time_minutes: AnalyticsMetricComparison;
  subscribers_net: AnalyticsMetricComparison;
  estimated_revenue: AnalyticsMetricComparison;
  videos_published: AnalyticsMetricComparison;
  average_views_per_video: AnalyticsMetricComparison;
}

/**
 * One element of the per-day chart series. The slice MUST have
 * exactly `period.days` elements; the backend gap-fills missing
 * days with zeros so the chart never has gaps.
 */
export interface AnalyticsDailyPoint {
  date: string;
  views: number;
  watch_time_minutes: number;
  subscribers_net: number;
  estimated_revenue_cents?: number;
}

/**
 * A single ranked video. TrendScore is the growing-rank score the
 * backend TrendingVideoScorer emits; the scorer MUST replace
 * NaN/+Inf/-Inf with 0 before populating (see contract.go doc) so
 * this field is always a finite number on the wire.
 */
export interface AnalyticsTopVideo {
  video_id: string;
  title: string;
  thumbnail_url?: string;
  published_at: string;
  views_in_period: number;
  watch_time_in_period: number;
  revenue_cents_in_period?: number;
  views_per_day: number;
  /** Omitted for videos without a meaningful previous-period comparison. */
  growth_percentage?: number;
  trend_score: number;
  youtube_url: string;
}

/**
 * Dual-list ranking the SPA renders behind the "Most viewed" and
 * "Growing" tabs. Both arrays are server-side computed; the SPA MUST
 * NOT recompute them client-side.
 */
export interface AnalyticsTopVideos {
  most_viewed: AnalyticsTopVideo[];
  growing: AnalyticsTopVideo[];
}

/** Cache staleness signal surfaced by the backend. */
export interface AnalyticsDataFreshness {
  last_synced_at: string;
  is_stale: boolean;
}

/**
 * Full wire shape for
 * GET /api/v1/accounts/{platform_account_id}/performance?days=7|14|28.
 * Top-level keys are exactly 8 and MUST stay in this order in tests.
 */
export interface ChannelPerformanceResponse {
  channel: AnalyticsChannelInfo;
  period: AnalyticsPeriod;
  summary: AnalyticsSummary;
  comparison: AnalyticsComparison;
  daily_series: AnalyticsDailyPoint[];
  top_videos: AnalyticsTopVideos;
  generated_at: string;
  data_freshness: AnalyticsDataFreshness;
}

/** Options supported by getAccountPerformance. */
export interface GetAccountPerformanceOptions {
  /**
   * Cancellation token forwarded to fetch. React Query passes this
   * automatically when the consumer unmounts or the user switches
   * period (7 → 14 → 28) so we never keep stale requests alive.
   */
  signal?: AbortSignal;
}

/**
 * Positive integer guard for the platform_account_id path segment.
 * Returning a RangeError (rather than making the request) avoids a
 * 404 from the backend that would otherwise burn a request budget
 * for a clearly client-side mistake.
 */
function assertValidAccountID(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new RangeError(
      `channelAnalyticsApi.getAccountPerformance: platformAccountId must be a positive integer, got ${id}`,
    );
  }
}

/**
 * Fetch the per-channel performance analytics for a single YouTube
 * account. The platformAccountId is the SPA-stable identifier (NOT
 * the channel name or YouTube channel ID) — the backend uses it to
 * apply workspace ownership, account status and OAuth scope checks.
 *
 * Throws:
 *   - RangeError when platformAccountId is not a positive integer.
 *   - DOMException('AbortError') when the signal aborts mid-flight.
 *   - ApiError with `status` preserved (400 → invalid days, 401 →
 *     expired session, 403/404 → channel not accessible, 500 →
 *     backend failure) on every non-ok response.
 *
 * The signature accepts AbortSignal via options so React Query and
 * the useChannelAnalytics hook can cancel on period change without
 * the UI having to manage AbortController itself.
 */
export async function getAccountPerformance(
  platformAccountId: number,
  days: AnalyticsPeriodDays,
  options: GetAccountPerformanceOptions = {},
): Promise<ChannelPerformanceResponse> {
  // Validation runs synchronously BEFORE the first `await`. Because
  // the function is `async`, a thrown RangeError here becomes a
  // Promise rejection at the call site — callers can `.catch()`
  // every error uniformly, including the client-side guard.
  assertValidAccountID(platformAccountId);
  const endpoint = `/api/v1/accounts/${platformAccountId}/performance?days=${days}`;
  return apiGet<ChannelPerformanceResponse>(endpoint, options);
}

/** Object-surface API for callers that prefer `api.foo()` over a bare function. */
export const channelAnalyticsApi = {
  getAccountPerformance,
};
