import { useState, useEffect } from 'react';
import { youtubeApi } from '../../../lib/api';
import { type NewsItem, type FeedItem } from '../../../lib/utils';

const getDefaultTags = (groupName: string): string[] => {
    const lower = groupName.toLowerCase();
    if (lower.includes('rap') || lower.includes('hip') || lower.includes('trap') || lower.includes('drill')) {
        return ['rap', 'hip hop', 'trap', 'drill', 'freestyle'];
    }
    return [groupName];
};

const getStoredTags = (groupName: string): string[] => {
    try {
        const stored = localStorage.getItem(`tube_tags_${groupName}`);
        return stored ? JSON.parse(stored) : getDefaultTags(groupName);
    } catch {
        return getDefaultTags(groupName);
    }
};

const saveTags = (groupName: string, tags: string[]) => {
    try {
        localStorage.setItem(`tube_tags_${groupName}`, JSON.stringify(tags));
        // Clear news cache when tags change
        const cacheKey = `yt_news_cache_${groupName}`;
        localStorage.removeItem(cacheKey);
        console.log(`[GroupFeed] Tags saved and cache cleared for ${groupName}`);
    } catch {
        // localStorage write failed
    }
};

const clearNewsCache = (groupName: string) => {
    try {
        const cacheKey = `yt_news_cache_${groupName}`;
        localStorage.removeItem(cacheKey);
        console.log(`[GroupFeed] News cache cleared for ${groupName}`);
    } catch {
        // localStorage write failed
    }
};

const getRelatedTags = (title: string): string[] => {
    const keywords = ['youtube', 'video', 'creator', 'viral', 'trend', 'news', 'social media', 'algorithm', 'monetization', 'seo', 'analytics', 'engagement', 'views', 'subscribers', 'rap', 'hip hop', 'music', 'streaming', 'spotify', 'tiktok'];
    const lowerTitle = title.toLowerCase();
    return keywords.filter(kw => lowerTitle.includes(kw)).slice(0, 3);
};

const calculateKeywordScore = (title: string, tags: string[]): number => {
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
const calculateVideoRelevance = (video: FeedItem, tags: string[]): { score: number; matchedTags: string[] } => {
    if (tags.length === 0) return { score: 50, matchedTags: [] };

    const lowerTitle = video.title?.toLowerCase() || '';
    const lowerChannel = video.channel_title?.toLowerCase() || '';
    const combined = `${lowerTitle} ${lowerChannel}`;

    const matchedTags: string[] = [];
    let score = 0;

    // Music context keywords boost relevance
    const musicContext = ['music', 'rap', 'hip hop', 'hip-hop', 'artist', 'album', 'song', 'drill', 'freestyle', 'rapper', 'beats', 'producer', 'label', 'feat', 'ft', 'lyrics', 'official', 'mv', 'video', 'audio', 'spotify', 'streaming', 'mc', 'dj', 'trap', 'gang', 'street', 'hood', 'freestyle', 'battle', 'cypher'];
    const hasMusicContext = musicContext.some(kw => combined.includes(kw));

    // False positives to penalize
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

    // Bonus for music context
    if (hasMusicContext) score += 20;

    // Bonus for multiple tag matches
    if (matchedTags.length >= 2) score += matchedTags.length * 10;
    if (matchedTags.length >= 3) score += 15;

    // Bonus for high views (indicates popular content in niche)
    if (video.view_count && video.view_count > 100000) score += 5;
    if (video.view_count && video.view_count > 500000) score += 5;

    // Cap at 100
    return { score: Math.min(100, score), matchedTags };
};

// News cache management (1 hour TTL)
interface NewsCache {
    groupName: string;
    news: NewsItem[];
    tagsHash: string;
    timestamp: number;
}

const NEWS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const getNewsCache = (groupName: string, tagsHash: string): NewsCache | null => {
    try {
        const cacheKey = `yt_news_cache_${groupName}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        const data = JSON.parse(cached) as NewsCache;
        const now = Date.now();
        if (now - data.timestamp < NEWS_CACHE_TTL && data.tagsHash === tagsHash) {
            console.log(`[GroupFeed] Using cached news for ${groupName}, age: ${Math.round((now - data.timestamp) / 60000)}min`);
            return data;
        }
        console.log(`[GroupFeed] Cache expired or tags changed for ${groupName}`);
        return null;
    } catch {
        return null;
    }
};

const setNewsCache = (groupName: string, news: NewsItem[], tagsHash: string) => {
    try {
        const cacheKey = `yt_news_cache_${groupName}`;
        const cache: NewsCache = { groupName, news, tagsHash, timestamp: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(cache));
        console.log(`[GroupFeed] Cached ${news.length} news for ${groupName}`);
    } catch { /* localStorage write failed */ }
};

export function useGroupFeedData(groupName: string, dateFilter: string, channels: unknown[]) {
    const [isLoading, setIsLoading] = useState(true);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [competitorFeed, setCompetitorFeed] = useState<FeedItem[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [competitors, setCompetitors] = useState<any[]>([]);
    const [nicheTags, setNicheTags] = useState<string[]>(() => getStoredTags(groupName));
    const [macroNews, setMacroNews] = useState<NewsItem[]>([]);
    const [trendingNews, setTrendingNews] = useState<Array<{ title: string; url: string; source: string; published_at: string; description: string; image_url?: string }>>([]);
    const [trendingNewsLoading, setTrendingNewsLoading] = useState(false);

    useEffect(() => {
        console.log('[GroupFeed] useEffect triggered for:', groupName, 'dateFilter:', dateFilter);
        let isMounted = true;
        setIsLoading(true);

        const fetchData = async () => {
            const timeRange = dateFilter === 'today' ? '24h' : dateFilter === 'twoweeks' ? '14d' : dateFilter === 'month' ? '28d' : '7d';
            const days = dateFilter === 'today' ? 1 : dateFilter === 'twoweeks' ? 14 : dateFilter === 'month' ? 28 : 7;

            console.log('[GroupFeed] Fetching feed with timeRange:', timeRange, 'days:', days);

            try {
                const feedData: any = await youtubeApi.getManagerGroupFeed(groupName, { timeRange } as any);
                console.log('[GroupFeed] Feed response:', feedData.ok ? 'ok' : 'error', 'videos:', feedData.videos?.length || 0);
                if (isMounted && feedData.ok) {
                    setFeed((feedData.videos || []).sort((a: FeedItem, b: FeedItem) => (b.view_count || 0) - (a.view_count || 0)));
                }
            } catch (e) {
                console.error('[GroupFeed] Feed error:', e);
            }

            if (isMounted) setIsLoading(false);

            const tagsFromStorage = getStoredTags(groupName);
            // Use more tags for better discovery (up to 5)
            const nicheQuery = tagsFromStorage.slice(0, 5).join(' ');
            const tagsHash = tagsFromStorage.sort().join(',');
            console.log('[GroupFeed] Niche query:', nicheQuery, 'tags:', tagsFromStorage, 'hash:', tagsHash);

            // Check news cache first (with tags hash for invalidation)
            const cachedNews = getNewsCache(groupName, tagsHash);
            if (cachedNews) {
                console.log('[GroupFeed] Using cached news:', cachedNews.news.length);
                setNews(cachedNews.news);
            }

            const [discRes, simRes, newsRes, macroNewsRes] = await Promise.allSettled([
                youtubeApi.discovery(nicheQuery, { days } as any),
                youtubeApi.similarChannels(groupName, { limit: 10 } as any),
                cachedNews ? Promise.resolve({ ok: true, trends: [] as any[] }) : youtubeApi.trends(nicheQuery),
                youtubeApi.trends(groupName),
            ]);

            if (!isMounted) return;

            console.log('[GroupFeed] Discovery result:', discRes.status);
            console.log('[GroupFeed] Similar result:', simRes.status);
            console.log('[GroupFeed] News result:', newsRes.status);
            console.log('[GroupFeed] Macro news result:', macroNewsRes.status);

            // Process macro news (general niche news, not filtered by user tags)
            if (macroNewsRes.status === 'fulfilled' && (macroNewsRes.value as any)?.trends) {
                const macroItems = (macroNewsRes.value as any).trends.slice(0, 4).map((n: NewsItem) => ({
                    ...n,
                    viralityScore: Math.floor(Math.random() * 40) + 60,
                    finalScore: Math.floor(Math.random() * 30) + 70,
                    tags: getRelatedTags(n.title),
                    keywordScore: 0
                }));
                setMacroNews(macroItems);
                console.log('[GroupFeed] Macro news:', macroItems.length);
            }

            if (discRes.status === 'fulfilled' && (discRes.value as any)?.ok && (discRes.value as any).videos?.length) {
                const tracked = new Set(channels?.map((ch: any) => ch.title?.toLowerCase()).filter(Boolean) || []);
                // Filter videos by relevance score (minimum 30 to exclude unrelated content)
                const relevantVideos = (discRes.value as any).videos
                    .filter((v: FeedItem) => !tracked.has(v.channel_title?.toLowerCase()))
                    .map((v: FeedItem) => {
                        const { score, matchedTags } = calculateVideoRelevance(v, tagsFromStorage);
                        return { ...v, relevanceScore: score, matchedTags };
                    })
                    .filter((v: any) => v.relevanceScore >= 30) // Minimum relevance threshold
                    .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
                    .slice(0, 15);
                setCompetitorFeed(relevantVideos);
                console.log('[GroupFeed] Competitor feed:', relevantVideos.length, 'relevant videos (from', (discRes.value as any).videos.length, 'total)');
            }
            if (simRes.status === 'fulfilled' && (simRes.value as any)?.ok) {
                setCompetitors((simRes.value as any).results || (simRes.value as any).channels || []);
                console.log('[GroupFeed] Competitors:', (simRes.value as any).results?.length || (simRes.value as any).channels?.length || 0);
            }

            // Only process news if not using cache
            if (!cachedNews) {
                const allNews: Map<string, NewsItem> = new Map();
                if (newsRes.status === 'fulfilled' && (newsRes.value as any)?.trends) {
                    (newsRes.value as any).trends.forEach((n: NewsItem) => allNews.set(n.url, n));
                    console.log('[GroupFeed] Raw news from API:', allNews.size);
                }

                const sortedNews = Array.from(allNews.values()).map(n => {
                    const baseScore = Math.floor(Math.random() * 60) + 20;
                    const keywordScore = calculateKeywordScore(n.title, tagsFromStorage);
                    return { ...n, viralityScore: baseScore, keywordScore, finalScore: Math.min(110, baseScore + keywordScore), tags: getRelatedTags(n.title) };
                }).sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)).slice(0, 8);

                console.log('[GroupFeed] Processed news:', sortedNews.length);
                setNews(sortedNews);

                // Cache the news with tags hash
                if (sortedNews.length > 0) {
                    setNewsCache(groupName, sortedNews, tagsHash);
                }
            }

            // Fetch trending news from external sources
            setTrendingNewsLoading(true);
            try {
                const trendingQuery = tagsFromStorage.length > 0 ? tagsFromStorage.slice(0, 3).join(' ') : groupName;
                const trendingData: any = await youtubeApi.getTrendingNews(trendingQuery, 9);
                if (isMounted && trendingData.ok) {
                    setTrendingNews(trendingData.news || []);
                    console.log('[GroupFeed] Trending news:', trendingData.news?.length || 0);
                }
            } catch (e) {
                console.error('[GroupFeed] Trending news error:', e);
            } finally {
                if (isMounted) setTrendingNewsLoading(false);
            }
        };

        fetchData().catch(err => console.error('[GroupFeed] Fetch error:', err));
        return () => { isMounted = false; };
    }, [groupName, dateFilter, channels, nicheTags]);

    return {
        isLoading,
        feed,
        competitorFeed,
        news,
        setNews,
        competitors,
        nicheTags,
        setNicheTags,
        macroNews,
        trendingNews,
        trendingNewsLoading,
        saveTags: (tags: string[]) => saveTags(groupName, tags),
        clearNewsCache: () => clearNewsCache(groupName),
    };
}