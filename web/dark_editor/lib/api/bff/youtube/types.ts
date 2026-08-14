// YouTube wire-type contract for the InstaEditor BFF client.
//
// PURE TYPE module — zero imports, zero runtime. The runtime functions
// (publishEditorSession, getEditorSessionByProject,
// pollEditorSessionUntilConfirmed, saveEditorSessionDraft) live in the
// sibling youtube.ts and import these shapes back. youtube.ts re-exports
// them so legacy `@/lib/api/bff/youtube` type-only consumers
// (youtubePublishContract.test.ts, useBatchYouTubeTargets, youtubeGroups)
// keep resolving unchanged.

// ------------------------------------------------------------------
// YouTubeTranslation
// ------------------------------------------------------------------

export interface YouTubeTranslation {
  title: string;
  description: string;
}

// ------------------------------------------------------------------
// Publish — P0#5 + P1 metadata. Mirrors the OpenAPI contract landed
// in commit 250a3ea on InstaeditLogin.
//
// Field contract (all fields optional; the backend orchestrator
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
// The SPA ships the form values verbatim and lets the backend enforce
// bounds + idempotency; a 400 surfaces the original `data.error` string.
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

// ------------------------------------------------------------------
// Publish response. The live-update additions (status, actual_privacy,
// youtube_sync_status) ship alongside the original 4 fields so the
// InstaEdit Social SPA can apply optimistic updates without a follow-up
// GET. Backwards-compat: the original 4 fields keep their concrete
// types; the 3 new fields are always filled by the backend.
//
// `status` is the OpenAPI literal 'published' — NOT a broader string.
// This is the cross-repo contract lock asserted at compile time by
// __tests__/youtubePublishContract.test.ts (OpenAPI yaml ⇄ Go DTO ⇄ TS).
// ------------------------------------------------------------------

export interface PublishYouTubeEditorSessionResponse {
  public_url: string;
  video_id: string;
  privacy_status: string;
  published_at?: string | null;
  /** Editor session status at the moment the publish orchestrator
   *  stamps the row. Always 'published' on a successful POST — the
   *  literal union, not `string`, is the contract lock. */
  status: 'published';
  /** YouTube-confirmed privacy after the videos.list read-back.
   *  Optional: zero-value when the read-back hasn't completed (or in
   *  the curated phantom-emission path that reports status=published
   *  without a fresh poll). */
  actual_privacy?: string;
  /** Lifecycle marker for the drift reconciler (confirmed/drift/pending/failed).
   *  Optional: zero-value until the reconciler reports a final state. */
  youtube_sync_status?: string;
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
  channel_id?: string;
  source_thumbnail_url?: string;
  // Extended session contract (thumbnail_url, category_id,
  // privacy_status) — the authoritative YouTube projection the backend
  // serves from videos.list / the publish read-back. thumbnail_url
  // mirrors source_thumbnail_url under the contract's wire name;
  // category_id is stamped at session creation; privacy_status is the
  // resolved visibility (actual read-back wins, desired fallback).
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
  youtube_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// Publish draft auto-save (P2). Mirrors the publish endpoint shape,
// minus the strict validation + side-effects. Called on debounce + on-blur
// so an operator who closes the tab mid-edit can resume the same form
// state on reload.
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
// mid-edit doesn't bounce a 400 every auto-save. The server-side CAS
// predicate (status IN ('editing','failed')) refuses the row while the
// publish orchestrator owns it — surfaced as 409 to the SPA.
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

// ------------------------------------------------------------------
// Short-poll helper types (used by pollEditorSessionUntilConfirmed)
// ------------------------------------------------------------------

export type PollResultStatus = 'confirmed' | 'timeout';

export interface PollResult {
  /** Final status of the polling loop. */
  status: PollResultStatus;
  /** Number of attempts performed (1..POLL_MAX_ATTEMPTS). */
  attempts: number;
  /** The last observed EditorSessionDetail. May differ from the
   *  initial optimistic POST response if the reconciler fired. */
  detail: EditorSessionDetail;
}
