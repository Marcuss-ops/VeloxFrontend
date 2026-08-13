// Shared BFF wire-type contract for the InstaEditor.
//
// PURE TYPE module — zero imports, zero runtime code. The shared HTTP
// infrastructure (bffFetch / bffPost / getCookie / BFF_BASE / sha256Hex /
// POLL_* constants) lives in lib/api/bff/client.ts. Every other bff/<X>.ts
// module (auth, youtube, projects, upload, socialDestinations, broadcast)
// imports the wire types from here, so the DAG is strictly bottom-up:
//
//                          bff.ts (barrel)
//                                |
//     +----------+-----+---------+---------+---------+---------+
//     |          |     |         |         |         |         |
//    auth    youtube  projects  upload  socialD  broadcast
//     |          |     |         |         |         |
//     +----------+-----+---------+---------+---------+---------+
//                     |                    |
//                  types.ts            client.ts
//                 (this file)       (HTTP helpers)
//
// Originally a single 578-LOC monolith at lib/api/bff.ts; the type-only
// surface was extracted here so consumers can import the shape contract
// without dragging in the CSRF fetch helper.

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

// ------------------------------------------------------------------
// Velox projects / jobs
// (the InstaEditor only passes the opaque external_destination_id;
//  no platform credentials ever leave InstaEdit)
// ------------------------------------------------------------------

export interface VeloxProject {
  id: string;
  name: string;
  workspaceId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
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

// ------------------------------------------------------------------
// Media upload (thumbnails stored in InstaEdit before publishing)
// ------------------------------------------------------------------

export interface PresignMediaResponse {
  asset_id: string;
  upload_url: string;
  upload_method: string;
  upload_headers: Record<string, string>;
}

// ------------------------------------------------------------------
// YouTube publish + draft auto-save + session-detail read
// ------------------------------------------------------------------

export interface YouTubeTranslation {
  title: string;
  description: string;
}

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
  // Live-update additions: see LIVE-UPDATE EXTENSION comment that
  //   used to live at the top of lib/api/bff.ts before this commit.
  /** Editor session status at the moment the publish orchestrator
   *  stamps the row. Always 'published' on a successful POST. */
  status: string;
  /** YouTube-confirmed privacy after the videos.list read-back. */
  actual_privacy: string;
  /** Lifecycle marker for the drift reconciler (confirmed/drift/pending/failed). */
  youtube_sync_status: string;
}

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
  /** ISO-8601 UTC timestamp echoed from the draft. null when no scheduling is set. */
  draft_publish_at: string | null;
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

// ------------------------------------------------------------------
// Cross-SPA BroadcastChannel payload lives in lib/api/bff/broadcast.ts
// (PUBLISH_CHANNEL_NAME + PublishBroadcastPayload + publishBroadcast).
// ------------------------------------------------------------------
