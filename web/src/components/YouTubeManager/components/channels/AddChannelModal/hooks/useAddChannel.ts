import { useState, useEffect } from 'react';
import { youtubeApi } from '@/lib/api';

export interface ChannelSearchResult {
    channel: string;
    title: string;
    url?: string;
    thumbnail?: string;
    channel_url?: string;
    subscribers?: string | number;
}

export interface ChannelVideo {
    title: string;
    url: string;
    thumbnail?: string;
    views?: string;
    published?: string;
}

interface BulkResult {
    url: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
}

export interface UseAddChannelReturn {
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    searchResults: ChannelSearchResult[];
    isSearching: boolean;
    manualUrl: string;
    setManualUrl: React.Dispatch<React.SetStateAction<string>>;
    activeTab: 'search' | 'manual' | 'bulk';
    setActiveTab: React.Dispatch<React.SetStateAction<'search' | 'manual' | 'bulk'>>;
    bulkInput: string;
    setBulkInput: React.Dispatch<React.SetStateAction<string>>;
    bulkImporting: boolean;
    bulkResults: Array<{ url: string; status: 'pending' | 'success' | 'error'; message?: string }>;
    expandedChannel: string | null;
    channelVideos: Record<string, ChannelVideo[]>;
    loadingVideos: string | null;
    handleSearch: () => Promise<void>;
    toggleChannelExpand: (channelName: string, channelUrl?: string) => void;
    handleAddChannel: (channel: ChannelSearchResult) => void;
    handleManualAdd: () => void;
    handleBulkImport: () => Promise<void>;
}

export const useAddChannel = (
    isOpen: boolean,
    groupName: string | null,
    onAddChannel: (group: string, channelId: string, url: string, title: string, thumbnail?: string) => void,
    onClose: () => void,
): UseAddChannelReturn => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ChannelSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [manualUrl, setManualUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'manual' | 'bulk'>('search');
    const [bulkInput, setBulkInput] = useState('');
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
    const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
    const [channelVideos, setChannelVideos] = useState<Record<string, ChannelVideo[]>>({});
    const [loadingVideos, setLoadingVideos] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && searchQuery.length >= 2) {
            handleSearch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, searchQuery.length]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        setExpandedChannel(null);
        setChannelVideos({});

        try {
            const data: any = await youtubeApi.similarChannels(searchQuery, 15);
            if (data.ok && data.results) {
                setSearchResults(data.results);
            } else if (data.channels) {
                setSearchResults(data.channels);
            }
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    };

    const fetchChannelVideos = async (channelName: string, channelUrl?: string) => {
        setLoadingVideos(channelName);
        try {
            let searchQueryVal = channelName;
            if (channelUrl) {
                const handleMatch = channelUrl.match(/@([^/?]+)/);
                if (handleMatch) {
                    searchQueryVal = `@${handleMatch[1]}`;
                } else {
                    const channelMatch = channelUrl.match(/channel\/([^/?]+)/);
                    if (channelMatch) {
                        searchQueryVal = `"${channelName}" channel`;
                    }
                }
            } else {
                searchQueryVal = `"${channelName}"`;
            }

            const data: any = await youtubeApi.discovery(searchQueryVal, { days: 60, minViews: 100 });
            if (data.videos) {
                const channelLower = channelName.toLowerCase();
                const filtered = data.videos.filter((v: any) => {
                    const titleLower = (v.title || '').toLowerCase();
                    const channelTitleLower = (v.channel_title || v.uploader || '').toLowerCase();
                    return channelTitleLower.includes(channelLower) ||
                        channelLower.includes(channelTitleLower) ||
                        titleLower.includes(channelLower);
                });

                setChannelVideos(prev => ({
                    ...prev,
                    [channelName]: (filtered.length > 0 ? filtered : data.videos).slice(0, 5).map((v: any) => ({
                        title: v.title,
                        url: v.url,
                        thumbnail: v.thumbnail,
                        views: v.view_count >= 1000000
                            ? (v.view_count / 1000000).toFixed(1) + 'M'
                            : v.view_count >= 1000
                                ? (v.view_count / 1000).toFixed(1) + 'K'
                                : String(v.view_count),
                        published: v.days_old !== undefined
                            ? (v.days_old === 0 ? 'Oggi' : v.days_old === 1 ? '1 gg' : `${v.days_old} gg`)
                            : ''
                    }))
                }));
            }
        } catch (e) {
            console.error('Failed to fetch channel videos:', e);
        } finally {
            setLoadingVideos(null);
        }
    };

    const toggleChannelExpand = (channelName: string, channelUrl?: string) => {
        if (expandedChannel === channelName) {
            setExpandedChannel(null);
        } else {
            setExpandedChannel(channelName);
            if (!channelVideos[channelName]) {
                fetchChannelVideos(channelName, channelUrl);
            }
        }
    };

    const handleAddChannel = (channel: ChannelSearchResult) => {
        if (!groupName) {
            alert('Seleziona prima un gruppo');
            return;
        }
        const channelUrl = channel.url || channel.channel_url || `https://www.youtube.com/@${channel.channel}`;
        const channelId = channel.channel || channel.title;
        onAddChannel(groupName, channelId, channelUrl, channel.title, channel.thumbnail);
        setSearchQuery('');
        setSearchResults([]);
        onClose();
    };

    const handleManualAdd = () => {
        if (!groupName || !manualUrl.trim()) return;
        const url = manualUrl.trim();
        const channelId = url.split('/').pop() || url;
        onAddChannel(groupName, channelId, url, channelId);
        setManualUrl('');
        onClose();
    };

    const handleBulkImport = async () => {
        if (!groupName || !bulkInput.trim()) return;

        const lines = bulkInput.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 0);
        const youtubeUrls = lines.filter(l => /^https?:\/\/(www\.)?youtube\.com\/|^https?:\/\/(www\.)?youtu\.be\/|@/i.test(l));

        if (youtubeUrls.length === 0) {
            alert('Nessun URL YouTube valido trovato');
            return;
        }

        setBulkImporting(true);
        const newResults: BulkResult[] = youtubeUrls.map(url => ({ url, status: 'pending' as const }));
        setBulkResults(newResults);

        for (let i = 0; i < youtubeUrls.length; i++) {
            const url = youtubeUrls[i];
            try {
                const resolveResp = await fetch(`/api/youtube/manager/resolve?url=${encodeURIComponent(url)}`);
                const resolveData = await resolveResp.json();

                if (!resolveData.ok) {
                    newResults[i] = { url, status: 'error', message: 'Impossibile risolvere il canale' };
                    continue;
                }

                const channelId = resolveData.channel_url?.split('/').pop() || resolveData.title || url.split('/').pop() || url;
                const title = resolveData.title || channelId;
                const thumbnail = resolveData.thumbnail || '';

                await onAddChannel(groupName, channelId, url, title, thumbnail);
                newResults[i] = { url, status: 'success', message: 'Aggiunto' };
            } catch (e: any) {
                newResults[i] = { url, status: 'error', message: e.message || 'Errore' };
            }

            setBulkResults([...newResults]);
        }

        setBulkImporting(false);

        const successCount = newResults.filter(r => r.status === 'success').length;
        if (successCount > 0) {
            setTimeout(() => {
                setBulkInput('');
                setBulkResults([]);
                onClose();
            }, 1500);
        }
    };

    return {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        manualUrl,
        setManualUrl,
        activeTab,
        setActiveTab,
        bulkInput,
        setBulkInput,
        bulkImporting,
        bulkResults,
        expandedChannel,
        channelVideos,
        loadingVideos,
        handleSearch,
        toggleChannelExpand,
        handleAddChannel,
        handleManualAdd,
        handleBulkImport,
    };
};
