import type { EditorSessionDetail } from './youtube';
import { bffFetch } from './client';

/**
 * Temporary export shape for the legacy thumbnail export components.
 * Values are projected from an InstaEdit-owned editor session; Velox does
 * not fetch, create, update, or persist groups, channels, or memberships.
 */
export interface GroupVideo {
  youtube_video_id: string;
  video_id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  thumbnail?: string;
  privacy_status: string;
  actual_privacy?: string;
  /** YouTube video category (extended session contract). */
  category_id?: string;
  processing_status?: string;
  platform_account_id: number;
  channel_name: string;
  channel_title?: string;
  channel_id?: string;
  editor_status?: string;
  editor_session_id?: string;
  velox_project_id?: string;
  published_at?: string;
  language?: string;
}

export type ProjectTargetContext = Pick<
  EditorSessionDetail,
  'workspace_id' | 'platform_account_id' | 'youtube_video_id' | 'velox_project_id' | 'channel_id'
>;

export type GroupVideosResponse = { videos: GroupVideo[]; warnings?: string[] };

interface GroupVideoWire {
  youtube_video_id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  privacy_status: string;
  actual_privacy?: string;
  desired_privacy?: string;
  processing_status?: string;
  published_at?: string;
  platform_account_id: number;
  channel_name: string;
  channel_id?: string;
  language?: string;
  editor_session_id?: string;
  velox_project_id?: string;
  editor_status?: string;
  publish_at?: string;
}

function toGroupVideo(video: GroupVideoWire): GroupVideo {
  return {
    ...video,
    video_id: video.youtube_video_id,
    thumbnail: video.thumbnail_url,
    channel_title: video.channel_name,
    privacy_status: video.actual_privacy || video.privacy_status || video.desired_privacy || 'private',
    published_at: video.publish_at || video.published_at,
  };
}

export async function listGroupPrivateVideos(groupId: number): Promise<GroupVideosResponse> {
  const response = await bffFetch<{ videos?: GroupVideoWire[]; warnings?: string[] }>(
    `/api/v1/groups/${encodeURIComponent(groupId)}/youtube/videos?include_subgroups=true&limit=500&days=90`,
  );
  const videos = (response.videos || []).map(toGroupVideo).filter((video) =>
    (video.actual_privacy || video.privacy_status || '').toLowerCase() === 'private',
  );
  return { videos, warnings: response.warnings || [] };
}

export async function publishGroupVideoThumbnail(
  groupId: number,
  video: Pick<GroupVideo, 'video_id' | 'platform_account_id'>,
  thumbnailMediaId: string,
): Promise<void> {
  await bffFetch(`/api/v1/groups/${encodeURIComponent(groupId)}/youtube/videos/${encodeURIComponent(video.video_id)}/thumbnail`, {
    method: 'POST',
    body: JSON.stringify({ platform_account_id: video.platform_account_id, thumbnail_media_id: thumbnailMediaId }),
  });
}
