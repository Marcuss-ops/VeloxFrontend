// Shared BFF wire-type contract for the InstaEditor.
//
// PURE TYPE module — zero imports, zero runtime code. The shared HTTP
// infrastructure (bffFetch / bffPost / getCookie / BFF_BASE / sha256Hex /
// POLL_* constants) lives in lib/api/bff/client.ts. The YouTube wire types
// (YouTubeTranslation, Publish*/EditorSessionDetail/Draft* + the PollResult
// short-poll shape) live in youtube/types.ts — the authoritative contract —
// and are re-exported by youtube.ts. This file keeps only the cross-domain
// shapes (auth, social destinations, projects/jobs, media upload) that the
// auth / projects / upload / socialDestinations modules import.
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
// Cross-SPA BroadcastChannel payload lives in lib/api/bff/broadcast.ts
// (PUBLISH_CHANNEL_NAME + PublishBroadcastPayload + publishBroadcast).
// ------------------------------------------------------------------
