import { fetchJSON } from './client';
import type { YouTubeVideo } from './types';

const BASE = '/dark_editor_v2/api/v1/youtube';

export interface VideosListResponse {
  ok: boolean;
  videos: YouTubeVideo[];
  count: number;
}

export async function listVideos(channelId: string, maxResults = 50): Promise<YouTubeVideo[]> {
  const data = await fetchJSON<VideosListResponse>(
    `${BASE}/videos?channel_id=${channelId}&max_results=${maxResults}`
  );
  return data.videos ?? [];
}

export async function setThumbnail(
  videoId: string,
  channelId: string,
  thumbnailPath: string
): Promise<unknown> {
  return fetchJSON(`${BASE}/videos/${videoId}/thumbnail`, {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, thumbnail_path: thumbnailPath }),
  });
}

export interface VideoMetadataUpdate {
  title?: string;
  description?: string;
  tags?: string[];
  privacy?: string;
}

export async function updateMetadata(
  videoId: string,
  channelId: string,
  metadata: VideoMetadataUpdate
): Promise<unknown> {
  return fetchJSON(`${BASE}/videos/${videoId}/metadata`, {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, ...metadata }),
  });
}
