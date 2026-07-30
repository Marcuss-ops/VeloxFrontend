/**
 * AnalyticsEmptyState — rendered when the backend returned a
 * successful but empty payload AND the data is NOT cached-stale
 * (otherwise, with is_stale=true, the stale-cache banner + view is
 * the right UX, because "no data today" could simply mean YouTube
 * is lagging behind).
 *
 * Per spec, this is NOT treated as an error: a 200 + zero views is a
 * legitimate state for a brand-new channel.
 */

import type { AnalyticsPeriodDays } from '../../../../lib/api/channelAnalyticsApi';

export interface AnalyticsEmptyStateProps {
  period: AnalyticsPeriodDays;
  onReconnect?: () => void;
  isReauthRequired?: boolean;
}

export function AnalyticsEmptyState({
  period,
  onReconnect,
  isReauthRequired = false,
}: AnalyticsEmptyStateProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="border rounded-lg p-8 flex flex-col items-center gap-3 text-center"
    >
      <h2 className="text-lg font-medium">
        Nessun dato disponibile negli ultimi {period} giorni
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Le analytics YouTube per questo canale non hanno ancora dati
        consolidati in questa finestra. Verifica che il canale sia
        attivo o riprova più tardi.
      </p>
      {isReauthRequired && onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded"
        >
          Ricollega il canale YouTube
        </button>
      )}
    </section>
  );
}

export default AnalyticsEmptyState;
