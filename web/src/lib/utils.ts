import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export const isLikelyVideoUrl = (url?: string): boolean => {
    const u = String(url || '').toLowerCase();
    return u.includes('watch?v=') || u.includes('youtu.be/') || u.includes('/shorts/') || u.includes('/embed/') || /\/live\/[^/?#]+/.test(u);
};

export const extractVideoId = (url?: string): string | null => {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname === 'youtu.be') return u.pathname.slice(1);
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1]?.split(/[/?]/)[0];
        if (u.pathname.includes('/embed/')) return u.pathname.split('/embed/')[1]?.split(/[/?]/)[0];
        if (u.pathname.includes('/live/')) return u.pathname.split('/live/')[1]?.split(/[/?]/)[0];
    } catch {
        // URL parsing failed
    }
    return null;
};

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

export interface SavedNewsItem {
    url: string;
    title: string;
    status: 'watchlist' | 'todo' | 'ignored' | 'archived';
    notes: { hook: string; cut: string; thumbnail: string; };
    savedAt: number;
}

const NEWS_STORAGE_KEY = 'yt_saved_news';

export const getSavedNews = (): Map<string, SavedNewsItem> => {
    try {
        const saved = localStorage.getItem(NEWS_STORAGE_KEY);
        return new Map((saved ? JSON.parse(saved) : []).map((item: SavedNewsItem) => [item.url, item]));
    } catch {
        return new Map();
    }
};

export const saveNewsItem = (item: SavedNewsItem): void => {
    try {
        const saved = getSavedNews();
        saved.set(item.url, item);
        localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(Array.from(saved.values())));
    } catch {
        // localStorage write failed
    }
};

export const clearNewsCache = (): void => {
    try {
        localStorage.removeItem(NEWS_STORAGE_KEY);
    } catch {
        // localStorage unavailable
    }
};

export const addToStudio = (video: { title: string; url?: string }, group?: string): void => {
    try {
        const raw = localStorage.getItem('studio_pending_projects_v1') || '[]';
        const pending = JSON.parse(raw);
        const newPending = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: video.title,
            url: video.url || '',
            group: group || null,
            addedAt: Date.now(),
        };
        pending.push(newPending);
        localStorage.setItem('studio_pending_projects_v1', JSON.stringify(pending));

        const addVideoProject = (window as unknown as Record<string, unknown>)?.addVideoProject;
        if (typeof addVideoProject === 'function') {
            addVideoProject({
                title: video.title,
                url: video.url || '',
                group: group || null,
            });
        }
    } catch (e) {
        console.error('[YouTube] Failed to save pending project', e);
    }
};


