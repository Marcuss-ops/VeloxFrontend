export interface YouTubeChannel {
  id: string;
  title: string;
  name: string;
  language?: string;
}

export interface YouTubeGroup {
  name: string;
  privacy: 'public' | 'unlisted' | 'private' | 'unknown';
  count: number;
  channels: YouTubeChannel[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail?: string;
}

export type YouTubePrivacy = 'public' | 'unlisted' | 'private' | 'unknown';
