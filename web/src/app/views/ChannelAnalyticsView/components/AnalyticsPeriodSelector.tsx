/**
 * AnalyticsPeriodSelector — three-button toggle (7|14|28) bound to
 * the URL via useAnalyticsPeriod(). The URL is the source of truth so
 * the back/forward browser buttons restore the period, the link is
 * shareable, and React Query's keepPreviousData makes the metric
 * swap feel instant.
 *
 * Pure presentational: no fetch, no calculations — every interactive
 * surface is a button with aria-pressed.
 */

import { useAnalyticsPeriod } from '../useAnalyticsPeriod';
import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriodDays,
} from '../types';

export interface AnalyticsPeriodSelectorProps {
  /** Optional aria-label override for tests. */
  ariaLabel?: string;
}

export function AnalyticsPeriodSelector({
  ariaLabel = 'Selettore periodo analytics',
}: AnalyticsPeriodSelectorProps) {
  const { period, setPeriod } = useAnalyticsPeriod();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex border rounded-md overflow-hidden"
    >
      {ANALYTICS_PERIODS.map((p: AnalyticsPeriodDays) => {
        const active = period === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            data-period={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 text-sm border-r last:border-r-0 ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            {ANALYTICS_PERIOD_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}

export default AnalyticsPeriodSelector;
