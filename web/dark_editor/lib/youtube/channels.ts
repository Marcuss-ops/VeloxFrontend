import { fetchJSON } from './client';
import type { YouTubeChannel } from './types';

const BASE = '/dark_editor_v2/api/v1/youtube';

export interface ChannelsListResponse {
  ok: boolean;
  channels: YouTubeChannel[];
  count: number;
}

export async function listChannels(validate = false): Promise<YouTubeChannel[]> {
  const data = await fetchJSON<ChannelsListResponse>(
    `${BASE}/channels?validate_tokens=${validate}`
  );
  return data.channels ?? [];
}

export async function getChannel(channelId: string): Promise<unknown> {
  return fetchJSON(`${BASE}/channels/${encodeURIComponent(channelId)}`);
}

export interface TokenValidationResponse {
  ok: boolean;
  valid: boolean;
  channel_id: string;
  expires_at?: string;
  error?: string;
}

export async function validateToken(channelId: string): Promise<TokenValidationResponse> {
  return fetchJSON<TokenValidationResponse>(
    `${BASE}/channels/${encodeURIComponent(channelId)}/validate`
  );
}
