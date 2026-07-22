/**
 * Accounts API — wrappers for the InstaEdit BFF platform account endpoints.
 *
 * Destination management lives in socialDestinationsApi.ts so this
 * module stays focused on platform accounts only. The browser never
 * sees OAuth tokens, channel_ids, or platform credentials.
 */

import { apiGet } from './client';

/** A platform account (YouTube channel, Instagram, etc.). */
export interface PlatformAccount {
  id: number;
  platform: string;
  username?: string;
  status: string;
  reauthRequired?: boolean;
}

/** List the current user's platform accounts (optionally filtered). */
export function listAccounts(platform?: string): Promise<{ accounts: PlatformAccount[] }> {
  const query = platform ? `?platform=${encodeURIComponent(platform)}` : '';
  return apiGet(`/api/v1/accounts${query}`);
}

export const accountsApi = {
  listAccounts,
};
