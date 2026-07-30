/**
 * useChannelAnalytics — React Query hook that owns the fetch and the
 * query-state mapping.
 *
 * Per the Step 9 spec, ALL fetch + computation lives here; components
 * import this hook and remain purely presentational. The hook:
 *   - enforces the closed period set 7|14|28 (AnalyticsPeriodDays
 *     type makes that a compile-time invariant; runtime sanity is
 *     covered by parseAnalyticsPeriod on the URL side)
 *   - forwards the React Query AbortSignal to fetch, so consumers'
 *     period switch / unmount cancels the in-flight request
 *   - uses placeholderData: keepPreviousData so toggling 7 → 14
 *     shows the 7-day data while 14-day loads (UX continuity)
 *   - disables the query entirely when platformAccountId is not a
 *     positive integer (avoids burning a request budget on a
 *     misclicked navigation)
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  channelAnalyticsApi,
  type AnalyticsPeriodDays,
  type ChannelPerformanceResponse,
} from '../../../lib/api/channelAnalyticsApi';
import { channelAnalyticsQueryKey } from './channelAnalyticsQueryKey';

/** staleTime: 5 minutes per spec (7-day data). */
export const ANALYTICS_STALE_TIME_MS = 5 * 60 * 1000;

export interface UseChannelAnalyticsArgs {
  platformAccountId: number | null | undefined;
  period: AnalyticsPeriodDays;
  /** Optional parent-controlled disable (e.g. workspace tab inactive). */
  enabled?: boolean;
}

/**
 * Returns React Query's full result for the channel performance
 * query plus a stable platformAccountId echo so the view can render
 * "loading for account N" without re-deriving it.
 */
export function useChannelAnalytics({
  platformAccountId,
  period,
  enabled = true,
}: UseChannelAnalyticsArgs) {
  const safeId =
    typeof platformAccountId === 'number' && Number.isInteger(platformAccountId) && platformAccountId > 0
      ? platformAccountId
      : null;

  return useQuery<ChannelPerformanceResponse, Error>({
    queryKey: safeId === null
      ? ['channel-analytics', 'disabled']
      : channelAnalyticsQueryKey(safeId, period),
    queryFn: ({ signal }) => {
      if (safeId === null) {
        // Should be unreachable because `enabled` is false in this case.
        return Promise.reject(new Error('platformAccountId required'));
      }
      return channelAnalyticsApi.getAccountPerformance(safeId, period, { signal });
    },
    enabled: enabled && safeId !== null,
    staleTime: ANALYTICS_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}
