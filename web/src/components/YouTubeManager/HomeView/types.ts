export interface YouTubeResult {
    title: string;
    url: string;
    thumbnail: string;
    view_count?: number | string;
    channel_url?: string;
    channel_title?: string;
    channel_id?: string;
    channelId?: string;
}

export interface SavedNewsItem {
    url: string;
    title: string;
    status: 'watchlist' | 'todo' | 'ignored' | 'archived';
    notes: { hook: string; cut: string; thumbnail: string; };
    savedAt: number;
}

export interface SearchHistoryItem {
    query: string;
    searchedAt: number;
    count: number;
}

export interface NewsItem {
    title: string;
    url: string;
    source: string;
    viralityScore?: number;
    tags?: string[];
    keywordScore?: number;
    finalScore?: number;
}

export type NewsStatus = 'watchlist' | 'todo' | 'ignored' | 'archived';