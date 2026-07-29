/**
 * Minimal BFF client for the dark editor to call the InstaEdit BFF.
 *
 * The web/src/lib/api/client.ts is Vite-specific (import.meta.env),
 * so the dark editor keeps its own thin wrapper. Calls rely on the
 * same session cookie + CSRF double-submit used by the main Vite app.
 *
 * LIVE-UPDATE EXTENSION (this commit):
 *
 * The Groups card in the main Vite app (web/src/app/views/GroupsView)
 * needs to reflect the publish outcome the instant the POST resolves,
 * plus the eventual drift reconciler's actual_privacy update. The
 * following surface additions ship in this file:
 *
 *  1. PublishYouTubeEditorSessionResponse gains three fields so the
 *     optimistic update target is satisfied without a follow-up GET:
 *       - status                  (the editor_session.status field)
 *       - actual_privacy          (what YouTube confirms)
 *       - youtube_sync_status     (confirmed/drift/pending/failed)
 *     These three are exactly the user-spec'd "payload di ritorno".
 *     The InstaeditLogin backend's executePublishYouTubeEditorSession
 *     already stamps them; the BFF just forwards them to the SPA.
 *
 *  2. getEditorSessionByProject(veloxProjectId) — GET wrapper for
 *     InstaeditLogin's GET /by-project/{id} endpoint. Used by the
 *     short-poll fallback + the BroadcastChannel listener.
 *
 *  3. pollEditorSessionUntilConfirmed(veloxProjectId, opts) — short
 *     polling helper (5s cadence, 30s cap, stops early when
 *     status=published + youtube_sync_status=confirmed). The
 *     publish-success path uses this immediately to track the
 *     drift reconciler without an SSE endpoint.
 *
 *  4. publishBroadcast() — fires a `BroadcastChannel('instaedit-publish')`
 *     event so the main Vite app's Groups card can apply the
 *     optimistic update synchronously without polling. Same-origin
 *     same-browser only; cross-tab within the same InstaEdit domain.
 */

const BFF_BASE = ''; // same-origin; production deployments should host the editor under the BFF domain

/** Read a cookie by name. */
function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = name + '=';
  const entries = document.cookie.split(';');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return '';
}

/** CSRF-aware JSON fetch. */
async function bffFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
    if (!headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const url = `${BFF_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string; reason?: string };
      if (body?.error && typeof body.error === 'string') message = body.error;
      else if (body?.reason && typeof body.reason === 'string') message = body.reason;
    } catch {
      // ignore
    }
    throw new Error(message ?? response.statusText ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export interface BffUser {
  id: number;
  name: string;
  email?: string;
  workspace_id: number;
  is_admin?: boolean;
}

export function getMe(): Promise<{ user: BffUser }> {
  return bffFetch('/api/v1/auth/me');
}

// ------------------------------------------------------------------
// Social destinations (generic, platform-agnostic)
// ------------------------------------------------------------------

export interface SocialDestination {
  external_destination_id: string;
  label?: string;
  provider?: string;
  status: 'active' | 'disabled' | 'reauth_required';
  platform_account_id: number;
  workspace_id: number;
  source_system?: string;
  defaults?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export function listSocialDestinations(
  workspaceId: number
): Promise<{ destinations: SocialDestination[] }> {
  return bffFetch(
    `/api/v1/integrations/velox/destinations?workspace_id=${encodeURIComponent(workspaceId)}`
  );
}

// ------------------------------------------------------------------
// Velox projects/jobs — the dark editor only passes the opaque
// external_destination_id; no platform credentials ever leave InstaEdit.
// ------------------------------------------------------------------

export interface VeloxProject {
  id: string;
  name: string;
  workspaceId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createVeloxProject(body: { name: string; templateId?: string }): Promise<VeloxProject> {
  return bffPost('/api/v1/projects', body);
}

export interface VeloxJob {
  id: string;
  projectId?: string;
  renderStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVeloxJobRequest {
  projectId: string;
  renderSpec: Record<string, unknown>;
  deliveryPlan: {
    destinations: Array<{
      externalDestinationId: string;
      metadata?: Record<string, unknown>;
    }>;
  };
}

export function createVeloxJob(body: CreateVeloxJobRequest): Promise<VeloxJob> {
  return bffPost('/api/v1/velox/jobs', {
    project_id: body.projectId,
    render_spec: body.renderSpec,
    delivery_plan: {
      destinations: body.deliveryPlan.destinations.map(d => ({
        external_destination_id: d.externalDestinationId,
        metadata: d.metadata,
      })),
    },
  });
}

// ------------------------------------------------------------------
// Media upload (used by the dark editor to store thumbnails in
// InstaEdit before publishing them to YouTube)
// ------------------------------------------------------------------

async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface PresignMediaResponse {
  asset_id: string;
  upload_url: string;
  upload_method: string;
  upload_headers: Record<string, string>;
}

export async function uploadMediaAsset(blob: Blob, filename: string): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(blob.type)) {
    throw new Error('Unsupported thumbnail format. Only JPEG and PNG are allowed.');
  }
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error('Thumbnail exceeds 2 MB limit.');
  }

  const presign = await bffFetch<PresignMediaResponse>('/api/v1/media/presign', {
    method: 'POST',
    body: JSON.stringify({
      filename,
      content_type: blob.type,
      size_bytes: blob.size,
      sha256: await sha256Hex(blob),
    }),
  });

  const putRes = await fetch(presign.upload_url, {
    method: presign.upload_method || 'PUT',
    headers: { 'Content-Type': blob.type, ...(presign.upload_headers || {}) },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Storage upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  const completed = await bffFetch<{ id: string }>(`/api/v1/media/${presign.asset_id}/complete`, {
    method: 'POST',
  });
  return completed.id;
}

export async function updateEditorSessionThumbnail(
  veloxProjectId: string,
  thumbnailMediaId: string
): Promise<void> {
  await bffFetch(`/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ thumbnail_media_id: thumbnailMediaId }),
  });
}

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

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_ATTEMPTS = 6; // 6 × 5s = 30s total cap.

export type PollResultStatus = 'confirmed' | 'timeout';

export interface PollResult {
  /** Final status of the polling loop. */
  status: PollResultStatus;
  /** Number of attempts performed (1..POLL_MAX_ATTEMPTS). */
  attempts: number;
  /** The last observed EditorSessionDetail. May differ from the
   *  initial optimistic POST response if the reconciler fired. */
  detail: EditorSessionDetail;
  /** Resolves with detail + 'confirmed' when the early-stop condition
   *  hit; resolves with detail + 'timeout' after POLL_MAX_ATTEMPTS. */
}

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
// Cross-SPA BroadcastChannel — publish-success instant card update
// ------------------------------------------------------------------

/**
 * PUBLISH_CHANNEL_NAME — the BroadcastChannel name both the dark
 * editor (publisher) and the main Vite app (listener) MUST use.
 *
 * IMPORTANT: keep the name stable — a rename breaks the cross-SPA
 * contract. Documented in web/src/lib/broadcast/publishChannel.ts
 * (the listener side declares the same constant).
 */
export const PUBLISH_CHANNEL_NAME = 'instaedit-publish';

export interface PublishBroadcastPayload {
  /** 'published' after the publish orchestrator stamps. */
  status: string;
  /** YouTube-confirmed privacy at the moment of publish. */
  actual_privacy: string;
  /** Lifecycle marker (confirmed/drift/pending/failed). */
  youtube_sync_status: string;
  /** The editor session id this update applies to. The listener
   *  uses this to locate the cache entry to mutate. */
  youtube_video_id: string;
  /** velox_project_id for cross-tab debugging. */
  velox_project_id: string;
  /** ISO-8601 stamp for the listener to ignore stale events. */
  emitted_at: string;
}

/**
 * publishBroadcast — fire a BroadcastChannel event so the main Vite
 * app's Groups card can apply the optimistic update synchronously
 * without polling.
 *
 * Defensive in headless/test environments: if BroadcastChannel is
 * undefined (Node, Vitest, JSDOM without polyfill), this is a no-op.
 * The POST response payload is the authoritative source of truth —
 * the broadcast is purely an optimization for the cross-tab UX.
 */
export function publishBroadcast(payload: Omit<PublishBroadcastPayload, 'emitted_at'>): void {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }
  try {
    const channel = new BroadcastChannel(PUBLISH_CHANNEL_NAME);
    const full: PublishBroadcastPayload = {
      ...payload,
      emitted_at: new Date().toISOString(),
    };
    channel.postMessage(full);
    // Immediately close — keep the channel pool clean across many
    // publishes. The browser costs ~zero resources for a no-listener
    // channel; the close is purely hygiene.
    channel.close();
  } catch {
    // Defensive: BroadcastChannel can throw on some browsers when
    // permissions for cross-origin frames are missing. The main
    // SPA still has its 10s polling fallback.
  }
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
  /** ISO-8601 UTC timestamp. Only sent when scheduling; null/absent = publish immediately. */
  publish_at?: string | null;
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

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function bffPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return bffFetch<T>(endpoint, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
