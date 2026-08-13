'use client';

import { useEffect, useState } from 'react';
import { EditorUnauthorizedError, ensureEditorSessionToken } from '@/lib/editor-session';
import {
  GATE_ENDPOINT,
  GATE_REVALIDATE_INTERVAL_MS,
  mapSessionStatusToGate,
  type SessionGateState,
  type YouTubeEditorSessionDetail,
} from '@/lib/youtubeSessionGate';

// Back-compat re-exports: the gate's domain surface (types, fail-closed
// mapping, cadence, redirect) now lives in lib/youtubeSessionGate.ts but
// legacy importers keep resolving from this hook module unchanged.
export {
  mapSessionStatusToGate,
  redirectToInstaEdit,
  GATE_REVALIDATE_INTERVAL_MS,
} from '@/lib/youtubeSessionGate';
export type { SessionGateState, YouTubeEditorSessionDetail } from '@/lib/youtubeSessionGate';

/**
 * Gate obbligatorio: prima di montare il canvas, verifica che il
 * velox_project_id corrisponda a una sessione YouTube autorizzata e
 * modificabile.
 *
 * Maps (HTTP status, body.status) into the discriminated union above:
 *   401                → 'unauthorized'        (caller redirects to /login)
 *   404                → 'not_found'           (caller redirects to /dashboard-channels)
 *   200 status=editing → 'editable_editing'    (canvas mutable)
 *   200 status=failed  → 'editable_failed'     (canvas mutable, retry path)
 *   200 status=publishing → 'readonly_publishing' (banner read-only + blocked)
 *   200 status=published  → 'readonly_published'  (read-only / history)
 *   200 status=<other> → 'readonly_unknown'    (FAIL-CLOSED: an out-of-spec
 *     status must NOT enable editing — the frontend cannot prove the
 *     session is writable, so it refuses to allow writes)
 *   !res.ok (5xx/4xx other) → 'error'          (banner + retry)
 *   thrown fetch       → 'error'               (banner + retry)
 *
 * While the editor is open the gate re-validates every
 * GATE_REVALIDATE_INTERVAL_MS, so a session that transitions
 * editing → publishing/published mid-edit is picked up and the editor is
 * switched to read-only instead of silently staying writable. (There is no
 * useEditorSessionLiveUpdate in this repo — the comment in earlier
 * versions pointed at a hook living in the InstaEdit SPA bundle.)
 */
export function useYouTubeSessionGate(
  projectId: string,
  pollIntervalMs: number = GATE_REVALIDATE_INTERVAL_MS,
): SessionGateState {
    const [gateState, setGateState] = useState<SessionGateState>({ state: 'loading' });

    useEffect(() => {
        let cancelled = false;

        async function validate() {
            try {
                const token = await ensureEditorSessionToken(projectId);
                const res = await fetch(GATE_ENDPOINT(projectId), {
                    credentials: 'include',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (cancelled) return;

                if (res.status === 401) {
                    setGateState({ state: 'unauthorized' });
                    return;
                }

                if (res.status === 404) {
                    setGateState({ state: 'not_found' });
                    return;
                }

                if (!res.ok) {
                    let message = 'Failed to validate editor session';
                    try {
                        const data = await res.json();
                        message = data?.error || message;
                    } catch {
                        /* keep the default */
                    }
                    setGateState({ state: 'error', message });
                    return;
                }

                const session: YouTubeEditorSessionDetail = await res.json();
                if (cancelled) return;
                setGateState(mapSessionStatusToGate(session));
            } catch (err) {
                if (cancelled) return;
                // A 401 while minting/exchanging the editor session means
                // the InstaEdit session behind it is gone (or was never
                // there — e.g. a stale editor URL opened without a valid
                // launch token). Map it to 'unauthorized' so the caller
                // hands the user back to the Copertine hub instead of a
                // dead-end error screen.
                if (err instanceof EditorUnauthorizedError) {
                    setGateState({ state: 'unauthorized' });
                    return;
                }
                setGateState({
                    state: 'error',
                    message: err instanceof Error ? err.message : 'Network error',
                });
            }
        }

        void validate();

        // Re-validate while the editor stays open so an editing → publishing
        // (or published) transition is picked up within one interval and the
        // editor flips to read-only instead of silently remaining writable.
        // Self-cancelling setTimeout (not setInterval): the next poll is only
        // scheduled AFTER the current one finishes, and the chain dies on
        // unmount or when the tab is hidden.
        let pollTimer: number | null = null;
        let hidden = document.hidden;

        const scheduleNextPoll = () => {
            if (cancelled || hidden) return;
            pollTimer = window.setTimeout(() => {
                pollTimer = null;
                void validate().finally(() => {
                    scheduleNextPoll();
                });
            }, pollIntervalMs);
        };

        const onVisibilityChange = () => {
            hidden = document.hidden;
            if (hidden && pollTimer !== null) {
                window.clearTimeout(pollTimer);
                pollTimer = null;
            } else if (!hidden && pollTimer === null && !cancelled) {
                scheduleNextPoll();
            }
        };

        scheduleNextPoll();
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            cancelled = true;
            if (pollTimer !== null) window.clearTimeout(pollTimer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [projectId, pollIntervalMs]);

    return gateState;
}
