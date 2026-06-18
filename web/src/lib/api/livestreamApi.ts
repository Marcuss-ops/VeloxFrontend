import { fetchJSON, fetchVoid, ApiError } from './core';

export type LivestreamLatencyPreference = 'normal' | 'low' | 'ultraLow';
export type LivestreamStatus = 'created' | 'testing' | 'live' | 'complete' | 'revoked';
export type LivestreamHealthStatus = 'good' | 'ok' | 'bad' | 'error';
export type LivestreamProtocol = 'rtmp' | 'hls';

export interface LivestreamHealth {
  status: LivestreamHealthStatus;
  bitrate: number;
  framerate: number;
  resolution: string;
  packets_lost?: number;
  message?: string;
}

export interface Livestream {
  id: string;
  name: string;
  thumbnail?: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
  status: LivestreamStatus;
  health?: LivestreamHealth;
  stream_url: string;
  stream_key: string;
  description?: string;
  is_for_kids: boolean;
  latency_preference: LivestreamLatencyPreference;
  protocol: LivestreamProtocol;
  auto_start: boolean;
  auto_stop: boolean;
  video_bitrate: number;
  audio_bitrate: number;
  stream_type: 'video' | 'image';
  video_order: 'loop' | 'shuffle';
  audio_order: 'loop' | 'shuffle';
  main_channel_volume: number;
  secondary_channel_volume: number;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  viewers: number;
  max_viewers: number;
  duration: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface LivestreamConfig {
  name: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
  stream_key: string;
  stream_url: string;
  description?: string;
  is_for_kids?: boolean;
  video_bitrate?: number;
  audio_bitrate?: number;
  stream_type?: 'video' | 'image';
  video_order?: 'loop' | 'shuffle';
  audio_order?: 'loop' | 'shuffle';
  main_channel_volume?: number;
  secondary_channel_volume?: number;
  latency_preference?: LivestreamLatencyPreference;
  protocol?: LivestreamProtocol;
  auto_start?: boolean;
  auto_stop?: boolean;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
}

export interface LivestreamStatusResponse {
  active: boolean;
  status: LivestreamStatus;
  duration?: string;
  current_video?: string;
  viewers?: number;
  health?: LivestreamHealth;
}

export const livestreamApi = {
  /** List all livestreams */
  list: () =>
    fetchJSON<{ streams: Livestream[]; total: number }>('/api/v1/livestream'),

  /** Get a specific livestream */
  get: (streamId: string) =>
    fetchJSON<{ stream: Livestream }>(`/api/v1/livestream/${streamId}`),

  /** Create a new livestream */
  create: (config: LivestreamConfig) =>
    fetchJSON<{ ok: boolean; stream: Livestream }>('/api/v1/livestream', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  /** Update a livestream */
  update: (streamId: string, config: Partial<LivestreamConfig>) =>
    fetchJSON<{ ok: boolean; stream: Livestream }>(`/api/v1/livestream/${streamId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  /** Delete a livestream */
  delete: (streamId: string) =>
    fetchVoid(`/api/v1/livestream/${streamId}`, { method: 'DELETE' }),

  /** Get livestream status */
  status: (streamId?: string) =>
    fetchJSON<LivestreamStatusResponse>(`/api/v1/livestream/status${streamId ? `?stream_id=${streamId}` : ''}`),

  /** Get livestream health */
  health: (streamId: string) =>
    fetchJSON<{ health: LivestreamHealth }>(`/api/v1/livestream/${streamId}/health`),

  // ============================================
  // Lifecycle Transitions
  // ============================================

  /** Start testing (preview mode) */
  startTesting: (streamId: string) =>
    fetchJSON<{ ok: boolean; status: LivestreamStatus }>(`/api/v1/livestream/${streamId}/testing`, {
      method: 'POST',
    }),

  /** Go live (from testing) */
  goLive: (streamId: string) =>
    fetchJSON<{ ok: boolean; status: LivestreamStatus }>(`/api/v1/livestream/${streamId}/live`, {
      method: 'POST',
    }),

  /** End stream (complete) */
  endStream: (streamId: string) =>
    fetchJSON<{ ok: boolean; status: LivestreamStatus }>(`/api/v1/livestream/${streamId}/complete`, {
      method: 'POST',
    }),

  /** Generic transition (testing, live, complete) */
  transition: (streamId: string, action: 'testing' | 'live' | 'complete') =>
    fetchJSON<{ ok: boolean; status: LivestreamStatus }>(`/api/v1/livestream/${streamId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // ============================================
  // Video Management
  // ============================================

  /** Add video to livestream playlist */
  addVideo: (streamId: string, videoData: { file?: File; drive_id?: string; duration?: number }) => {
    if (videoData.file) {
      const formData = new FormData();
      formData.append('video', videoData.file);
      if (videoData.duration) formData.append('duration', String(videoData.duration));

      return fetch(`/api/v1/livestream/${streamId}/videos`, {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new ApiError(res.status, res.statusText);
        return res.json() as Promise<{ ok: boolean; video_id: string }>;
      });
    }

    return fetchJSON<{ ok: boolean; video_id: string }>(`/api/v1/livestream/${streamId}/videos`, {
      method: 'POST',
      body: JSON.stringify({ drive_id: videoData.drive_id, duration: videoData.duration }),
    });
  },

  /** Remove video from playlist */
  removeVideo: (streamId: string, videoId: string) =>
    fetchVoid(`/api/v1/livestream/${streamId}/videos/${videoId}`, { method: 'DELETE' }),

  /** Reorder playlist */
  reorderPlaylist: (streamId: string, videoIds: string[]) =>
    fetchJSON<{ ok: boolean }>(`/api/v1/livestream/${streamId}/playlist/reorder`, {
      method: 'POST',
      body: JSON.stringify({ video_ids: videoIds }),
    }),

  /** Get playlist */
  getPlaylist: (streamId: string) =>
    fetchJSON<{ videos: Array<{ id: string; name: string; duration: number; thumbnail?: string }> }>(`/api/v1/livestream/${streamId}/playlist`),

  // ============================================
  // Statistics & Monitoring
  // ============================================

  /** Get stream statistics */
  getStats: (streamId: string) =>
    fetchJSON<{ viewers: number; max_viewers: number; duration: number; started_at?: string }>(`/api/v1/livestream/${streamId}/stats`),

  /** Get stream logs */
  getLogs: (streamId: string, lines = 100) =>
    fetchJSON<{ logs: string[] }>(`/api/v1/livestream/${streamId}/logs?lines=${lines}`),
};
