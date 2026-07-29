'use client';

import { useEffect, useState } from 'react';

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
    | { state: 'error'; message: string };

const GATE_ENDPOINT = (projectId: string): string =>
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(projectId)}`;

// Default redirect target on InstaEdit Social when the user opens
// a session they don't have permission to access.
const INSTAEDIT_SOCIAL_URL = '/dashboard-channels';

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
 *   200 status=<other> → 'editable_editing'    (defensive: an out-of-spec status
 *     must NOT brick the editor's only mount path; treat as editable)
 *   !res.ok (5xx/4xx other) → 'error'          (banner + retry)
 *   thrown fetch       → 'error'               (banner + retry)
 *
 * The hook is intentionally minimal — no caching, no retries, no polling.
 * The session row is the source of truth on the backend; re-renders of
 * the page re-fetch it. Status transitions while the editor is open
 * flow through the live-update channel
 * (see useEditorSessionLiveUpdate in the SPA main bundle).
 */
export function useYouTubeSessionGate(projectId: string): SessionGateState {
    const [gateState, setGateState] = useState<SessionGateState>({ state: 'loading' });

    useEffect(() => {
        let cancelled = false;

        async function validate() {
            try {
                const res = await fetch(GATE_ENDPOINT(projectId), {
                    credentials: 'include',
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

                switch (session.status) {
                    case 'editing':
                        setGateState({ state: 'editable_editing', session });
                        return;
                    case 'failed':
                        setGateState({ state: 'editable_failed', session });
                        return;
                    case 'publishing':
                        setGateState({ state: 'readonly_publishing', session });
                        return;
                    case 'published':
                        setGateState({ state: 'readonly_published', session });
                        return;
                    default:
                        // Defensive fallback: an out-of-spec status
                        // (e.g. a new column the SPA hasn't shipped
                        // yet, or a backend bug) must NOT brick the
                        // editor's only mount path — treat as editable.
                        setGateState({ state: 'editable_editing', session });
                }
            } catch (err) {
                if (cancelled) return;
                setGateState({
                    state: 'error',
                    message: err instanceof Error ? err.message : 'Network error',
                });
            }
        }

        void validate();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    return gateState;
}

/**
 * Effettua il redirect fuori dal Dark Editor verso InstaEdit Social.
 * Usa window.location perché il Next.js router opera solo all'interno
 * del basePath /dark_editor_v2.
 */
export function redirectToInstaEdit(path: string = INSTAEDIT_SOCIAL_URL): void {
    window.location.href = path;
}
