// ------------------------------------------------------------------
// Social destinations — generic, platform-agnostic list used by the
// dark editor to render the workspace's connected accounts (YouTube
// and other future platforms).
//
// Lives in lib/api/bff/socialDestinations.ts (commit 6 of the api-bff
// refactor series; the LAST remaining inline domain in bff.ts).
// Re-exported at lib/api/bff.ts (the barrel) so legacy `@/lib/api/bff`
// callers (useSocialDestinations hook) keep working without
// import-path churn.
//
// `SocialDestination` is also declared in lib/api/bff/types.ts as
// the canonical wire-level contract; this file's local copy mirrors
// the same shape per the established auth.ts pattern (BffUser is
// defined in both types.ts and bff/auth.ts). TypeScript structural
// typing keeps them compatible at every call site. A future cleanup
// commit can collapse the duplicate when the wider type consolidation
// lands.
// ------------------------------------------------------------------

import { bffFetch } from './types';

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
 * dark editor only needs the opaque external_destination_id + the
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