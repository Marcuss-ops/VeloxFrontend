import { fetchJSON, fetchVoid } from './core';

export interface YouTubeAccountToken {
  id: string;
  token: string;
  refresh_token: string;
  token_uri: string;
  client_id: string;
  client_secret: string;
  scopes: string[];
  universe_domain: string;
  account: string;
  expiry: string;
  channel_title: string;
  channel_id: string;
  label: string;
  thumbnail_url: string;
}

export interface YouTubeChannelGroup {
  created_at: string;
  channels: Array<{
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    notes: string | null;
    added_at: string;
    keywords: string[];
  }>;
}

export const youtubeAccountsApi = {
  /** List all connected YouTube accounts (tokens) */
  list: () =>
    fetchJSON<{ accounts: YouTubeAccountToken[]; total: number }>('/api/youtube/accounts'),

  /** Get a specific account */
  get: (accountId: string) =>
    fetchJSON<{ account: YouTubeAccountToken }>(`/api/youtube/accounts/${accountId}`),

  /** Refresh account token */
  refresh: (accountId: string) =>
    fetchJSON<{ ok: boolean; account: YouTubeAccountToken }>(`/api/youtube/accounts/${accountId}/refresh`, {
      method: 'POST',
    }),

  /** Delete an account */
  delete: (accountId: string) =>
    fetchVoid(`/api/youtube/accounts/${accountId}`, { method: 'DELETE' }),

  /** Get channel groups */
  groups: () =>
    fetchJSON<{ groups: Record<string, YouTubeChannelGroup> }>('/api/youtube/groups'),

  /** Create a new group */
  createGroup: (name: string) =>
    fetchJSON<{ ok: boolean; group: YouTubeChannelGroup }>(`/api/youtube/groups`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Delete a group */
  deleteGroup: (name: string) =>
    fetchVoid(`/api/youtube/groups/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /** Add channel to group */
  addChannelToGroup: (groupName: string, channelData: { url: string; title?: string; thumbnail?: string; notes?: string }) =>
    fetchJSON<{ ok: boolean; channel: YouTubeChannelGroup['channels'][0] }>(`/api/youtube/groups/${encodeURIComponent(groupName)}/channels`, {
      method: 'POST',
      body: JSON.stringify(channelData),
    }),

  /** Remove channel from group */
  removeChannelFromGroup: (groupName: string, channelId: string) =>
    fetchVoid(`/api/youtube/groups/${encodeURIComponent(groupName)}/channels/${channelId}`, { method: 'DELETE' }),
};
