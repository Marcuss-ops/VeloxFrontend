// Search History Management
export interface SearchHistoryItem {
    query: string;
    searchedAt: number;
    count: number;
}

export interface SavedNewsItem {
    url: string;
    title: string;
    status: 'watchlist' | 'todo' | 'ignored' | 'archived';
    notes: { hook: string; cut: string; thumbnail: string; };
    savedAt: number;
}

const SEARCH_HISTORY_KEY = 'yt_search_history_v1';
const MAX_SEARCH_HISTORY = 20;

export const getSearchHistory = (): SearchHistoryItem[] => {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const saveSearchToHistory = (queryStr: string) => {
    const q = queryStr.trim().toLowerCase();
    if (!q) return;
    try {
        const history = getSearchHistory();
        const existing = history.find(h => h.query.toLowerCase() === q);
        if (existing) {
            existing.searchedAt = Date.now();
            existing.count += 1;
        } else {
            history.unshift({ query: queryStr.trim(), searchedAt: Date.now(), count: 1 });
        }
        const sorted = history.sort((a, b) => b.searchedAt - a.searchedAt).slice(0, MAX_SEARCH_HISTORY);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(sorted));
    } catch { /* localStorage write failed */ }
};

export const clearSearchHistory = () => {
    try { localStorage.removeItem(SEARCH_HISTORY_KEY); } catch { /* localStorage unavailable */ }
};

export const deleteSearchHistoryItem = (queryStr: string) => {
    try {
        const history = getSearchHistory().filter(h => h.query.toLowerCase() !== queryStr.toLowerCase());
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch { /* localStorage write failed */ }
};

export const getSavedNews = (): Map<string, SavedNewsItem> => {
    try {
        const saved = localStorage.getItem('yt_saved_news');
        return new Map((saved ? JSON.parse(saved) : []).map((item: SavedNewsItem) => [item.url, item]));
    } catch { return new Map(); }
};

export const saveNewsItem = (item: SavedNewsItem) => {
    try {
        const saved = getSavedNews();
        saved.set(item.url, item);
        localStorage.setItem('yt_saved_news', JSON.stringify(Array.from(saved.values())));
    } catch { /* localStorage write failed */ }
};

export const calculateKeywordScore = (title: string, interestTags: string[], description?: string): number => {
    if (interestTags.length === 0) return 0;
    const lowerTitle = title.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const combined = lowerTitle + ' ' + lowerDesc;

    let score = 0;
    let matchCount = 0;

    const musicContext = ['music', 'rap', 'hip hop', 'hip-hop', 'artist', 'album', 'song', 'drill', 'freestyle', 'rapper', 'beats', 'producer', 'label', 'feat', 'ft', 'lyrics', 'video', 'youtube', 'spotify', 'streaming'];
    const hasMusicContext = musicContext.some(kw => combined.includes(kw));
    const falsePositives = ['tourist', 'tourism', 'hotel', 'travel', 'blizzard', 'weather', 'storm', 'value trap', 'mouse trap', 'animal', 'lion', 'coyote', 'hunt', 'catch', 'warning', 'shutdown', 'airport', 'flight', 'cancelled'];
    const isFalsePositive = falsePositives.some(fp => combined.includes(fp));

    interestTags.forEach(tag => {
        const tagRegex = new RegExp(`\\b${tag}\\b`, 'i');
        if (tagRegex.test(combined)) {
            if (tag === 'trap' || tag === 'drill') {
                if (hasMusicContext) { score += 50; matchCount++; }
                else if (!isFalsePositive) { score += 20; matchCount++; }
            } else { score += 40; matchCount++; }
        }
    });

    if (matchCount >= 2) score += matchCount * 15;
    if (hasMusicContext && matchCount > 0) score += 30;
    return score + (hasMusicContext && !isFalsePositive ? 0 : -30);
};

export const getRelatedTags = (title: string): string[] => {
    const keywords = ['youtube', 'video', 'creator', 'viral', 'trend', 'news', 'social media', 'algorithm', 'monetization', 'seo', 'analytics', 'engagement', 'views', 'subscribers'];
    const lowerTitle = title.toLowerCase();
    const found: string[] = [];
    for (const kw of keywords) {
        if (lowerTitle.includes(kw) && found.length < 3) found.push(kw);
    }
    return found;
};

export const getFinalScoreColor = (score: number): string => {
    if (score >= 120) return 'text-emerald-400';
    if (score >= 80) return 'text-amber-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-gray-400';
};

export const getFinalScoreBg = (score: number): string => {
    if (score >= 120) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 80) return 'bg-amber-500/20 border-amber-500/30';
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-gray-500/20 border-gray-500/30';
};

export const isLikelyVideoUrl = (url?: string): boolean => {
    const u = String(url || '').toLowerCase();
    return u.includes('watch?v=') || u.includes('youtu.be/') || u.includes('/shorts/') || u.includes('/embed/') || /\/live\/[^/?#]+/.test(u);
};

export const resolveChannelUrl = (item: { channel_url?: string; channel_id?: string; channelId?: string }): string => {
    const direct = String(item.channel_url || '').trim();
    if (direct && !isLikelyVideoUrl(direct)) {
        return direct.split('#')[0].split('?')[0];
    }
    const cid = String(item.channel_id || item.channelId || '').trim();
    if (cid) return `https://www.youtube.com/channel/${cid}`;
    return '';
};

export const formatViewCount = (count?: number | string): string => {
    if (!count) return "0";
    const viewsNum = typeof count === 'string' ? parseInt(count.replace(/,/g, '')) : count;
    if (isNaN(viewsNum)) return "0";
    if (viewsNum >= 1000000) return (viewsNum / 1000000).toFixed(1) + 'M';
    if (viewsNum >= 1000) return (viewsNum / 1000).toFixed(1) + 'K';
    return viewsNum.toString();
};

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
