// lib/youtubeSessionGate.ts — Pure domain surface for the YouTube editor
// session gate: the wire shape, the discriminated state, the fail-closed
// status mapping, the endpoint and re-validation cadence, and the cross-app
// redirect. Extracted from hooks/useYouTubeSessionGate.ts so the hook keeps
// only the fetch + polling lifecycle and this mapping stays unit-testable
// without React.

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
    // Extended session contract (thumbnail_url, category_id,
    // privacy_status) — the authoritative YouTube projection served by
    // the backend from videos.list / the publish read-back. Mirrors
    // EditorSessionDetail in lib/api/bff/youtube/types.ts.
    thumbnail_url?: string;
    category_id?: string;
    privacy_status?: string;
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

export const GATE_ENDPOINT = (projectId: string): string =>
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
 * Redirects from InstaEditor back to InstaEdit Social.
 * Uses window.location because this handoff crosses application boundaries.
 */
export function redirectToInstaEdit(path: string = INSTAEDIT_SOCIAL_URL): void {
    window.location.href = path;
}
