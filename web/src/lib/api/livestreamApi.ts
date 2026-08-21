import { fetchJSON, fetchVoid } from './core';

export type LivestreamState =
  | 'draft'
  | 'preparing'
  | 'ready'
  | 'scheduled'
  | 'starting'
  | 'waiting_for_ingest'
  | 'testing'
  | 'live'
  | 'degraded'
  | 'reconnecting'
  | 'stopping'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type LivestreamPrivacy = 'private' | 'unlisted' | 'public';
export type LivestreamPlaybackMode = 'loop_continuous' | 'play_once';
export type LivestreamScheduleType = 'manual' | 'now' | 'scheduled' | 'recurring';
export type LivestreamLatencyPreference = 'normal' | 'low' | 'ultraLow';

/** Wire shape returned by InstaeditLogin/pkg/api/livestreams_types.go. */
export interface Livestream {
  id: string;
  workspace_id: number;
  platform_account_id: number;
  channel_name: string;
  title: string;
  description: string;
  privacy_status: LivestreamPrivacy;
  playback_mode: LivestreamPlaybackMode;
  schedule_type: LivestreamScheduleType;
  scheduled_start_at?: string;
  desired_state: LivestreamState;
  actual_state: LivestreamState;
  resolution: string;
  frame_rate: number;
  auto_restart: boolean;
  category: string;
  made_for_kids: boolean;
  language: string;
  thumbnail_media_id?: string;
  dvr_enabled: boolean;
  auto_start: boolean;
  auto_stop: boolean;
  latency_preference: LivestreamLatencyPreference;
  created_at: string;
  updated_at: string;
}

/** Body accepted by POST /api/v1/livestreams. */
export interface LivestreamConfig {
  workspace_id: number;
  platform_account_id: number;
  title: string;
  description?: string;
  privacy_status: LivestreamPrivacy;
  playback_mode: LivestreamPlaybackMode;
  schedule_type: LivestreamScheduleType;
  scheduled_start_at?: string;
  resolution?: string;
  frame_rate?: number;
  auto_restart?: boolean;
  category?: string;
  made_for_kids?: boolean;
  language?: string;
  thumbnail_media_id?: string;
  dvr_enabled?: boolean;
  auto_start?: boolean;
  auto_stop?: boolean;
  latency_preference?: LivestreamLatencyPreference;
}

export interface LivestreamPatch extends Partial<Omit<LivestreamConfig, 'workspace_id' | 'platform_account_id'>> {
  /** Empty string clears the scheduled start time or thumbnail. */
  scheduled_start_at?: string;
  thumbnail_media_id?: string;
}

export interface LivestreamChannel {
  platform_account_id: number;
  username: string;
  platform_user_id: string;
  account_state: string;
  oauth_ready: boolean;
  live_enabled: boolean;
  last_verified_at?: string;
  active_lives: number;
}

export interface LivestreamListResponse {
  items: Livestream[];
  next_cursor?: string;
  has_more: boolean;
}

export interface LivestreamChannelsResponse {
  channels: LivestreamChannel[];
}

export interface LivestreamListOptions {
  cursor?: string;
  limit?: number;
}

export const livestreamApi = {
  /** GET /api/v1/livestreams?workspace_id=N */
  list: (workspaceId: number, options: LivestreamListOptions = {}) => {
    const params = new URLSearchParams({ workspace_id: String(workspaceId) });
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    return fetchJSON<LivestreamListResponse>(`/api/v1/livestreams?${params.toString()}`);
  },

  /** GET /api/v1/livestreams/channels?workspace_id=N */
  listChannels: (workspaceId: number) =>
    fetchJSON<LivestreamChannelsResponse>(`/api/v1/livestreams/channels?workspace_id=${encodeURIComponent(String(workspaceId))}`),

  /** GET /api/v1/livestreams/{id} */
  get: (streamId: string) =>
    fetchJSON<Livestream>(`/api/v1/livestreams/${encodeURIComponent(streamId)}`),

  /** POST /api/v1/livestreams */
  create: (config: LivestreamConfig) =>
    fetchJSON<Livestream>('/api/v1/livestreams', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  /** PATCH /api/v1/livestreams/{id} */
  update: (streamId: string, config: LivestreamPatch) =>
    fetchJSON<Livestream>(`/api/v1/livestreams/${encodeURIComponent(streamId)}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    }),

  /** DELETE /api/v1/livestreams/{id} */
  delete: (streamId: string) =>
    fetchVoid(`/api/v1/livestreams/${encodeURIComponent(streamId)}`, { method: 'DELETE' }),
};
