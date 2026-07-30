/**
 * formatKpi.ts — Display formatters for the KPI grid, chart, header,
 * and trending video table. All use Intl.NumberFormat with the
 * 'it-IT' locale (matches the copy strings the spec requests).
 *
 * None of these helpers throw on missing/NaN inputs — they return
 * a placeholder ('—' or null) so a backend regression that omits
 * an optional field renders as "no data", not a confusing 0.
 */

import type { AnalyticsMetricComparison } from '../../../../lib/api/channelAnalyticsApi';

const intFmt = new Intl.NumberFormat('it-IT');
const compactFmt = new Intl.NumberFormat('it-IT', { notation: 'compact' });
const percentFmt = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const eurFmt = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function formatInt(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  return intFmt.format(value);
}

export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  return compactFmt.format(value);
}

export function formatRevenue(cents: number | undefined | null): string {
  if (cents === undefined || cents === null || !Number.isFinite(cents)) return '—';
  return eurFmt.format(cents / 100);
}

export function formatWatchTime(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null || !Number.isFinite(minutes)) return '—';
  if (minutes < 60) return `${intFmt.format(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${intFmt.format(hours)} h`;
  return `${intFmt.format(hours)} h ${intFmt.format(rem)} m`;
}

export function formatPercent(value: number | undefined | null): string | null {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFmt.format(value)}%`;
}

/**
 * Returns arrow + colour cue the KPI card uses. `previous === 0`
 * (percentage_change undefined) surfaces as '·' so the card renders
 * "no comparison" without smudging an Infinity percent.
 */
export interface TrendArrow {
  arrow: '↑' | '↓' | '·';
  color: 'up' | 'down' | 'flat';
  label: string;
}

export function trendFor(comparison: AnalyticsMetricComparison | undefined): TrendArrow {
  if (!comparison) return { arrow: '·', color: 'flat', label: 'no comparison' };
  const pct = formatPercent(comparison.percentage_change);
  if (comparison.absolute_change > 0) {
    return { arrow: '↑', color: 'up', label: pct ?? '' };
  }
  if (comparison.absolute_change < 0) {
    return { arrow: '↓', color: 'down', label: pct ?? '' };
  }
  return { arrow: '·', color: 'flat', label: pct ?? '' };
}

export function formatDateLabel(isoDate: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

export function formatLastSynced(iso: string | undefined | null): string {
  if (!iso) return 'mai';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'mai';
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
