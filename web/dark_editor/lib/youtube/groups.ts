import { fetchJSON, fetchVoid } from './client';
import type { YouTubeGroup, YouTubeVideo } from './types';

const BASE = '/dark_editor_v2/api/v1/youtube';

export interface GroupsListResponse {
  ok: boolean;
  groups: YouTubeGroup[];
  count: number;
}

export async function listGroups(): Promise<YouTubeGroup[]> {
  const data = await fetchJSON<GroupsListResponse>(`${BASE}/groups`);
  return data.groups ?? [];
}

export async function createGroup(name: string): Promise<unknown> {
  return fetchJSON(`${BASE}/groups`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteGroup(name: string): Promise<void> {
  return fetchVoid(`${BASE}/groups/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export async function addChannelToGroup(
  group: string,
  channelId: string,
  data?: { url?: string; title?: string; thumbnail?: string }
): Promise<unknown> {
  return fetchJSON(`${BASE}/groups/${encodeURIComponent(group)}/channels`, {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, ...data }),
  });
}

export async function removeChannelFromGroup(group: string, channelId: string): Promise<void> {
  return fetchVoid(
    `${BASE}/groups/${encodeURIComponent(group)}/channels/${encodeURIComponent(channelId)}`,
    { method: 'DELETE' }
  );
}

export interface GroupFeedResponse {
  ok?: boolean;
  videos?: YouTubeVideo[];
  [key: string]: unknown;
}

export type GroupFeedPayload = YouTubeVideo[] | GroupFeedResponse;

export function getGroupFeed(
  groupName: string,
  sortBy: 'date' | 'views' | 'title' = 'date',
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all' = '7d'
): Promise<GroupFeedPayload> {
  return fetchJSON<GroupFeedPayload>(
    `${BASE}/manager/feed?sort_by=${sortBy}&time_range=${timeRange}&group_name=${encodeURIComponent(groupName)}`
  );
}

export interface GroupPrivateVideosResponse {
  ok: boolean;
  videos: YouTubeVideo[];
  count: number;
  group: string;
  days?: number;
}

export async function getGroupPrivateVideos(
  groupName: string,
  refresh = false,
  days = 90
): Promise<GroupPrivateVideosResponse> {
  const query = `group_name=${encodeURIComponent(groupName)}&days=${days}${refresh ? '&refresh=true' : ''}`;
  return fetchJSON<GroupPrivateVideosResponse>(
    `${BASE}/group-private-videos?${query}`
  );
}
