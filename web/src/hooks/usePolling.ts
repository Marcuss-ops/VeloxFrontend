/**
 * usePolling — the single polling authority for the dashboard-style data
 * hooks (jobs / dashboard / ansible computers).
 *
 * Replaces the previous per-hook `setInterval(fetchAll, ms)` pattern, which
 * had three systemic issues:
 *   1. OVERLAP: setInterval fires regardless of whether the previous fetch
 *      is still in flight; slow responses > interval stack up and can apply
 *      out-of-order setState (stale snapshot wins).
 *   2. NO VISIBILITY GATING: dashboards left open poll in the background
 *      forever, amplifying backend load for zero value.
 *   3. NO CATCH-UP: after a long hidden period the UI showed data as old as
 *      the hidden time.
 *
 * Design:
 *   - self-scheduling setTimeout: the next tick is scheduled only AFTER the
 *     current fetch completes (single-flight, never overlapping);
 *   - pauses while `document.hidden` and resumes with an immediate refresh
 *     on visibility change (no stale catch-up burst);
 *   - lifecycle abort: each cycle gets an AbortSignal; the NEXT cycle's
 *     fetch is started with a fresh signal, and an aborted in-flight fetch
 *     does not schedule anything further (unmount path);
 *   - errors do not stop the loop (dashboards must keep retrying), the
 *     caller surfaces them through its own state.
 *
 * `fetch` may be called concurrently with a previous in-flight cycle only
 * through an explicit `refresh()` (user clicks Refresh) — the explicit
 * call intentionally shares the single-flight promise so concurrent
 * refresh clicks dedupe to one network round-trip.
 */

import { useCallback, useEffect, useRef } from 'react';

export function usePolling(fetch: (signal: AbortSignal) => Promise<void>, intervalMs: number): {
  /** Manual refresh; deduped against any in-flight cycle. */
  refresh: () => Promise<void>;
} {
  const fetchRef = useRef(fetch);
  useEffect(() => {
    fetchRef.current = fetch;
  }, [fetch]);

  const cycleRef = useRef<Promise<void> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

  const runCycle = useCallback((): Promise<void> => {
    if (cycleRef.current) return cycleRef.current;
    if (disposedRef.current) return Promise.resolve();

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    cycleRef.current = (async () => {
      try {
        await fetchRef.current(signal);
      } catch {
        // The caller owns error state; the polling loop must survive
        // transient failures.
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        cycleRef.current = null;
      }
    })();
    return cycleRef.current;
  }, []);

  const scheduleNext = useCallback((): void => {
    if (disposedRef.current || document.hidden) return;
    if (timerRef.current !== null) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runCycle().finally(() => {
        scheduleNext();
      });
    }, intervalMs);
  }, [intervalMs, runCycle]);

  useEffect(() => {
    disposedRef.current = false;

    // Initial fetch runs immediately (matches the old setInterval semantics).
    void runCycle().finally(() => {
      scheduleNext();
    });

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        // Pause: stop the chain; the in-flight cycle is left to finish so
        // its results still land in the caller's state.
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else if (timerRef.current === null && cycleRef.current === null) {
        // Resume with an immediate refresh (catch-up without a burst).
        void runCycle().finally(() => {
          scheduleNext();
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disposedRef.current = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      // Abort any in-flight fetch so the caller's setState after unmount
      // is avoided at the network layer, not just at the React layer.
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  const refresh = useCallback((): Promise<void> => runCycle(), [runCycle]);

  return { refresh };
}

export default usePolling;
