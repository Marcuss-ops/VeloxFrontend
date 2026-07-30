/**
 * AnalyticsErrorState — distinct copy per ApiError.status code.
 *
 * The map is the contract between backend HTTP errors and operator-
 * facing messages. Listed in spec order:
 *   401 → "Sessione scaduta"               (AuthProvider will refresh on next nav)
 *   403 / 404 → "Canale non accessibile"    (cross-workspace leak: do NOT reveal)
 *   422 → "Ricollega YouTube"               (OAuth scope revoked)
 *   5xx → "YouTube non risponde"            (cache fallback handled in parent)
 *   else → generic fallback
 */

import { ApiError } from '../../../../lib/api/client';

type Flavour =
  | 'session-expired'
  | 'channel-inaccessible'
  | 'oauth-invalid'
  | 'upstream-down'
  | 'unknown';

interface MapResult {
  flavour: Flavour;
  title: string;
  detail: string;
  /** Optional CTA; clicking surfaces a hint or the re-link flow. */
  cta: 'reconnect' | 'refresh' | null;
}

function mapError(err: Error, isStale: boolean): MapResult {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return {
        flavour: 'session-expired',
        title: 'Sessione scaduta',
        detail: 'La tua sessione è scaduta. Ricarica la pagina per continuare.',
        cta: 'refresh',
      };
    }
    if (err.status === 403 || err.status === 404) {
      return {
        flavour: 'channel-inaccessible',
        title: 'Canale non accessibile',
        detail:
          'Il canale richiesto non fa parte di questo workspace oppure è stato rimosso.',
        cta: null,
      };
    }
    if (err.status === 422) {
      return {
        flavour: 'oauth-invalid',
        title: 'Ricollega il canale YouTube',
        detail:
          'YouTube ha revocato l\'autorizzazione di questo account. Ricollegalo per riprendere la sincronizzazione.',
        cta: 'reconnect',
      };
    }
    if (err.status >= 500) {
      return {
        flavour: 'upstream-down',
        title: 'YouTube non risponde',
        detail: isStale
          ? 'I dati in cache sono ancora validi — riproveremo automaticamente.'
          : 'YouTube non sta rispondendo. La richiesta verrà ripetuta automaticamente.',
        cta: 'refresh',
      };
    }
  }
  return {
    flavour: 'unknown',
    title: 'Errore imprevisto',
    detail: err.message ? String(err.message) : 'Si è verificato un errore. Riprova.',
    cta: 'refresh',
  };
}

export interface AnalyticsErrorStateProps {
  error: Error;
  /**
   * Whether the most recent successful payload was within the cache
   * freshness window — used to soften the 5xx message ("stale cached
   * data is still shown").
   */
  isStale?: boolean;
  onReconnect?: () => void;
  onRefresh?: () => void;
}

export function AnalyticsErrorState({
  error,
  isStale = false,
  onReconnect,
  onRefresh,
}: AnalyticsErrorStateProps) {
  const mapped = mapError(error, isStale);
  return (
    <section
      role="alert"
      aria-live="assertive"
      data-flavour={mapped.flavour}
      className="border border-red-200 bg-red-50 text-red-900 rounded-lg p-8 flex flex-col items-center gap-3 text-center"
    >
      <h2 className="text-lg font-semibold">{mapped.title}</h2>
      <p className="text-sm max-w-md">{mapped.detail}</p>
      {mapped.cta === 'reconnect' && onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded"
        >
          Ricollega YouTube
        </button>
      )}
      {mapped.cta === 'refresh' && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="px-4 py-2 text-sm border border-red-300 text-red-900 rounded"
        >
          Riprova
        </button>
      )}
    </section>
  );
}

export default AnalyticsErrorState;
