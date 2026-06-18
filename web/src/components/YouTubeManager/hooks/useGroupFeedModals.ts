import { useState } from 'react';
import { youtubeApi, utilApi } from '../../../lib/api';
import { getSavedNews, saveNewsItem, type NewsItem, type FeedItem } from '../../../lib/utils';

export function useGroupFeedModals(groupName: string) {
    // News modal state
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [modalContent, setModalContent] = useState('');
    const [modalYoutube, setModalYoutube] = useState<{ title: string; url: string; thumbnail?: string; views?: string }[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalNotes, setModalNotes] = useState({ hook: '', cut: '', thumbnail: '' });
    const [modalStatus, setModalStatus] = useState<'watchlist' | 'todo' | 'ignored' | 'archived' | null>(null);
    const [showSavedNewsModal, setShowSavedNewsModal] = useState(false);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

    // Video modal state
    const [selectedVideo, setSelectedVideo] = useState<FeedItem | null>(null);
    const [videoModalRelated, setVideoModalRelated] = useState<{ title: string; url: string; thumbnail?: string; views?: string; days_old?: number }[]>([]);
    const [videoModalLoading, setVideoModalLoading] = useState(false);
    const [similarVideosModal, setSimilarVideosModal] = useState(false);
    const [similarVideos, setSimilarVideos] = useState<{ title: string; url: string; thumbnail?: string; views?: string; days_old?: number }[]>([]);
    const [similarVideosLoading, setSimilarVideosLoading] = useState(false);

    const openVideoModal = async (video: FeedItem) => {
        console.log('[GroupFeed] Opening video modal for:', video.title);
        setSelectedVideo(video);
        setVideoModalLoading(true);
        setVideoModalRelated([]);

        const query = video.title.split(' ').slice(0, 6).join(' ');
        youtubeApi.discovery(query, { days: 30, minViews: 5000 })
            .then((data: any) => {
                if (data.videos) {
                    setVideoModalRelated(data.videos.slice(0, 12).map((v: any) => ({
                        title: v.title, url: v.url, thumbnail: v.thumbnail,
                        views: v.view_count >= 1000000 ? (v.view_count / 1000000).toFixed(1) + 'M' : v.view_count >= 1000 ? (v.view_count / 1000).toFixed(1) + 'K' : v.view_count,
                        days_old: v.days_old
                    })));
                    console.log('[GroupFeed] Found', data.videos.length, 'related videos');
                }
            })
            .catch((err: any) => console.error('[GroupFeed] Error fetching related videos:', err))
            .finally(() => setVideoModalLoading(false));
    };

    const openSimilarVideosModal = async (query: string) => {
        console.log('[GroupFeed] Opening similar videos modal for query:', query);
        setSimilarVideosModal(true);
        setSimilarVideosLoading(true);
        setSimilarVideos([]);

        youtubeApi.discovery(query, { days: 30, minViews: 10000 })
            .then((data: any) => {
                if (data.videos) {
                    setSimilarVideos(data.videos.slice(0, 18).map((v: any) => ({
                        title: v.title, url: v.url, thumbnail: v.thumbnail,
                        views: v.view_count >= 1000000 ? (v.view_count / 1000000).toFixed(1) + 'M' : v.view_count >= 1000 ? (v.view_count / 1000).toFixed(1) + 'K' : v.view_count,
                        days_old: v.days_old
                    })));
                    console.log('[GroupFeed] Found', data.videos.length, 'similar videos');
                }
            })
            .catch((err: any) => console.error('[GroupFeed] Error fetching similar videos:', err))
            .finally(() => setSimilarVideosLoading(false));
    };

    const toggleSelectAll = () => {
        const allUrls: string[] = Array.from(getSavedNews().keys());
        if (selectedUrls.size === allUrls.length) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(allUrls));
        }
    };

    const toggleSelect = (url: string) => {
        const newSet = new Set(selectedUrls);
        if (newSet.has(url)) {
            newSet.delete(url);
        } else {
            newSet.add(url);
        }
        setSelectedUrls(newSet);
    };

    const bulkChangeStatus = (status: 'watchlist' | 'todo' | 'ignored' | 'archived') => {
        const saved = getSavedNews();
        selectedUrls.forEach(url => {
            const item = saved.get(url);
            if (item) {
                saved.set(url, { ...item, status, savedAt: Date.now() });
            }
        });
        localStorage.setItem('yt_saved_news', JSON.stringify(Array.from(saved.values())));
        setSelectedUrls(new Set());
        setShowSavedNewsModal(false);
        setTimeout(() => setShowSavedNewsModal(true), 50);
    };

    const bulkDelete = () => {
        if (!confirm(`Eliminare ${selectedUrls.size} news?`)) return;
        const saved = getSavedNews();
        selectedUrls.forEach(url => saved.delete(url));
        localStorage.setItem('yt_saved_news', JSON.stringify(Array.from(saved.values())));
        setSelectedUrls(new Set());
        setShowSavedNewsModal(false);
        setTimeout(() => setShowSavedNewsModal(true), 50);
    };

    const openNewsModal = async (item: NewsItem) => {
        console.log('[GroupFeed] Opening modal for:', item.title);
        setSelectedNews(item);
        setModalLoading(true);
        setModalContent('');
        setModalYoutube([]);

        const saved = getSavedNews();
        const existing = saved.get(item.url);
        if (existing) {
            setModalStatus(existing.status);
            setModalNotes(existing.notes);
            console.log('[GroupFeed] Found saved status:', existing.status);
        } else {
            setModalStatus(null);
            setModalNotes({ hook: '', cut: '', thumbnail: '' });
        }

        // Fetch article
        console.log('[GroupFeed] Fetching article content from:', item.url);
        utilApi.fetchUrl(item.url)
            .then((data: any) => {
                if (data.content) {
                    setModalContent(data.content.substring(0, 2000));
                    console.log('[GroupFeed] Article content loaded, length:', data.content.length);
                }
            })
            .catch((err: any) => {
                setModalContent('Impossibile caricare il contenuto.');
                console.error('[GroupFeed] Error fetching article:', err);
            })
            .finally(() => setModalLoading(false));

        // Fetch YouTube videos
        const query = item.title.split(' ').slice(0, 5).join(' ');
        console.log('[GroupFeed] Searching YouTube for:', query);
        youtubeApi.discovery(query, { days: 30, minViews: 10000 })
            .then((data: any) => {
                if (data.videos) {
                    setModalYoutube(data.videos.slice(0, 12).map((v: any) => ({
                        title: v.title, url: v.url, thumbnail: v.thumbnail,
                        views: v.view_count >= 1000000 ? (v.view_count / 1000000).toFixed(1) + 'M' : v.view_count >= 1000 ? (v.view_count / 1000).toFixed(1) + 'K' : v.view_count
                    })));
                    console.log('[GroupFeed] Found', data.videos.length, 'YouTube videos');
                }
            })
            .catch((err: any) => console.error('[GroupFeed] Error fetching YouTube videos:', err));
    };

    const handleModalStatusChange = (status: 'watchlist' | 'todo' | 'ignored' | 'archived') => {
        if (!selectedNews) return;
        console.log('[GroupFeed] Changing status to:', status);
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

    return {
        selectedNews,
        setSelectedNews,
        modalContent,
        modalYoutube,
        modalLoading,
        modalNotes,
        modalStatus,
        showSavedNewsModal,
        setShowSavedNewsModal,
        selectedUrls,
        setSelectedUrls,
        selectedVideo,
        setSelectedVideo,
        videoModalRelated,
        videoModalLoading,
        similarVideosModal,
        setSimilarVideosModal,
        similarVideos,
        similarVideosLoading,
        openNewsModal,
        handleModalStatusChange,
        handleModalNoteChange,
        setModalStatus,
        setModalNotes,
        openVideoModal,
        openSimilarVideosModal,
        toggleSelectAll,
        toggleSelect,
        bulkChangeStatus,
        bulkDelete,
    };
}
