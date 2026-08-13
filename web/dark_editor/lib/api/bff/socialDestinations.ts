// ------------------------------------------------------------------
// Social destinations — generic, platform-agnostic list used by the
// InstaEditor to render the workspace's connected accounts (YouTube
// and other future platforms).
//
// Lives in lib/api/bff/socialDestinations.ts (commit 6 of the api-bff
// refactor series; the LAST remaining inline domain in bff.ts).
// Re-exported at lib/api/bff.ts (the barrel) so legacy `@/lib/api/bff`
// callers (useSocialDestinations hook) keep working without
// import-path churn.
//
// `SocialDestination` is the canonical wire-level contract for this
// domain and is re-exported by the barrel bff.ts; the duplicate copy
// that used to live in lib/api/bff/types.ts has been removed.
// ------------------------------------------------------------------

import { bffFetch } from './client';

// ------------------------------------------------------------------
// Wire type
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
// GET /api/v1/integrations/velox/destinations
// ------------------------------------------------------------------

/**
 * List every social destination the workspace has connected. The
 * InstaEditor only needs the opaque external_destination_id + the
 * platform_account_id to render account pickers; the rest of the
 * fields surface in the workspace-settings UI on the main SPA.
 */
export function listSocialDestinations(
  workspaceId: number
): Promise<{ destinations: SocialDestination[] }> {
  return bffFetch(
    `/api/v1/integrations/velox/destinations?workspace_id=${encodeURIComponent(workspaceId)}`
  );
}