import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { defaultStorage, safeJsonParse, safeJsonStringify, type StoragePort } from './storage'
import { YouTubeUrl } from './domain'

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}

// ─── YouTube Utilities ───────────────────────────────────────────────────────

export interface FeedItem {
    id: string;
    title: string;
    url?: string;
    thumbnail?: string;
    channel_title?: string;
    view_count?: number;
    velocity?: number;
    days_old?: number;
    source_channel?: string;
    uploader?: string;
    channel_url?: string;
}

export interface NewsItem {
    title: string;
    url: string;
    views?: string;
    source: string;
    time?: string;
    viralityScore?: number;
    tags?: string[];
    keywordScore?: number;
    finalScore?: number;
}

export const isLikelyVideoUrl = (url?: string): boolean => YouTubeUrl.isVideoUrl(url || '');

export const extractVideoId = (url?: string): string | null => YouTubeUrl.extractId(url || '');

export const resolveChannelLink = (obj: Record<string, unknown>): string => {
    const direct = String(obj?.channel_url || '').trim();
    if (direct && !isLikelyVideoUrl(direct)) return direct.split('#')[0].split('?')[0];
    const fallback = String(obj?.url || '').trim();
    if (fallback && !isLikelyVideoUrl(fallback)) return fallback.split('#')[0].split('?')[0];
    return '';
};

export const copyToClipboard = (text: string): Promise<void> => {
    return navigator.clipboard.writeText(text).catch(err => {
        console.error('[YouTube] Copy failed:', err);
    });
};

export type NewsStatus = 'watchlist' | 'todo' | 'ignored' | 'archived';

export const NEWS_STATUSES: NewsStatus[] = ['watchlist', 'todo', 'ignored', 'archived'];

export interface NewsStatusMeta {
    label: string;
    shortLabel: string;
    icon: string;
    colorClass: string;
    bgClass: string;
    activeBgClass: string;
    hoverBgClass: string;
}

export const NEWS_STATUS_META: Record<NewsStatus, NewsStatusMeta> = {
    watchlist: { label: 'Watchlist', shortLabel: 'Watchlist', icon: 'bookmark', colorClass: 'text-blue-300', bgClass: 'bg-blue-500/30', activeBgClass: 'bg-blue-600', hoverBgClass: 'hover:bg-blue-600' },
    todo: { label: 'Da Fare', shortLabel: 'Da Fare', icon: 'checklist', colorClass: 'text-green-300', bgClass: 'bg-green-500/30', activeBgClass: 'bg-green-600', hoverBgClass: 'hover:bg-green-600' },
    ignored: { label: 'Ignorato', shortLabel: 'Ignora', icon: 'block', colorClass: 'text-gray-300', bgClass: 'bg-gray-500/30', activeBgClass: 'bg-gray-600', hoverBgClass: 'hover:bg-gray-600' },
    archived: { label: 'Archiviato', shortLabel: 'Archivia', icon: 'archive', colorClass: 'text-purple-300', bgClass: 'bg-purple-500/30', activeBgClass: 'bg-purple-600', hoverBgClass: 'hover:bg-purple-600' },
};

export interface SavedNewsItem {
    url: string;
    title: string;
    status: NewsStatus;
    notes: { hook: string; cut: string; thumbnail: string; };
    savedAt: number;
}

const NEWS_STORAGE_KEY = 'yt_saved_news';

export const getSavedNews = (storage: StoragePort = defaultStorage): Map<string, SavedNewsItem> => {
    const saved = storage.getItem(NEWS_STORAGE_KEY);
    const parsed = safeJsonParse<SavedNewsItem[]>(saved, []);
    return new Map(parsed.map((item) => [item.url, item]));
};

export const saveNewsItem = (item: SavedNewsItem, storage: StoragePort = defaultStorage): void => {
    const saved = getSavedNews(storage);
    saved.set(item.url, item);
    const serialized = safeJsonStringify(Array.from(saved.values()));
    if (serialized) {
        storage.setItem(NEWS_STORAGE_KEY, serialized);
    }
};

export const clearNewsCache = (storage: StoragePort = defaultStorage): void => {
    storage.removeItem(NEWS_STORAGE_KEY);
};

export const addToStudio = (
    video: { title: string; url?: string },
    group?: string,
    storage: StoragePort = defaultStorage
): void => {
    const raw = storage.getItem('studio_pending_projects_v1');
    const pending = safeJsonParse<unknown[]>(raw, []);
    const newPending = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: video.title,
        url: video.url || '',
        group: group || null,
        addedAt: Date.now(),
    };
    pending.push(newPending);
    const serialized = safeJsonStringify(pending);
    if (serialized) {
        storage.setItem('studio_pending_projects_v1', serialized);
    }

    const addVideoProject = (window as unknown as Record<string, unknown>)?.addVideoProject;
    if (typeof addVideoProject === 'function') {
        try {
            addVideoProject({
                title: video.title,
                url: video.url || '',
                group: group || null,
            });
        } catch (e) {
            console.error('[YouTube] Failed to add video project', e);
        }
    }
};
