// Shared BFF interface types + helpers for the InstaEditor.
//
// LEAF module of the lib/api/bff/ subtree. ZERO outbound imports.
// Every other bff/<X>.ts module (auth, youtube, projects, upload,
// socialDestinations, broadcast) imports from here, so the DAG is
// strictly bottom-up acyclic:
//
//                          bff.ts (barrel)
//                                |
//     +----------+-----+---------+---------+---------+---------+
//     |          |     |         |         |         |         |
//    auth    youtube  projects  upload  socialD  broadcast
//     |          |     |         |         |         |
//     +----------+-----+---------+---------+---------+---------+
//                                |
//                             types.ts   (this file)
//
// Originally a single 578-LOC monolith at lib/api/bff.ts; extracted
// here first because type-only consumers (the components/ folder
// + the main Vite SPA's useJobDeliveries hook) need just the shape
// contract without dragging the CSRF fetch helper in.

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
// (PUBLISH_CHANNEL_NAME + PublishBroadcastPayload + publishBroadcast
// — extracted in commit 7 of the api-bff refactor series).
// ------------------------------------------------------------------

// ------------------------------------------------------------------
import { editorAuthorizationHeaders } from '../../editor-session';
import { editorRuntimePath } from '../../editor-runtime';

// Shared HTTP infrastructure (BFF base + CSRF-aware fetch)
// ------------------------------------------------------------------

/** Same-origin; production deployments should host the editor under the BFF domain. */
export const BFF_BASE = '';

/** Read a cookie by name. Returns '' outside the DOM (Node / Vitest). */
export function getCookie(name: string): string {
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

/** CSRF-aware JSON fetch. Honours same-origin session cookie + CSRF double-submit. */
export async function bffFetch<T>(
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

  const url = editorRuntimePath(`${BFF_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`);
  const authorization = await editorAuthorizationHeaders();
  const response = await fetch(url, {
    ...options,
    method,
    headers: { ...headers, ...authorization },
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

/** POST helper. Thin wrapper that picks up CSRF + Content-Type from bffFetch. */
export function bffPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return bffFetch<T>(endpoint, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** SHA-256 hash of a Blob as lowercase hex (used by upload-presign). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ------------------------------------------------------------------
// Poll timing constants (used by pollEditorSessionUntilConfirmed)
// ------------------------------------------------------------------

/** 5-second cadence for the post-publish short-poll loop. */
export const POLL_INTERVAL_MS = 5_000;

/** 6 × 5s = 30-second total cap on the drift-reconciler wait. */
export const POLL_MAX_ATTEMPTS = 6;
