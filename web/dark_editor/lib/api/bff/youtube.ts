// BFF YouTube client — Dark Editor's thin wrapper around the InstaEdit
// BFF's /api/v1/youtube/* endpoints (publish + draft auto-save +
// session-detail read + short-poll helper).
//
// Domain module. Imports the shared CSRF-aware fetcher + poll timing
// constants from the sibling lib/api/bff/types.ts module. Originally
// co-located with the rest of the BFF in lib/api/bff.ts; extracted
// here so that callers (the draft auto-save hook, the publish flow,
// the poll fallback) can reach just the YouTube surface without
// dragging the auth + projects + upload + social-destinations +
// broadcast code paths along.
//
// Public surface (6 wire types + 4 runtime functions):
//   - YouTubeTranslation
//   - PublishYouTubeEditorSessionRequest / Response
//   - EditorSessionDetail
//   - YouTubeEditorSessionDraftRequest / Response
//   - publishEditorSession(veloxProjectId, body)
//   - getEditorSessionByProject(veloxProjectId)
//   - pollEditorSessionUntilConfirmed(veloxProjectId, opts)
//   - saveEditorSessionDraft(veloxProjectId, body)
//
// Back-compat: bff.ts re-exports the entire surface verbatim so any
// legacy `@/lib/api/bff` (YouTube-side) caller keeps resolving.

import { bffFetch, POLL_INTERVAL_MS, POLL_MAX_ATTEMPTS } from './types';
import type { PollResult } from './types';

// ------------------------------------------------------------------
// YouTubeTranslation
// ------------------------------------------------------------------

export interface YouTubeTranslation {
  title: string;
  description: string;
}

// ------------------------------------------------------------------
// Publish — P0#5 + P1 metadata. Mirrors the OpenAPI contract landed
// in commit 250a3ea on InstaeditLogin:
//
// Field contract (all fields optional; orchestrator on the backend
// resolves defaults + runs YouTubePublishOptions.Validate() BEFORE any
// side-effect fetch):
//   - title:                  ≤100 chars (YouTube-published bound)
//   - description:            ≤5000 chars
//   - privacy_status:         "public" | "unlisted" | "private"
//   - publish_at:             ISO-8601 (only honoured when privacy=private)
//   - tags:                   ≤30 items, ≤500 chars total incl. commas
//   - default_language:       BCP-47 code; required if translations is set
//   - default_audio_language: BCP-47 code
//   - translations:           map[lang] → {title, description}
//
// On the SPA side the Dark Editor stays thin: we ship the form values
// verbatim + let the backend enforce bounds + idempotency. If the
// backend returns 400 (validation) the toast surfaces the original
// `data.error` string so the operator sees a friendly message instead
// of a paid-for 4xx.
//
// LIVE-UPDATE EXTENSION:
// The response now ALSO ships the three optimistic-update targets the
// Groups card consumes (see publishBroadcast + the main SPA's
// useEditorSessionLiveUpdate hook):
//   - status                  'published' after the orchestrator
//     stamps the row
//   - actual_privacy          YouTube's videos.list read-back value
//   - youtube_sync_status     'confirmed' once YouTube confirms, or
//     'drift' if YouTube diverges from desired_privacy
//
// Backwards-compat: callers that only read the original 4 fields
// keep working because the new 3 fields are added with concrete
// types (no optional indirection) and the backend always fills them.
// ------------------------------------------------------------------

export interface PublishYouTubeEditorSessionRequest {
  title?: string;
  description?: string;
  privacy_status?: 'public' | 'unlisted' | 'private';
  publish_at?: string | null;
  tags?: string[];
  default_language?: string;
  default_audio_language?: string;
  translations?: Record<string, YouTubeTranslation>;
}

export interface PublishYouTubeEditorSessionResponse {
  public_url: string;
  video_id: string;
  privacy_status: string;
  published_at?: string | null;
  // Live-update additions (this commit):
  /** Editor session status at the moment the publish orchestrator
   *  stamps the row. Always 'published' on a successful POST. */
  status: string;
  /** YouTube-confirmed privacy after the videos.list read-back. */
  actual_privacy: string;
  /** Lifecycle marker for the drift reconciler (confirmed/drift/pending/failed). */
  youtube_sync_status: string;
}

export async function publishEditorSession(
  veloxProjectId: string,
  body: PublishYouTubeEditorSessionRequest
): Promise<PublishYouTubeEditorSessionResponse> {
  return bffFetch<PublishYouTubeEditorSessionResponse>(
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}/publish`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

// ------------------------------------------------------------------
// Editor session read — P1#6 refresh of the publish-state read path.
// GET /api/v1/youtube/editor-sessions/by-project/{veloxProjectId}
// Returns the full session DTO (status + actual_privacy +
// youtube_sync_status + youtube_updated_at + desired_privacy + ...).
// Used by the short-poll fallback to detect the drift-reconciler's
// eventual update of actual_privacy after the publish row stamped.
// ------------------------------------------------------------------

export interface EditorSessionDetail {
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
  youtube_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getEditorSessionByProject(
  veloxProjectId: string
): Promise<EditorSessionDetail> {
  return bffFetch<EditorSessionDetail>(
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}`
  );
}

// ------------------------------------------------------------------
// Short-poll helper — designed for the post-publish window where the
// drift reconciler may take a few seconds to stamp actual_privacy.
// We poll GET /by-project/{id} every POLL_INTERVAL_MS until either:
//
//   (a) status === 'published' AND youtube_sync_status === 'confirmed'
//       — the orchestrator + YouTube both confirmed; we're done.
//   (b) POLL_MAX_ATTEMPTS exhausted — surface a 'timeout' result so
//       the caller can decide whether to keep polling or give up
//       gracefully (the next refetchOnWindowFocus will catch up).
//
// Returns the LAST observed state (or the first observed state on
// no-progress) so the caller can read whatever the reconciler
// ultimately left on the row.
// ------------------------------------------------------------------

export async function pollEditorSessionUntilConfirmed(
  veloxProjectId: string,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
  } = {}
): Promise<PollResult> {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? POLL_MAX_ATTEMPTS;
  let lastDetail = await getEditorSessionByProject(veloxProjectId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (lastDetail.status === 'published' && lastDetail.youtube_sync_status === 'confirmed') {
      return { status: 'confirmed', attempts: attempt, detail: lastDetail };
    }
    // Short-circuit on abort signal.
    if (options.signal?.aborted) {
      return { status: 'timeout', attempts: attempt, detail: lastDetail };
    }
    // Wait the interval (skip on the final attempt so we don't sleep
    // needlessly before returning 'timeout').
    if (attempt < maxAttempts) {
      await new Promise<void>((resolve) => {
        const handle = setTimeout(resolve, intervalMs);
        // Allow the caller to abort the wait.
        options.signal?.addEventListener('abort', () => clearTimeout(handle), { once: true });
      });
      if (options.signal?.aborted) {
        return { status: 'timeout', attempts: attempt, detail: lastDetail };
      }
    }
    lastDetail = await getEditorSessionByProject(veloxProjectId);
  }

  return { status: 'timeout', attempts: maxAttempts, detail: lastDetail };
}

// ------------------------------------------------------------------
// Publish draft auto-save (P2). Mirrors the publish endpoint shape,
// minus the strict validation + side-effects. The Dark Editor calls
// this on debounce + on-blur so an operator who closes the tab
// mid-edit can resume the same form state on reload. The server
// returns the echoed draft + draft_updated_at; the SPA renders the
// timestamp next to a "Bozza salvata" indicator without a follow-up
// GET round-trip.
//
// Field contract (all fields optional; an empty body clears the draft):
//   - title:                   string (≤100 chars — not enforced here)
//   - description:             string (≤5000 — not enforced here)
//   - tags:                    string[] (≤30 — not enforced here)
//   - default_language:        string (BCP-47)
//   - default_audio_language:  string (BCP-47)
//   - translations:            map[lang] -> {title, description}
//   - desired_privacy:         "public" | "unlisted" | "private"
//
// Bounds-validation lives at the publish endpoint so a keystroke
// mid-edit (e.g. a temporarily over-long title) doesn't bounce a 400
// every auto-save. The server-side CAS predicate (status IN
// ('editing','failed')) refuses the row while the publish
// orchestrator owns it — surfaced as 409 to the SPA.
// ------------------------------------------------------------------

export interface YouTubeEditorSessionDraftRequest {
  title?: string;
  description?: string;
  tags?: string[];
  default_language?: string;
  default_audio_language?: string;
  translations?: Record<string, YouTubeTranslation>;
  desired_privacy?: 'public' | 'unlisted' | 'private';
}

export interface YouTubeEditorSessionDraftResponse {
  velox_project_id: string;
  draft_title: string;
  draft_description: string;
  draft_tags: string[];
  draft_default_language: string;
  draft_default_audio_language: string;
  draft_translations: Record<string, YouTubeTranslation>;
  draft_desired_privacy: string;
  draft_updated_at: string;
}

export async function saveEditorSessionDraft(
  veloxProjectId: string,
  body: YouTubeEditorSessionDraftRequest
): Promise<YouTubeEditorSessionDraftResponse> {
  return bffFetch<YouTubeEditorSessionDraftResponse>(
    `/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}/draft`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );
}
