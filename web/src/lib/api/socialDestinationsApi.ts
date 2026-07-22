/**
 * Social destinations API — generic, social-agnostic wrappers for the
 * InstaEdit BFF /api/v1/integrations/velox/destinations endpoints.
 *
 * DESIGN:
 * - VeloxFrontend never sees OAuth tokens, channel_ids, or platform
 *   credentials. It only manipulates the opaque external_destination_id.
 * - Provider/label are optional UI metadata; the canonical wire fields
 *   are the ones returned by the BFF (external_destination_id, status,
 *   platform_account_id, source_system, defaults).
 * - All identifiers and payloads use snake_case to match the BFF contract.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './client';

/** Generic social destination as returned by the BFF. */
export interface SocialDestination {
  /** Opaque ID that Velox receives in the delivery plan. */
  external_destination_id: string;
  /** Human-readable label (derived from the linked platform account). */
  label?: string;
  /** Social provider key (e.g. youtube, instagram, tiktok, linkedin). */
  provider?: string;
  /** Lifecycle status of the destination. */
  status: 'active' | 'disabled' | 'reauth_required';
  /** Underlying platform account id in InstaEdit. */
  platform_account_id: number;
  /** Workspace that owns this destination (returned by the BFF for owner verification). */
  workspace_id?: number;
  /** Source system tag (always "velox" for the Velox integration). */
  source_system?: string;
  /** Default publish metadata (privacy_status, language, tags, etc.). */
  defaults?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Body for POST /api/v1/integrations/velox/destinations. */
export interface CreateSocialDestinationRequest {
  workspace_id: number;
  platform_account_id: number;
  defaults?: Record<string, unknown>;
}

/** Body for PATCH /api/v1/integrations/velox/destinations/{id}. */
export interface UpdateSocialDestinationRequest {
  defaults?: Record<string, unknown>;
}

/** List destinations for the given workspace. */
export function listSocialDestinations(
  workspaceId: number
): Promise<{ destinations: SocialDestination[] }> {
  return apiGet(
    `/api/v1/integrations/velox/destinations?workspace_id=${encodeURIComponent(workspaceId)}`
  );
}

/** Get a single destination by its opaque id. */
export function getSocialDestination(id: string): Promise<SocialDestination> {
  return apiGet(`/api/v1/integrations/velox/destinations/${encodeURIComponent(id)}`);
}

/** Create a new destination linking a workspace to a platform account. */
export function createSocialDestination(
  body: CreateSocialDestinationRequest
): Promise<{ external_destination_id: string; status: string }> {
  return apiPost('/api/v1/integrations/velox/destinations', body);
}

/** Update default metadata for a destination. */
export function updateSocialDestination(
  id: string,
  body: UpdateSocialDestinationRequest
): Promise<SocialDestination> {
  return apiPatch(`/api/v1/integrations/velox/destinations/${encodeURIComponent(id)}`, body);
}

/** Delete (hard-remove) a destination by its opaque id. */
export function deleteSocialDestination(id: string): Promise<void> {
  return apiDelete(`/api/v1/integrations/velox/destinations/${encodeURIComponent(id)}`);
}

export const socialDestinationsApi = {
  list: listSocialDestinations,
  get: getSocialDestination,
  create: createSocialDestination,
  update: updateSocialDestination,
  delete: deleteSocialDestination,
};
