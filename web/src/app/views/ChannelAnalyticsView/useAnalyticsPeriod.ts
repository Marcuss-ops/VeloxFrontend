/**
 * useAnalyticsPeriod — URL-bound period state.
 *
 * Period is encoded as `?period={7|14|28}` in the URL. The hook:
 *   - reads + validates the value (out-of-range / missing → 7)
 *   - exposes a setter that pushes valid values (and silently drops
 *     the param when writing the default, so the URL stays clean:
 *     `/dashboard-channels/381` instead of `?period=7` for the default)
 *   - uses { replace: true } so 7→14→28→7 navigation does not pollute
 *     browser history (per spec: refresh / back / forward work but
 *     period toggles are not push entries)
 *
 * The 7|14|28 validation lives here (and ONLY here) so the consumer
 * components stay purely presentational and the contract's closed
 * set is enforced exactly once on the read path.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AnalyticsPeriodDays } from '../../../lib/api/channelAnalyticsApi';
import { ANALYTICS_DEFAULT_PERIOD } from './types';

const VALID_SET: ReadonlySet<AnalyticsPeriodDays> = new Set([7, 14, 28]);

export function parseAnalyticsPeriod(raw: string | null): AnalyticsPeriodDays {
  if (raw === null) return ANALYTICS_DEFAULT_PERIOD;
  const n = Number(raw);
  if (n === 7 || n === 14 || n === 28) return n;
  return ANALYTICS_DEFAULT_PERIOD;
}

export interface UseAnalyticsPeriodResult {
  period: AnalyticsPeriodDays;
  setPeriod: (next: AnalyticsPeriodDays) => void;
}

export function useAnalyticsPeriod(): UseAnalyticsPeriodResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = parseAnalyticsPeriod(searchParams.get('period'));

  const setPeriod = useCallback(
    (next: AnalyticsPeriodDays) => {
      // Refuse anything outside the closed set defensively; the call
      // sites use only typed AnalyticsPeriodDays, but the public
      // surface of this hook is a number-shaped API.
      if (!VALID_SET.has(next)) return;
      setSearchParams(
        (prev) => {
          if (next === ANALYTICS_DEFAULT_PERIOD) {
            prev.delete('period');
          } else {
            prev.set('period', String(next));
          }
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { period, setPeriod };
}
