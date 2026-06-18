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

export interface YouTubeGroupChannelRef {
  id?: string;
  title?: string;
  name?: string;
  thumbnail?: string;
  language?: string;
}

export interface YouTubeGroup {
  name: string;
  description?: string;
  privacy?: string;
  count?: number;
  channels: YouTubeGroupChannelRef[];
}

export type YouTubePrivacy = 'private' | 'unlisted' | 'public' | string;

export interface YouTubeVideo {
  video_id: string;
  title: string;
  description?: string;
  privacy_status?: YouTubePrivacy;
  view_count?: number;
  published_at?: string;
  thumbnail?: string;
  channel_id?: string;
  channel_title?: string;
}

export type GroupFeedSortBy = 'date' | 'views' | 'title';
export type GroupFeedTimeRange = '24h' | '7d' | '30d' | '90d' | 'all';
