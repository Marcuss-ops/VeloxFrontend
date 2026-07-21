/**
 * Social API — wrappers for the InstaEdit BFF social endpoints.
 *
 * These replace the legacy youtubeApi.ts direct calls to
 * /api/v1/youtube/* with the destination-based model: the frontend
 * creates an opaque external_destination_id via the BFF, and Velox
 * resolves it to the actual platform account + OAuth token at
 * publish time. The browser never sees tokens, channel_ids, or
 * platform credentials.
 */

import { apiGet, apiPost, apiDelete } from './client';

/** A Velox destination linking a workspace to a platform account. */
export interface VeloxDestination {
  externalDestinationId: string;
  status: 'active' | 'disabled';
  platformAccountId: number;
  workspaceId: number;
  defaults?: Record<string, unknown>;
}

/** Body for POST /api/v1/integrations/velox/destinations. */
export interface CreateDestinationRequest {
  workspaceId: number;
  platformAccountId: number;
  defaults?: Record<string, unknown>;
}

/** Response from creating a destination. */
export interface CreateDestinationResponse {
  externalDestinationId: string;
  status: string;
}

/** A platform account (YouTube channel, Instagram, etc.). */
export interface PlatformAccount {
  id: number;
  platform: string;
  username?: string;
  status: string;
  reauthRequired?: boolean;
}

/** List Velox destinations for the current workspace. */
export function listDestinations(): Promise<{ destinations: VeloxDestination[] }> {
  return apiGet('/api/v1/integrations/velox/destinations');
}

/** Get a single destination by its opaque id. */
export function getDestination(id: string): Promise<VeloxDestination> {
  return apiGet(`/api/v1/integrations/velox/destinations/${encodeURIComponent(id)}`);
}

/** Create a new destination linking a workspace to a platform account. */
export function createDestination(
  body: CreateDestinationRequest
): Promise<CreateDestinationResponse> {
  return apiPost('/api/v1/integrations/velox/destinations', body);
}

/** Delete (soft-disable) a destination by its opaque id. */
export function deleteDestination(id: string): Promise<void> {
  return apiDelete(`/api/v1/integrations/velox/destinations/${encodeURIComponent(id)}`);
}

/** List the current user's platform accounts (optionally filtered). */
export function listAccounts(platform?: string): Promise<{ accounts: PlatformAccount[] }> {
  const query = platform ? `?platform=${encodeURIComponent(platform)}` : '';
  return apiGet(`/api/v1/accounts${query}`);
}

export const socialApi = {
  listDestinations,
  getDestination,
  createDestination,
  deleteDestination,
  listAccounts,
};
