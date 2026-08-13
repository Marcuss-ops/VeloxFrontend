'use client';

import { useEffect, useState } from 'react';
import { EditorUnauthorizedError, ensureEditorSessionToken } from '@/lib/editor-session';
import { editorRuntimePath } from '@/lib/editor-runtime';

// Detail shape returned by GET /api/v1/youtube/editor-sessions/by-project/{projectId}.
// Mirrors the row-level DTO in
// InstaeditLogin/pkg/api/youtube_editor_sessions_by_project.go (the
// `status` field is the discriminator that drives the gate mapping
// below).
export interface YouTubeEditorSessionDetail {
    id: string;
    workspace_id: number;
    platform_account_id: number;
    youtube_video_id: string;
    velox_project_id: string;
    source_thumbnail_url?: string;
    thumbnail_media_id?: string | null;
    desired_privacy: string;
    publish_at?: string | null;
    status: string;
    last_error?: string;
    actual_privacy?: string | null;
    youtube_sync_status?: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Discriminated state returned by the YouTube session gate.
 *
 * The public values match the architecture spec to the letter:
 *   not_found           → 404 from the backend (or session is not yours)
 *   unauthorized        → 401 from the backend (no / expired JWT)
 *   editable_editing    → 200 + status='editing'   (canvas mutable)
 *   editable_failed     → 200 + status='failed'    (canvas mutable, retry path)
 *   readonly_publishing → 200 + status='publishing' (banner read-only + blocked)
 *   readonly_published  → 200 + status='published'  (storic / read-only)
 *   readonly_unknown    → 200 + status=<out-of-spec> (FAIL-CLOSED: a status
 *     this frontend does not know must never enable editing)
 *
 * Plus two transient / internal cases kept for the UI plumbing:
 *   loading → initial mount, fetch in flight
 *   error   → transport failure or 5xx — surface a banner + retry
 */
export type SessionGateState =
    | { state: 'loading' }
    | { state: 'not_found' }
    | { state: 'unauthorized' }
    | { state: 'editable_editing'; session: YouTubeEditorSessionDetail }
    | { state: 'editable_failed'; session: YouTubeEditorSessionDetail }
    | { state: 'readonly_publishing'; session: YouTubeEditorSessionDetail }
    | { state: 'readonly_published'; session: YouTubeEditorSessionDetail }
    | { state: 'readonly_unknown'; session: YouTubeEditorSessionDetail }
    | { state: 'error'; message: string };

const GATE_ENDPOINT = (projectId: string): string =>
    editorRuntimePath(`api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(projectId)}`);

// Default redirect target on InstaEdit Social when the user opens
// a session they don't have permission to access.
const INSTAEDIT_SOCIAL_URL = '/dashboard-channels';

/**
 * Pure mapping of a backend session row to the gate state. Kept separate
 * so the fail-closed contract (unknown status → readonly, never editable)
 * can be unit-tested without exercising the polling/fetch machinery.
 */
export function mapSessionStatusToGate(
  session: YouTubeEditorSessionDetail,
): Extract<SessionGateState, { session: YouTubeEditorSessionDetail }> {
  switch (session.status) {
    case 'editing':
      return { state: 'editable_editing', session };
    case 'failed':
      return { state: 'editable_failed', session };
    case 'publishing':
      return { state: 'readonly_publishing', session };
    case 'published':
      return { state: 'readonly_published', session };
    default:
      // FAIL-CLOSED: an out-of-spec status must never enable editing.
      return { state: 'readonly_unknown', session };
  }
}

// The gate re-validates the session while the editor stays open. There is
// NO useEditorSessionLiveUpdate in this repo (the old comment referenced a
// hook that lives in the InstaEdit SPA bundle, not here), so without this
// poll a session that flips editing → publishing mid-session would keep
// the editor in the writable state. 10s keeps the window tight enough to
// matter and the request rate negligible for a single open editor. Polling
// pauses while the tab is hidden (visibilitychange) and stops entirely on
// unmount. Overridable for tests.
export const GATE_REVALIDATE_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_EDITOR_GATE_POLL_MS ?? 10_000);

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

/**
 * Redirects from InstaEditor back to InstaEdit Social.
 * Uses window.location because this handoff crosses application boundaries.
 */
export function redirectToInstaEdit(path: string = INSTAEDIT_SOCIAL_URL): void {
    window.location.href = path;
}
