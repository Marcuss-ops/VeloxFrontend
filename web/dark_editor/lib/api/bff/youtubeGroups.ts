import type { EditorSessionDetail } from './youtube';

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

/**
 * @deprecated Transitional render shape only. No Velox API returns or stores
 * this type; slice 2 removes the remaining group selector consumer.
 */
export interface GroupSummary {
  id: number;
  name: string;
}

/** @deprecated Group video lists are no longer fetched by Velox. */
export type GroupsResponse = never;
export type GroupVideosResponse = { videos: GroupVideo[]; warnings?: string[] };
