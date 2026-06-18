/**
 * YouTube API Client for Dark Editor
 * 
 * Provides access to YouTube API endpoints for:
 * - Channel management
 * - Thumbnail uploads
 * - Video metadata
 */

export interface YouTubeChannel {
  id: string;
  name: string;
  title?: string;
  thumbnail?: string;
  email?: string;
  token_valid?: boolean;
}

export interface YouTubeUploadResult {
  video_id: string;
  video_url: string;
  title: string;
  description: string;
  tags: string[];
  privacy_status: string;
  channel_id: string;
}

export interface YouTubeUploadConfig {
  channel_id: string;
  title: string;
  description?: string;
  tags?: string[];
  privacy?: 'private' | 'unlisted' | 'public';
  thumbnail_path?: string;
}

/**
 * API Error class with status code
 */
export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Make a JSON fetch request with error handling
 */
async function fetchJSON<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json() as { error?: string; reason?: string };
      if (body?.error && typeof body.error === 'string') message = body.error;
      else if (body?.reason && typeof body.reason === 'string') message = body.reason;
    } catch {
      // non-JSON or empty body
    }
    throw new ApiError(response.status, response.statusText, message);
  }

  return response.json();
}

/**
 * Make a fetch request returning void
 */
async function fetchVoid(
  endpoint: string,
  options: RequestInit = {}
): Promise<void> {
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json() as { error?: string; reason?: string };
      if (body?.error && typeof body.error === 'string') message = body.error;
      else if (body?.reason && typeof body.reason === 'string') message = body.reason;
    } catch {
      // non-JSON or empty body
    }
    throw new ApiError(response.status, response.statusText, message);
  }
}

export const youtubeApi = {
  /** Get channels */
  channels: (validate = false) =>
    fetchJSON<{ ok: boolean; channels: YouTubeChannel[]; count: number }>(`/dark_editor_v2/api/v1/youtube/channels?validate_tokens=${validate}`),

  /** Get a specific channel */
  getChannel: (channelId: string) =>
    fetchJSON(`/dark_editor_v2/api/v1/youtube/channels/${channelId}`),

  /** Get groups */
  groups: () => fetchJSON('/dark_editor_v2/api/v1/youtube/groups'),

  /** Create group */
  createGroup: (name: string) =>
    fetchJSON('/dark_editor_v2/api/v1/youtube/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Delete group */
  deleteGroup: (name: string) =>
    fetchVoid(`/dark_editor_v2/api/v1/youtube/groups/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /** Add channel to group */
  addChannelToGroup: (group: string, channelId: string, data?: { url?: string; title?: string; thumbnail?: string }) =>
    fetchJSON(`/dark_editor_v2/api/v1/youtube/groups/${encodeURIComponent(group)}/channels`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, ...data }),
    }),

  /** Remove channel from group */
  removeChannelFromGroup: (group: string, channelId: string) =>
    fetchVoid(`/dark_editor_v2/api/v1/youtube/groups/${encodeURIComponent(group)}/channels/${encodeURIComponent(channelId)}`, { method: 'DELETE' }),

  /** Get group feed */
  getGroupFeed: (groupName: string, sortBy = 'date', timeRange = '7d') =>
    fetchJSON(`/dark_editor_v2/api/v1/youtube/feed?sort_by=${sortBy}&time_range=${timeRange}&group_name=${encodeURIComponent(groupName)}`),

  /** Set video thumbnail */
  setThumbnail: (videoId: string, channelId: string, thumbnailPath: string) =>
    fetchJSON(`/dark_editor_v2/api/v1/youtube/videos/${videoId}/thumbnail`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, thumbnail_path: thumbnailPath }),
    }),

  /** Update video metadata */
  updateMetadata: (videoId: string, channelId: string, metadata: { title?: string; description?: string; tags?: string[]; privacy?: string }) =>
    fetchJSON(`/dark_editor_v2/api/v1/youtube/videos/${videoId}/metadata`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, ...metadata }),
    }),

  /** List videos for a channel */
  listVideos: (channelId: string, maxResults = 50) =>
    fetchJSON(`/dark_editor_v2/api/v1/youtube/videos?channel_id=${channelId}&max_results=${maxResults}`),

  /** Validate channel token */
  validateToken: (channelId: string) =>
    fetchJSON<{ ok: boolean; valid: boolean; channel_id: string; expires_at?: string; error?: string }>(`/dark_editor_v2/api/v1/youtube/channels/${encodeURIComponent(channelId)}/validate`),
};