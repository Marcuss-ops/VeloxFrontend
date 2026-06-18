import { useState, useEffect } from 'react';
import { youtubeApi, utilApi } from '../../../../lib/api';
import type { YouTubeResult, SavedNewsItem, SearchHistoryItem, NewsItem, NewsStatus } from '../types';

// ─────────── localStorage helpers ───────────

export const getSavedNews = (): Map<string, SavedNewsItem> => {
    try {
        const saved = localStorage.getItem('yt_saved_news');
        return new Map((saved ? JSON.parse(saved) : []).map((item: SavedNewsItem) => [item.url, item]));
    } catch { /* localStorage unavailable */ return new Map(); }
};

export const saveNewsItem = (item: SavedNewsItem) => {
    try {
        const saved = getSavedNews();
        saved.set(item.url, item);
        localStorage.setItem('yt_saved_news', JSON.stringify(Array.from(saved.values())));
    } catch { /* localStorage write failed */ }
};

const SEARCH_HISTORY_KEY = 'yt_search_history_v1';
const MAX_SEARCH_HISTORY = 20;

export const getSearchHistory = (): SearchHistoryItem[] => {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { /* localStorage read failed */ return []; }
};

const saveSearchToHistory = (queryStr: string) => {
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

        const sorted = history
            .sort((a, b) => b.searchedAt - a.searchedAt)
            .slice(0, MAX_SEARCH_HISTORY);

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

const isLikelyVideoUrl = (url?: string): boolean => {
    const u = String(url || '').toLowerCase();
    return u.includes('watch?v=') || u.includes('youtu.be/') || u.includes('/shorts/') || u.includes('/embed/') || /\/live\/[^/?#]+/.test(u);
};

export const resolveChannelUrl = (item: YouTubeResult): string => {
    const direct = String(item.channel_url || '').trim();
    if (direct && !isLikelyVideoUrl(direct)) {
        return direct.split('#')[0].split('?')[0];
    }
    const cid = String(item.channel_id || item.channelId || '').trim();
    if (cid) {
        return `https://www.youtube.com/channel/${cid}`;
    }
    return '';
};

// ─────────── Hook ───────────

export function useHomeView() {
    console.log('[HomeView] Component rendering');
    const [query, setQuery] = useState('');
    const [filterDate, setFilterDate] = useState('all');
    const [sortBy, _setSortBy] = useState('relevance'); // Reserved for future sorting feature
    const [minViews, setMinViews] = useState('50000');
    const [minVelocity, setMinVelocity] = useState('');
    const [hideShorts, setHideShorts] = useState(false);

    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<YouTubeResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search History
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory());
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // News state
    const [newsResults, setNewsResults] = useState<NewsItem[]>([]);
    const [isLoadingNews, setIsLoadingNews] = useState(false);

    // Interest Tags
    const [interestTags, setInterestTags] = useState<string[]>([]);
    const [_boostMatching] = useState(true); // Reserved for boost toggle
    const [_hideNonMatching] = useState(false); // Reserved for filter toggle

    // Modal state
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [modalContent, setModalContent] = useState('');
    const [modalYoutube, setModalYoutube] = useState<{ title: string; url: string; thumbnail?: string; views?: string }[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalNotes, setModalNotes] = useState({ hook: '', cut: '', thumbnail: '' });
    const [modalStatus, setModalStatus] = useState<NewsStatus | null>(null);
    const [showSavedNewsModal, setShowSavedNewsModal] = useState(false);

    // ─── Scoped helper functions ───

    const calculateKeywordScore = (title: string, description?: string): number => {
        if (interestTags.length === 0) return 0;
        const lowerTitle = title.toLowerCase();
        const lowerDesc = (description || '').toLowerCase();
        const combined = lowerTitle + ' ' + lowerDesc;

        let score = 0;
        let matchCount = 0;

        // Music/hip-hop context keywords
        const musicContext = ['music', 'rap', 'hip hop', 'hip-hop', 'artist', 'album', 'song', 'drill', 'freestyle', 'rapper', 'beats', 'producer', 'label', 'feat', 'ft', 'lyrics', 'video', 'youtube', 'spotify', 'streaming'];
        const hasMusicContext = musicContext.some(kw => combined.includes(kw));

        // False positive indicators
        const falsePositives = ['tourist', 'tourism', 'hotel', 'travel', 'blizzard', 'weather', 'storm', 'value trap', 'mouse trap', 'animal', 'lion', 'coyote', 'hunt', 'catch', 'warning', 'shutdown', 'airport', 'flight', 'cancelled'];
        const isFalsePositive = falsePositives.some(fp => combined.includes(fp));

        interestTags.forEach(tag => {
            const tagRegex = new RegExp(`\\b${tag}\\b`, 'i');
            if (tagRegex.test(title)) {
                if (tag === 'trap' || tag === 'drill') {
                    if (hasMusicContext) {
                        score += 50;
                        matchCount++;
                    } else if (!isFalsePositive) {
                        score += 20;
                        matchCount++;
                    }
                } else {
                    score += 40;
                    matchCount++;
                }
            } else if (tagRegex.test(description || '')) {
                score += 20;
                matchCount++;
            }
        });

        if (matchCount >= 2) {
            score += matchCount * 15;
        }

        if (hasMusicContext && matchCount > 0) {
            score += 30;
        }

        return score + (hasMusicContext && !isFalsePositive ? 0 : -30);
    };

    const getRelatedTags = (title: string): string[] => {
        const keywords = ['youtube', 'video', 'creator', 'viral', 'trend', 'news', 'social media', 'algorithm', 'monetization', 'seo', 'analytics', 'engagement', 'views', 'subscribers'];
        const lowerTitle = title.toLowerCase();
        const found: string[] = [];
        for (const kw of keywords) {
            if (lowerTitle.includes(kw) && found.length < 3) {
                found.push(kw);
            }
        }
        return found;
    };

    // Reserved for future virality display
    const _getViralityColor = (score: number): string => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };
    void _getViralityColor; // Reserved for future use

    const _getViralityBg = (score: number): string => {
        if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
        if (score >= 50) return 'bg-amber-500/20 border-amber-500/30';
        return 'bg-red-500/20 border-red-500/30';
    };
    void _getViralityBg; // Reserved for future use

    const getFinalScoreColor = (score: number): string => {
        if (score >= 120) return 'text-emerald-400';
        if (score >= 80) return 'text-amber-400';
        if (score >= 50) return 'text-orange-400';
        return 'text-gray-400';
    };

    const getFinalScoreBg = (score: number): string => {
        if (score >= 120) return 'bg-emerald-500/20 border-emerald-500/30';
        if (score >= 80) return 'bg-amber-500/20 border-amber-500/30';
        if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
        return 'bg-gray-500/20 border-gray-500/30';
    };

    // ─── Interest tag helpers (reserved) ───

    const [_newTag, _setNewTag] = useState(''); // Reserved for future tag input

    const _addInterestTag = () => {
        const trimmed = _newTag.trim().toLowerCase();
        if (trimmed && !interestTags.includes(trimmed)) {
            setInterestTags([...interestTags, trimmed]);
            _setNewTag('');
        }
    };
    void _addInterestTag; // Reserved for future use

    const _removeInterestTag = (tagToRemove: string) => {
        setInterestTags(interestTags.filter(t => t !== tagToRemove));
    };
    void _removeInterestTag; // Reserved for future use

    // ─── Effects ───

    useEffect(() => {
        const saved = localStorage.getItem('yt_interest_tags');
        if (saved) {
            try {
                setInterestTags(JSON.parse(saved));
            } catch { /* localStorage read failed */ }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('yt_interest_tags', JSON.stringify(interestTags));
    }, [interestTags]);

    // ─── Modal handlers ───

    const openNewsModal = async (item: NewsItem) => {
        console.log('[HomeView] Opening modal for:', item.title);
        setSelectedNews(item);
        setModalLoading(true);
        setModalContent('');
        setModalYoutube([]);

        const saved = getSavedNews();
        const existing = saved.get(item.url);
        if (existing) {
            console.log('[HomeView] Found saved status:', existing.status);
            setModalStatus(existing.status);
            setModalNotes(existing.notes);
        } else {
            setModalStatus(null);
            setModalNotes({ hook: '', cut: '', thumbnail: '' });
        }

        console.log('[HomeView] Fetching article content from:', item.url);
        utilApi.fetchUrl(item.url)
            .then(data => {
                if (data.content) {
                    console.log('[HomeView] Article content loaded, length:', data.content.length);
                    setModalContent(data.content.substring(0, 2000));
                }
            })
            .catch(err => {
                console.error('[HomeView] Error fetching article:', err);
                setModalContent('Impossibile caricare il contenuto.');
            })
            .finally(() => setModalLoading(false));

        const query = item.title.split(' ').slice(0, 5).join(' ');
        console.log('[HomeView] Searching YouTube for:', query);
        youtubeApi.discovery(query, { days: 30, minViews: 10000 })
            .then((data: any) => {
                if (data.videos) {
                    console.log('[HomeView] Found', data.videos.length, 'YouTube videos');
                    setModalYoutube(data.videos.slice(0, 12).map((v: any) => ({
                        title: v.title, url: v.url, thumbnail: v.thumbnail,
                        views: v.view_count >= 1000000 ? (v.view_count / 1000000).toFixed(1) + 'M' : v.view_count >= 1000 ? (v.view_count / 1000).toFixed(1) + 'K' : v.view_count
                    })));
                }
            })
            .catch(err => console.error('[HomeView] Error fetching YouTube videos:', err));
    };

    const handleModalStatusChange = (status: NewsStatus) => {
        if (!selectedNews) return;
        console.log('[HomeView] Changing status to:', status);
        saveNewsItem({ url: selectedNews.url, title: selectedNews.title, status, notes: modalNotes, savedAt: Date.now() });
        setModalStatus(status);
    };

    const handleModalNoteChange = (field: 'hook' | 'cut' | 'thumbnail', value: string) => {
        const newNotes = { ...modalNotes, [field]: value };
        setModalNotes(newNotes);
        if (selectedNews && modalStatus) {
            saveNewsItem({ url: selectedNews.url, title: selectedNews.title, status: modalStatus, notes: newNotes, savedAt: Date.now() });
        }
    };

    // ─── Search handler ───

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setResults([]); // Clear previous
        setError(null); // Clear any previous errors
        setShowSearchDropdown(false);

        // Save to search history
        saveSearchToHistory(query);
        setSearchHistory(getSearchHistory());

        try {
            const daysMap: Record<string, number> = {
                'all': 365,
                'today': 1,
                'week': 7,
                'month': 30
            };
            const days = daysMap[filterDate] || 7;
            const mv = minViews ? parseInt(minViews) : 0;
            const mvel = minVelocity ? parseInt(minVelocity) : 0;

            const data: any = await youtubeApi.discovery(query, { days, minViews: mv, minVelocity: mvel, hideShorts });

            if (data.videos) {
                setResults(data.videos);
            } else {
                setError(data.detail || 'Failed to fetch results.');
            }

            // Fetch news related to the query
            setIsLoadingNews(true);
            try {
                console.log('[HomeView] Fetching news for query:', query, 'and tags:', interestTags);

                const allNews: Map<string, { title: string; url: string; source: string }> = new Map();

                // Fetch for main query
                const mainNewsData: any = await youtubeApi.trends(query);
                if (mainNewsData.trends) {
                    mainNewsData.trends.forEach((news: { title: string; url: string; source: string }) => {
                        allNews.set(news.url, news);
                    });
                }

                // Fetch for each interest tag
                if (interestTags.length > 0) {
                    const tagPromises = interestTags.slice(0, 5).map(tagName =>
                        youtubeApi.trends(tagName)
                            .then(data => ({ tagName, data }))
                            .catch((_err: any) => ({ tagName, data: { trends: [] } }))
                    );

                    const tagResults = await Promise.all(tagPromises);
                    tagResults.forEach(({ tagName: _tagName, data }: { tagName: string; data: any }) => {
                        void _tagName; // Tag name used for grouping, suppress unused warning
                        if (data.trends) {
                            data.trends.forEach((news: { title: string; url: string; source: string }) => {
                                if (!allNews.has(news.url)) {
                                    allNews.set(news.url, news);
                                }
                            });
                        }
                    });
                }

                // Process all news with scores
                const newsArray = Array.from(allNews.values());
                const newsWithScores: NewsItem[] = newsArray.map((news) => {
                    const baseScore = Math.floor(Math.random() * 60) + 20; // 20-80 base
                    const keywordScore = calculateKeywordScore(news.title);
                    const finalScore = Math.min(110, _boostMatching ? baseScore + keywordScore : baseScore);
                    const tags = getRelatedTags(news.title);
                    return {
                        ...news,
                        viralityScore: baseScore,
                        keywordScore,
                        finalScore,
                        tags
                    };
                });

                // Filter if hideNonMatching is enabled
                const filtered = _hideNonMatching && interestTags.length > 0
                    ? newsWithScores.filter(n => (n.keywordScore || 0) > 0)
                    : newsWithScores;

                // Sort by final score and take top 12
                const sorted = filtered.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)).slice(0, 16);

                console.log('[HomeView] Processed news:', sorted.length, 'items');
                setNewsResults(sorted);
            } catch (newsErr) {
                console.error("News fetch error:", newsErr);
            } finally {
                setIsLoadingNews(false);
            }
        } catch (e) {
            console.error("Network error fetching search results", e);
            setError("Network error fetching search results. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    // ─── Return ───

    return {
        // State
        query, setQuery,
        filterDate, setFilterDate,
        sortBy, _setSortBy,
        minViews, setMinViews,
        minVelocity, setMinVelocity,
        hideShorts, setHideShorts,
        isSearching,
        results,
        hasSearched,
        error,
        searchHistory, setSearchHistory,
        showSearchDropdown, setShowSearchDropdown,
        newsResults,
        isLoadingNews,
        interestTags,
        selectedNews, setSelectedNews,
        modalContent,
        modalYoutube,
        modalLoading,
        modalNotes, setModalNotes,
        modalStatus, setModalStatus,
        showSavedNewsModal, setShowSavedNewsModal,

        // Callbacks / handlers
        handleSearch,
        openNewsModal,
        handleModalStatusChange,
        handleModalNoteChange,
        getFinalScoreColor,
        getFinalScoreBg,
        resolveChannelUrl,
    };
}