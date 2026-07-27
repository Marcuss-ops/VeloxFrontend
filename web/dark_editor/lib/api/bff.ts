/**
 * Minimal BFF client for the dark editor to call the InstaEdit BFF.
 *
 * The web/src/lib/api/client.ts is Vite-specific (import.meta.env),
 * so the dark editor keeps its own thin wrapper. Calls rely on the
 * same session cookie + CSRF double-submit used by the main Vite app.
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
// Publish — P0#5 + P1 metadata. Mirrors the OpenAPI contract landed
// in commit 250a3ea on InstaeditLogin:
//   POST /api/v1/youtube/editor-sessions/by-project/{veloxProjectId}/publish
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
// Helpers
// ------------------------------------------------------------------

function bffPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return bffFetch<T>(endpoint, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
