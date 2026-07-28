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

// All shared HTTP infrastructure (bffFetch CSRF-aware JSON fetch +
// BFF_BASE + getCookie + bffPost + sha256Hex + POLL_INTERVAL_MS +
// POLL_MAX_ATTEMPTS) lives in lib/api/bff/types.ts. All domain
// functions have been extracted to per-domain modules — re-exported
// below for back-compat with legacy `@/lib/api/bff` callers. No
// inline domain functions remain in this barrel after all 7 commits
// of the api-bff refactor series have landed.
import {
  BFF_BASE,
  bffFetch,
  bffPost,
  getCookie,
  sha256Hex,
} from './bff/types';
import {
  BFF_BASE,
  bffFetch,
  bffPost,
  getCookie,
  sha256Hex,
} from './bff/types';

// ------------------------------------------------------------------
// Auth section lives in lib/api/bff/auth.ts (commit 2). The legacy
// `@/lib/api/bff` import surface keeps working through the wildcard
// re-export below.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Social destinations (generic, platform-agnostic) — lives in
// lib/api/bff/socialDestinations.ts (commit 6 of the api-bff
// refactor series; the LAST remaining inline domain extracted from
// this barrel). Re-exported below for back-compat with legacy
// `@/lib/api/bff` callers (useSocialDestinations hook).
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Velox projects/jobs — lib/api/bff/projects.ts (commit 4 of the
// api-bff refactor series). The dark editor only passes the opaque
// external_destination_id; no platform credentials ever leave InstaEdit.
// Re-exported below for back-compat with legacy `@/lib/api/bff`
// callers.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Media upload — used by the dark editor to store thumbnails in
// InstaEdit before publishing them to YouTube. Lives in
// lib/api/bff/upload.ts (commit 5 of the api-bff refactor series).
// Re-exported below for back-compat with legacy `@/lib/api/bff`
// callers (ExportDialog).
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Cross-SPA BroadcastChannel — publish-success instant card update.
// Lives in lib/api/bff/broadcast.ts (commit 7 of the api-bff
// refactor series; the FINAL structural commit). Re-exported below
// for back-compat with legacy `@/lib/api/bff` callers.
// ------------------------------------------------------------------

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

export {
  PUBLISH_CHANNEL_NAME,
  publishBroadcast,
  type PublishBroadcastPayload,
} from './bff/broadcast';

export {
  uploadMediaAsset,
  updateEditorSessionThumbnail,
} from './bff/upload';

export {
  listSocialDestinations,
  type SocialDestination,
} from './bff/socialDestinations';
