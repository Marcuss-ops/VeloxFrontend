import { fetchJSON, fetchVoid, ApiError } from './core';

export interface YouTubeChannel {
  id: string;
  name: string;
  title?: string;
  thumbnail?: string;
  email?: string;
  token_valid?: boolean;
  language?: string;
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
  /** ISO 8601 scheduled time (e.g., "2024-12-31T10:00:00Z") */
  scheduled_time?: string;
}

/**
 * YouTube upload options type alias for convenience
 */
export type YouTubeUploadOptions = YouTubeUploadConfig;

export interface YouTubePendingTaskGroupSummary {
  group_name: string;
  pending_count: number;
  channel_count: number;
  logo_channel_id?: string;
  logo_channel_title?: string;
  logo_thumbnail?: string;
}

export const youtubeApi = {
  /** Get channels */
  channels: (validate = false) =>
    fetchJSON<{ ok: boolean; channels: YouTubeChannel[]; count: number }>(`/api/v1/youtube/channels?validate_tokens=${validate}`),

  /** Get a specific channel */
  getChannel: (channelId: string) =>
    fetchJSON(`/api/v1/youtube/channels/${channelId}`),

  // ============================================
  // Upload Groups (your channels where you upload)
  // ============================================

  /** Get upload groups (channels you own for uploading) */
  groups: () => fetchJSON('/api/v1/youtube/groups'),

  /** Create upload group */
  createGroup: (name: string) =>
    fetchJSON('/api/v1/youtube/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Delete upload group */
  deleteGroup: (name: string) =>
    fetchVoid(`/api/v1/youtube/groups/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /** Add channel to upload group */
  addChannelToGroup: (group: string, channelId: string, data?: { url?: string; title?: string; thumbnail?: string }) =>
    fetchJSON(`/api/v1/youtube/groups/${encodeURIComponent(group)}/channels`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, ...data }),
    }),

  /** Remove channel from upload group */
  removeChannelFromGroup: (group: string, channelId: string) =>
    fetchVoid(`/api/v1/youtube/groups/${encodeURIComponent(group)}/channels/${encodeURIComponent(channelId)}`, { method: 'DELETE' }),

  // ============================================
  // Manager Groups (competitor channels you track)
  // ============================================

  /** Get manager groups (competitor channels for tracking) */
  managerGroups: () => fetchJSON('/api/youtube/manager/groups'),

  /** Create manager group for competitor tracking */
  createManagerGroup: (name: string) =>
    fetchJSON('/api/youtube/manager/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Delete manager group */
  deleteManagerGroup: (name: string) =>
    fetchVoid(`/api/youtube/manager/groups/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /** Add competitor channel to group */
  addChannelToManagerGroup: (group: string, channelId: string, data?: { url?: string; title?: string; thumbnail?: string }) =>
    fetchJSON(`/api/youtube/manager/groups/${encodeURIComponent(group)}/channels`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, ...data }),
    }),

  /** Remove competitor channel from group */
  removeChannelFromManagerGroup: (group: string, channelId: string) =>
    fetchVoid(`/api/youtube/manager/groups/${encodeURIComponent(group)}/channels/${encodeURIComponent(channelId)}`, { method: 'DELETE' }),

  /** Get group feed (upload groups) */
  getGroupFeed: (groupName: string, sortBy = 'date', timeRange = '7d') =>
    fetchJSON(`/api/v1/youtube/feed?sort_by=${sortBy}&time_range=${timeRange}&group_name=${encodeURIComponent(groupName)}`),

  /** Get manager group feed (competitor groups) */
  getManagerGroupFeed: (groupName: string, sortBy = 'date', timeRange = '7d') =>
    fetchJSON(`/api/youtube/manager/feed?sort_by=${sortBy}&time_range=${timeRange}&group_name=${encodeURIComponent(groupName)}`),

  /** Refresh all manager groups feed (manual trigger) */
  refreshManagerFeed: () =>
    fetchJSON<{ ok: boolean; message: string; data?: { videos_cached: number } }>('/api/youtube/manager/feed/refresh', {
      method: 'POST',
    }),

  /** Get pending upload tasks grouped by channel group.
   *  `days` defaults to 90 so the orchestrator counter stays in sync with the
   *  Dark Editor "last 3 months" private videos list. */
  pendingTasks: (days = 90) =>
    fetchJSON<{
      ok: boolean;
      missing_covers: number;
      to_publish: number;
      total_pending?: number;
      days?: number;
      groups: YouTubePendingTaskGroupSummary[];
    }>(`/api/v1/youtube/pending-tasks?days=${days}`),

  /** Get trending news from external sources for a niche */
  getTrendingNews: (query: string, limit = 9) =>
    fetchJSON<{ ok: boolean; query: string; news: Array<{ title: string; url: string; source: string; published_at: string; description: string; image_url?: string }>; count: number }>(
      `/api/youtube/manager/news/trending?query=${encodeURIComponent(query)}&limit=${limit}`
    ),

  /** Discovery search */
  discovery: (query: string, options?: { days?: number; minViews?: number; minVelocity?: number; hideShorts?: boolean }) => {
    const params = new URLSearchParams({ query });
    if (options?.days) params.set('days', String(options.days));
    if (options?.minViews) params.set('min_views', String(options.minViews));
    if (options?.minVelocity) params.set('min_velocity', String(options.minVelocity));
    if (options?.hideShorts) params.set('hide_shorts', 'true');
    return fetchJSON(`/api/v1/youtube/discovery?${params}`);
  },

  /** Get trends */
  trends: (query: string) =>
    fetchJSON(`/api/v1/youtube/trends?query=${encodeURIComponent(query)}`),

  /** Find similar channels */
  similarChannels: (query: string, limit = 10) =>
    fetchJSON(`/api/v1/youtube/tools/similar?query=${encodeURIComponent(query)}&limit=${limit}`),

  /** Auto similar channels */
  similarAuto: (limit = 10, minVelocity = 500) =>
    fetchJSON(`/api/v1/youtube/similar/auto?limit=${limit}&min_velocity=${minVelocity}`),

  // ============================================
  // Upload Endpoints
  // ============================================

  /** Upload video from file (multipart) */
  uploadVideo: async (file: File, config: YouTubeUploadConfig): Promise<{ ok: boolean; result: YouTubeUploadResult }> => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('channel_id', config.channel_id);
    formData.append('title', config.title);
    if (config.description) formData.append('description', config.description);
    if (config.tags) formData.append('tags', config.tags.join(','));
    if (config.privacy) formData.append('privacy', config.privacy);

    const response = await fetch('/api/v1/youtube/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return response.json();
  },

  /** Upload video from local path */
  uploadFromPath: (filePath: string, config: YouTubeUploadConfig) =>
    fetchJSON<{ ok: boolean; result: YouTubeUploadResult }>('/api/v1/youtube/upload-path', {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, ...config }),
    }),

  /** Batch upload videos */
  batchUpload: (videos: { file_path: string; channel_id: string; title?: string; description?: string; tags?: string[]; privacy?: string }[]) =>
    fetchJSON<{ ok: boolean; results: Array<{ index: number; ok: boolean; result?: YouTubeUploadResult; error?: string }>; total: number }>('/api/v1/youtube/batch-upload', {
      method: 'POST',
      body: JSON.stringify({ videos }),
    }),

  /** List videos for a channel */
  listVideos: (channelId: string, maxResults = 50) =>
    fetchJSON(`/api/v1/youtube/videos?channel_id=${channelId}&max_results=${maxResults}`),

  /** Set video thumbnail */
  setThumbnail: (videoId: string, channelId: string, thumbnailPath: string) =>
    fetchJSON(`/api/v1/youtube/videos/${videoId}/thumbnail`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, thumbnail_path: thumbnailPath }),
    }),

  /** Update video metadata */
  updateMetadata: (videoId: string, channelId: string, metadata: { title?: string; description?: string; tags?: string[]; privacy?: string }) =>
    fetchJSON(`/api/v1/youtube/videos/${videoId}/metadata`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, ...metadata }),
    }),

  /** Publish video (change privacy) */
  publishVideo: (videoId: string, channelId: string, privacy: 'public' | 'unlisted') =>
    fetchJSON(`/api/v1/youtube/videos/${videoId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId, privacy }),
    }),

  /** Apply the same cover to multiple videos and optionally change visibility */
  applyBulkCover: (payload: {
    channel_id: string;
    video_ids: string[];
    variant_id?: string;
    cover_base64: string;
    cover_filename?: string;
    publish?: boolean;
    privacy?: 'private' | 'unlisted' | 'public';
    max_size_mb?: number;
  }) =>
    fetchJSON<{
      ok: boolean;
      channel_id: string;
      variant_id?: string;
      cover_file?: string;
      cover_size_mb?: number;
      privacy?: string;
      results: Array<{ video_id: string; ok: boolean; thumbnail_url?: string; privacy?: string; size_bytes?: number; error?: string }>;
      applied_count: number;
      failed_count: number;
      message: string;
    }>('/api/v1/youtube/videos/bulk-cover', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Delete video */
  deleteVideo: (videoId: string, channelId: string) =>
    fetchVoid(`/api/v1/youtube/videos/${videoId}?channel_id=${channelId}`, { method: 'DELETE' }),

  // ============================================
  // AI Generation Endpoints
  // ============================================

  /** Generate AI titles */
  generateTitles: (fileName: string, customPrompt?: string) =>
    fetchJSON<{ ok: boolean; titles: string[] }>('/api/v1/youtube/ai/titles', {
      method: 'POST',
      body: JSON.stringify({ file_name: fileName, custom_prompt: customPrompt }),
    }),

  /** Generate AI description */
  generateDescription: (title: string, customPrompt?: string) =>
    fetchJSON<{ ok: boolean; description: string }>('/api/v1/youtube/ai/description', {
      method: 'POST',
      body: JSON.stringify({ title, custom_prompt: customPrompt }),
    }),

  /** Generate AI tags */
  generateTags: (title: string, description?: string, customPrompt?: string) =>
    fetchJSON<{ ok: boolean; tags: string[] }>('/api/v1/youtube/ai/tags', {
      method: 'POST',
      body: JSON.stringify({ title, description, custom_prompt: customPrompt }),
    }),

  /** Translate arbitrary text through the YouTube AI helpers */
  translateText: (text: string, targetLanguage: string, options?: { tone?: string; preserveHashtags?: boolean }) =>
    fetchJSON<{
      ok: boolean;
      source_text: string;
      sanitized_text: string;
      translated_text: string;
      target_language: string;
      provider: string;
    }>('/api/v1/youtube/ai/translate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        tone: options?.tone,
        preserve_hashtags: options?.preserveHashtags,
      }),
    }),

  /** Generate three thumbnail cover variants with AI */
  generateCoverPack: (payload: {
    title: string;
    description?: string;
    target_language?: string;
    style?: string;
    extra_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    variant_count?: number;
  }) =>
    fetchJSON<{
      ok: boolean;
      title: string;
      sanitized_title: string;
      translated_title: string;
      translated_body?: string;
      target_language: string;
      style: string;
      variant_count: number;
      provider: string;
      warnings?: string[];
      variants: Array<{
        id: string;
        label: string;
        prompt: string;
        negative_prompt: string;
        headline: string;
        hook: string;
        filename?: string;
        image_base64?: string;
        width: number;
        height: number;
        seed: number;
        provider?: string;
        translation?: string;
      }>;
    }>('/api/v1/youtube/ai/covers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ============================================
  // OAuth Endpoints
  // ============================================

  /** Start OAuth flow */
  startOAuth: (channelName?: string) =>
    fetchJSON<{ ok: boolean; auth_url: string; channel: string }>(`/api/v1/youtube/oauth/start${channelName ? `?channel_name=${encodeURIComponent(channelName)}` : ''}`),

  /** Get quota usage */
  getQuota: () =>
    fetchJSON<{ ok: boolean; quota: Record<string, unknown> }>('/api/v1/youtube/credentials/quota'),

  /** Health check */
  healthCheck: (channelId?: string) =>
    fetchJSON(`/api/v1/youtube/credentials/health${channelId ? `?channel_id=${channelId}` : ''}`),

  /** Validate channel token */
  validateToken: (channelId: string) =>
    fetchJSON<{ ok: boolean; valid: boolean; channel_id: string; expires_at?: string; error?: string }>(`/api/v1/youtube/channels/${encodeURIComponent(channelId)}/validate`),

  /** Revoke channel token */
  revokeToken: (channelId: string) =>
    fetchJSON<{ ok: boolean; message: string }>(`/api/v1/youtube/channels/${encodeURIComponent(channelId)}/revoke`, { method: 'POST' }),

  /** Delete a channel */
  deleteChannel: (channelId: string) =>
    fetchVoid(`/api/v1/youtube/channels/${encodeURIComponent(channelId)}`, { method: 'DELETE' }),

  /** Get undefined channels (channels with tokens but not in any group) */
  getUndefinedChannels: () =>
    fetchJSON<{ ok: boolean; channels: Array<{ id: string; name?: string; title?: string; thumbnail?: string }> }>('/api/v1/youtube/channels/undefined'),

  /** Move channel to a different group (drag & drop support) */
  moveChannel: (channelId: string, targetGroup: string) =>
    fetchJSON<{ ok: boolean; message: string; data?: { channel_id: string; source_group: string; target_group: string } }>(
      `/api/youtube/manager/channels/${encodeURIComponent(channelId)}/move-to/${encodeURIComponent(targetGroup)}`,
      { method: 'POST' }
    ),

  /** Get analytics for a specific channel from the analytics cache */
  getChannelAnalytics: (channelId: string, days = 7) =>
    fetchJSON<{
      ok: boolean;
      channel: string;
      days: string;
      totals?: { views?: number; revenue?: number };
      channel_data?: { id: string; name?: string; views?: number; revenue?: number };
      stats?: Array<{ date: string; views: number; revenue: number }>;
      message?: string;
    }>(`/api/v1/youtube/analytics/channel/${encodeURIComponent(channelId)}?days=${days}`),

  /** Refresh metadata for all channels (title, thumbnail from YouTube API) */
  refreshMetadata: () =>
    fetchJSON<{ ok: boolean; refreshed: number; errors: string[]; error_count: number; message: string }>(
      '/api/v1/youtube/channels/refresh-metadata',
      { method: 'POST' }
    ),

  /** Update channel metadata (language, token_status, etc.) */
  updateChannel: (channelId: string, data: Record<string, unknown>) =>
    fetchJSON<{ ok: boolean; message: string }>(`/api/v1/youtube/channels/${encodeURIComponent(channelId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Auto-detect language for a channel via YouTube API + name fallback */
  autoDetectLanguage: (channelId: string, channelName?: string) =>
    fetchJSON<{ ok: boolean; channel_id: string; language_code: string; language_name: string; flag: string; auto_detected: boolean }>(
      `/api/v1/youtube/channels/${encodeURIComponent(channelId)}/language/auto-detect${channelName ? `?channel_name=${encodeURIComponent(channelName)}` : ''}`,
      { method: 'POST' }
    ),
};
