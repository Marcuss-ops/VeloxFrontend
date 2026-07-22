import { useState, useCallback, useEffect } from 'react';
import { youtubeApi } from '@/lib/api';
import { useDataCache } from '@/hooks/useDataCache';
import type { Channel, ChannelGroup } from '../types';
import { getLanguageFromName } from '../utils/languageDetection';

export interface UseYouTubeChannelsResult {
    groups: ChannelGroup[];
    undefinedChannels: Channel[];
    isLoading: boolean;
    error: string | null;
    loadData: (forceRefresh?: boolean, silent?: boolean) => Promise<void>;
    loadRelatedFiles: () => Promise<void>;
    loadDriveAccounts: () => Promise<void>;
    youtubeFiles: string[];
    driveFiles: string[];
    driveAccounts: DriveAccount[];
    updateChannelLanguageInState: (channelId: string, language: string) => void;
}

interface DriveAccount {
    name: string;
    email: string;
    expires_at: string;
    created_at: string;
}

type ManagerGroupsResponse = {
    ok?: boolean;
    groups?: Record<string, {
        name?: string;
        channels?: Array<{
            id: string;
            url?: string;
            title?: string;
            name?: string;
            thumbnail?: string;
            language?: string;
        }>;
    }> | Array<{
        name?: string;
        channels?: Array<{
            id: string;
            url?: string;
            title?: string;
            name?: string;
            thumbnail?: string;
            language?: string;
        }>;
    }>;
};

const normalizeGroups = (groups: ManagerGroupsResponse['groups']): ChannelGroup[] => {
    if (!groups) return [];

    const entries = Array.isArray(groups)
        ? groups.map(group => [group.name || '', group] as const)
        : Object.entries(groups);

    return entries
        .filter(([groupName]) => Boolean(groupName))
        .map(([groupName, group]) => ({
            name: group.name || groupName,
            channels: (group.channels || []).map(ch => ({
                id: ch.id,
                name: ch.name || ch.title || ch.id,
                title: ch.title,
                thumbnail: ch.thumbnail,
                tokenStatus: 'valid' as const,
                groupName: group.name || groupName,
                language: ch.language || getLanguageFromName(ch.name || ch.title || ch.id, ch.title || ''),
            })),
        }))
        .sort((a, b) => {
            if (a.name.toLowerCase() === 'default') return 1;
            if (b.name.toLowerCase() === 'default') return -1;
            return a.name.localeCompare(b.name);
        });
};

export const useYouTubeChannels = (): UseYouTubeChannelsResult => {
    const dataCache = useDataCache();
    const [groups, setGroups] = useState<ChannelGroup[]>([]);
    const [undefinedChannels, setUndefinedChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [youtubeFiles, setYouTubeFiles] = useState<string[]>([]);
    const [driveFiles, setDriveFiles] = useState<string[]>([]);
    const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>([]);

    const loadRelatedFiles = useCallback(async () => {
        try {
            const ytResponse = await fetch('/api/v1/youtube/tokens/list').catch(() => null);
            if (ytResponse?.ok) {
                const data = await ytResponse.json();
                setYouTubeFiles(data.files || []);
            }

            const driveResponse = await fetch('/api/drive/tokens/list').catch(() => null);
            if (driveResponse?.ok) {
                const data = await driveResponse.json();
                setDriveFiles(data.files || []);
            }
        } catch (err) {
            console.error('Failed to load related files:', err);
        }
    }, []);

    const loadDriveAccounts = useCallback(async () => {
        try {
            const testResponse = await fetch('/api/drive/tokens/list');
            const testData = await testResponse.json();
            const files = testData.files || [];
            if (files.length === 0) {
                console.warn('No Drive tokens configured');
            } else {
                console.warn('Drive tokens found:', files.length);
            }
        } catch (_err) {
            console.warn('Drive token test error');
        }

        let accounts: DriveAccount[] = [];
        try {
            const accountsResponse = await fetch('/api/drive/tokens/list');
            const accountsData = await accountsResponse.json();
            if (accountsData.files && Array.isArray(accountsData.files)) {
                accounts = accountsData.files.map((file: { name: string; path?: string }) => ({
                    name: file.name.replace('.json', ''),
                    email: `${file.name.replace('.json', '')}@account.local`,
                    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                }));
            }
        } catch (_err) {
            console.warn('Failed to load accounts from server, using fallback');
            accounts = driveFiles.map((filename: string) => ({
                name: filename,
                email: `${filename}@account.local`,
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
            }));
        }

        setDriveAccounts(accounts);
    }, [driveFiles]);

    const loadData = useCallback(async (forceRefresh = false, silent = false) => {
        if (forceRefresh) {
            dataCache.invalidate('groups');
        }
        if (!silent) {
            setIsLoading(true);
        }
        setError(null);

        try {
            const groupsResult = await dataCache.get(
                'groups',
                () => youtubeApi.managerGroups(),
                { ttl: 5 * 60 * 1000 }
            ).catch(() => ({ ok: false, groups: [], count: 0 }));

            const groupsData = groupsResult as ManagerGroupsResponse;
            setGroups(normalizeGroups(groupsData.groups));

            let undefinedChs: Channel[] = [];
            try {
                const undefinedResult = await youtubeApi.getUndefinedChannels();
                if (undefinedResult.ok && Array.isArray(undefinedResult.channels)) {
                    undefinedChs = undefinedResult.channels.map((ch: { id: string; name?: string; title?: string; thumbnail?: string; language?: string }) => ({
                        id: ch.id,
                        name: ch.name || ch.id,
                        title: ch.title,
                        thumbnail: ch.thumbnail,
                        tokenStatus: 'valid',
                        groupName: 'Undefined',
                        language: ch.language || getLanguageFromName(ch.name || ch.id, ch.title || ''),
                    }));
                    setUndefinedChannels(undefinedChs);
                } else {
                    setUndefinedChannels([]);
                }
            } catch (err) {
                console.warn('Could not load undefined channels:', err);
                setUndefinedChannels([]);
            }

            // Auto-detect language: track attempted channels to avoid infinite reload loops
            let attemptedSet: Set<string>;
            try {
                attemptedSet = new Set<string>(
                    JSON.parse(localStorage.getItem('youtube_auto_detect_attempted') || '[]')
                );
            } catch {
                attemptedSet = new Set<string>();
            }
            const channelsToDetect: { id: string; name: string }[] = [];

            // Collect from grouped channels
            for (const grp of normalizeGroups(groupsData.groups)) {
                for (const ch of grp.channels || []) {
                    if (!ch.language && !attemptedSet.has(ch.id)) {
                        channelsToDetect.push({ id: ch.id, name: ch.name || ch.id });
                    }
                }
            }

            // Collect from undefined channels
            for (const ch of undefinedChs) {
                if (!ch.language && !attemptedSet.has(ch.id)) {
                    channelsToDetect.push({ id: ch.id, name: ch.name || ch.id });
                }
            }

            // Batch auto-detect with Promise.allSettled, then reload
            if (channelsToDetect.length > 0) {
                const batch = channelsToDetect.slice(0, 5);
                const promises = batch.map(ch =>
                    youtubeApi.autoDetectLanguage(ch.id, ch.name)
                        .then(() => {
                            attemptedSet.add(ch.id);
                            localStorage.setItem('youtube_auto_detect_attempted', JSON.stringify([...attemptedSet]));
                        })
                        .catch((err: unknown) => {
                            attemptedSet.add(ch.id); // Mark as attempted even on failure
                            localStorage.setItem('youtube_auto_detect_attempted', JSON.stringify([...attemptedSet]));
                            console.warn(`Auto-detect failed for ${ch.name}:`, err);
                        })
                );

                // Reload data once all detections complete
                Promise.allSettled(promises).then(() => {
                    dataCache.invalidate('groups');
                    dataCache.invalidate('channels-validated');
                    loadData(true);
                });
            }
        } catch (err) {
            console.error('Failed to load channels:', err);
            setError('Impossibile caricare i canali YouTube');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadRelatedFiles();
        const intervalId = window.setInterval(() => {
            loadData(true, true);
        }, 6 * 60 * 60 * 1000);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (driveFiles.length > 0) {
            loadDriveAccounts();
        }
    }, [driveFiles, loadDriveAccounts]);

    const updateChannelLanguageInState = useCallback((channelId: string, language: string) => {
        setGroups(prevGroups =>
            prevGroups.map(group => ({
                ...group,
                channels: group.channels.map(channel =>
                    channel.id === channelId ? { ...channel, language } : channel
                ),
            }))
        );
        setUndefinedChannels(prevChannels =>
            prevChannels.map(channel =>
                channel.id === channelId ? { ...channel, language } : channel
            )
        );
    }, []);

    return {
        groups,
        undefinedChannels,
        isLoading,
        error,
        loadData,
        loadRelatedFiles,
        loadDriveAccounts,
        youtubeFiles,
        driveFiles,
        driveAccounts,
        updateChannelLanguageInState,
    };
};
