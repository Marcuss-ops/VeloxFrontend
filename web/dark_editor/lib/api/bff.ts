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

// bffFetch CSRF-aware JSON fetch + BFF_BASE + getCookie + bffPost +
// sha256Hex live in lib/api/bff/types.ts (POLL_INTERVAL_MS +
// POLL_MAX_ATTEMPTS also live there but are consumed inside
// lib/api/bff/youtube.ts, not below). We import the runtime helpers
// so the surviving domain functions (getMe, listSocialDestinations,
// createVeloxProject, createVeloxJob, uploadMediaAsset,
// updateEditorSessionThumbnail, publishBroadcast) still reach them.
// `export` statements near the bottom forward them to any
// `@/lib/api/bff` caller so the public API surface is unchanged.
import {
  BFF_BASE,
  bffFetch,
  bffPost,
  getCookie,
  sha256Hex,
} from './bff/types';
// One bff/*.ts shared type is still referenced from the domain
// function living below (publishBroadcast takes
// Omit<PublishBroadcastPayload, 'emitted_at'> and constructs a
// PublishBroadcastPayload in its body). We import it via
// `import type` so the compile-time contract stays intact — same
// TS2304 hygiene lesson learned in the api.ts refactor.
import type { PublishBroadcastPayload } from './bff/types';

// ------------------------------------------------------------------
// Auth section lives in lib/api/bff/auth.ts (commit 2). The legacy
// `@/lib/api/bff` import surface keeps working through the wildcard
// re-export below.
// ------------------------------------------------------------------

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
// Velox projects/jobs — lib/api/bff/projects.ts (commit 4 of the
// api-bff refactor series). The dark editor only passes the opaque
// external_destination_id; no platform credentials ever leave InstaEdit.
// Re-exported below for back-compat with legacy `@/lib/api/bff`
// callers.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Media upload (used by the dark editor to store thumbnails in
// InstaEdit before publishing them to YouTube)
// ------------------------------------------------------------------

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
// Helpers (re-exports from lib/api/bff/types.ts for back-compat with
// legacy `@/lib/api/bff` callers — the helpers themselves live next
// to the wire-level type contract they ultimately serve).
// ------------------------------------------------------------------

export {
  BFF_BASE,
  getCookie,
  bffFetch,
  bffPost,
  sha256Hex,
};

// ------------------------------------------------------------------
// Back-compat forwarders \u2014 commit-N re-exports of the per-domain
// modules that have already been extracted. Each one preserves the
// legacy `@/lib/api/bff` import surface for callers that haven't yet
// migrated to the per-domain sub-module path. As commits 3\u20137 land,
// the corresponding `export { ... } from './bff/<domain>'` named-re-export block gets
// added here so the pattern stays explicit and grep-able.
//
// (Eventually this whole bottom block becomes a single
// `export * from './bff'` once the per-domain folder re-exports its
// own children \u2014 see commit 9 plan.)
// ------------------------------------------------------------------

export { getMe, type BffUser } from './bff/auth';

export {
  publishEditorSession,
  getEditorSessionByProject,
  pollEditorSessionUntilConfirmed,
  saveEditorSessionDraft,
  type PublishYouTubeEditorSessionRequest,
  type PublishYouTubeEditorSessionResponse,
  type EditorSessionDetail,
  type YouTubeTranslation,
  type YouTubeEditorSessionDraftRequest,
  type YouTubeEditorSessionDraftResponse,
} from './bff/youtube';

export {
  type VeloxProject,
  type VeloxJob,
  type CreateVeloxJobRequest,
  createVeloxProject,
  createVeloxJob,
} from './bff/projects';
