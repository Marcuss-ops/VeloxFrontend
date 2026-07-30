/**
 * channelAnalyticsQueryKey.ts — canonical React Query key factory.
 *
 * Using a factory (vs inline arrays) ensures the key shape stays
 * consistent across the view, the hook, the manual refresh handler,
 * and any future invalidation call from the cards list (Step 11).
 */

import type { AnalyticsPeriodDays } from '../../../lib/api/channelAnalyticsApi';

/**
 * Prefix shared by every channel-analytics query. Use this to
 * invalidate the entire series when the user updates YouTube OAuth
 * or when the workspace changes.
 */
export const ANALYTICS_QUERY_KEY_PREFIX = ['channel-analytics'] as const;

/**
 * Build the canonical key for one (account, period). Returns a
 * readonly tuple so React Query's serialisation stays stable.
 */
export function channelAnalyticsQueryKey(
  platformAccountId: number,
  period: AnalyticsPeriodDays,
): readonly [readonly ['channel-analytics'], number, AnalyticsPeriodDays] {
  return [ANALYTICS_QUERY_KEY_PREFIX, platformAccountId, period];
}
