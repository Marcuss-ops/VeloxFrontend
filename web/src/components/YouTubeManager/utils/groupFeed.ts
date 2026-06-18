import type { NewsItem, FeedItem } from '../../../lib/utils';

// Constants
export const NEWS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// News cache management
interface NewsCache {
    groupName: string;
    news: NewsItem[];
    tagsHash: string;
    timestamp: number;
}

// Tag storage
export const getDefaultTags = (groupName: string): string[] => {
    const lower = groupName.toLowerCase();
    if (lower.includes('rap') || lower.includes('hip') || lower.includes('trap') || lower.includes('drill')) {
        return ['rap', 'hip hop', 'trap', 'drill', 'freestyle'];
    }
    return [groupName];
};

export const getStoredTags = (groupName: string): string[] => {
    try {
        const stored = localStorage.getItem(`tube_tags_${groupName}`);
        return stored ? JSON.parse(stored) : getDefaultTags(groupName);
    } catch {
        return getDefaultTags(groupName);
    }
};

export const saveTags = (groupName: string, tags: string[]) => {
    try {
        localStorage.setItem(`tube_tags_${groupName}`, JSON.stringify(tags));
        const cacheKey = `yt_news_cache_${groupName}`;
        localStorage.removeItem(cacheKey);
    } catch {
        // localStorage write failed
    }
};

export const clearNewsCache = (groupName: string) => {
    try {
        const cacheKey = `yt_news_cache_${groupName}`;
        localStorage.removeItem(cacheKey);
    } catch {
        // localStorage write failed
    }
};

export const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Adesso';
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
};

export const getRelatedTags = (title: string): string[] => {
    const keywords = ['youtube', 'video', 'creator', 'viral', 'trend', 'news', 'social media', 'algorithm', 'monetization', 'seo', 'analytics', 'engagement', 'views', 'subscribers', 'rap', 'hip hop', 'music', 'streaming', 'spotify', 'tiktok'];
    const lowerTitle = title.toLowerCase();
    return keywords.filter(kw => lowerTitle.includes(kw)).slice(0, 3);
};

export const getFinalScoreColor = (score: number): string => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 80) return 'text-amber-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-gray-400';
};

export const getFinalScoreBg = (score: number): string => {
    if (score >= 100) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 80) return 'bg-amber-500/20 border-amber-500/30';
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-gray-500/20 border-gray-500/30';
};

export const calculateKeywordScore = (title: string, tags: string[]): number => {
    if (tags.length === 0) return 0;
    const lowerTitle = title.toLowerCase();
    let score = 0;
    let matchCount = 0;

    const musicContext = ['music', 'rap', 'hip hop', 'hip-hop', 'artist', 'album', 'song', 'drill', 'freestyle', 'rapper', 'beats', 'producer', 'label', 'feat', 'ft', 'lyrics', 'video', 'youtube', 'spotify', 'streaming', 'mc', 'dj', 'trap', 'gang', 'street', 'hood'];
    const hasMusicContext = musicContext.some(kw => lowerTitle.includes(kw));
    const falsePositives = ['tourist', 'tourism', 'hotel', 'travel', 'blizzard', 'weather', 'storm', 'value trap', 'mouse trap', 'animal', 'lion', 'coyote', 'hunt', 'catch', 'warning', 'shutdown', 'airport', 'flight', 'cancelled', 'trap camera', 'trap door', 'steam trap', 'drill bit', 'drill press', 'power drill', 'drill machine', 'dental drill'];
    const isFalsePositive = falsePositives.some(fp => lowerTitle.includes(fp));

    tags.forEach(tag => {
        const tagRegex = new RegExp(`\\b${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (tagRegex.test(title)) {
            if (tag === 'trap' || tag === 'drill') {
                if (hasMusicContext && !isFalsePositive) { score += 50; matchCount++; }
                else if (!isFalsePositive) { score += 15; matchCount++; }
            } else {
                score += 40;
                matchCount++;
            }
        }
    });

    if (matchCount >= 2) score += matchCount * 15;
    if (hasMusicContext && matchCount > 0) score += 30;
    return score;
};

// Calculate video relevance score (0-100)
export const calculateVideoRelevance = (video: FeedItem, tags: string[]): { score: number; matchedTags: string[] } => {
    if (tags.length === 0) return { score: 50, matchedTags: [] };

    const lowerTitle = video.title?.toLowerCase() || '';
    const lowerChannel = video.channel_title?.toLowerCase() || '';
    const combined = `${lowerTitle} ${lowerChannel}`;

    const matchedTags: string[] = [];
    let score = 0;

    const musicContext = ['music', 'rap', 'hip hop', 'hip-hop', 'artist', 'album', 'song', 'drill', 'freestyle', 'rapper', 'beats', 'producer', 'label', 'feat', 'ft', 'lyrics', 'official', 'mv', 'video', 'audio', 'spotify', 'streaming', 'mc', 'dj', 'trap', 'gang', 'street', 'hood', 'freestyle', 'battle', 'cypher'];
    const hasMusicContext = musicContext.some(kw => combined.includes(kw));

    const falsePositives = ['tourist', 'tourism', 'hotel', 'travel', 'blizzard', 'weather', 'storm', 'trap camera', 'trap door', 'steam trap', 'drill bit', 'drill press', 'power drill', 'drill machine', 'dental drill', 'seed drill', 'hammer drill', 'exercise', 'workout', 'tutorial how to', 'diy', 'fix', 'repair'];
    const isFalsePositive = falsePositives.some(fp => combined.includes(fp));

    if (isFalsePositive) {
        return { score: 10, matchedTags: [] };
    }

    tags.forEach(tag => {
        const tagRegex = new RegExp(`\\b${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (tagRegex.test(combined)) {
            matchedTags.push(tag);
            if (tag === 'trap' || tag === 'drill') {
                if (hasMusicContext) score += 35;
                else score += 15;
            } else {
                score += 25;
            }
        }
    });

    if (hasMusicContext) score += 20;
    if (matchedTags.length >= 2) score += matchedTags.length * 10;
    if (matchedTags.length >= 3) score += 15;
    if (video.view_count && video.view_count > 100000) score += 5;
    if (video.view_count && video.view_count > 500000) score += 5;

    return { score: Math.min(100, score), matchedTags };
};

export const getNewsCache = (groupName: string, tagsHash: string): NewsCache | null => {
    try {
        const cacheKey = `yt_news_cache_${groupName}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        const data = JSON.parse(cached) as NewsCache;
        const now = Date.now();
        if (now - data.timestamp < NEWS_CACHE_TTL && data.tagsHash === tagsHash) {
            return data;
        }
        return null;
    } catch {
        return null;
    }
};

export const setNewsCache = (groupName: string, news: NewsItem[], tagsHash: string) => {
    try {
        const cacheKey = `yt_news_cache_${groupName}`;
        const cache: NewsCache = { groupName, news, tagsHash, timestamp: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch { /* localStorage write failed */ }
};

export const getRelevanceColor = (score: number): string => {
    if (score >= 70) return 'bg-emerald-500/80';
    if (score >= 50) return 'bg-amber-500/80';
    if (score >= 30) return 'bg-orange-500/80';
    return 'bg-gray-500/80';
};

export function formatViewCount(count?: number): string {
    if (!count) return '';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return String(count);
}
