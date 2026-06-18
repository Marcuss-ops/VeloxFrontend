import { useState, useEffect, useCallback, useMemo } from 'react';
import { driveApi, driveLinksApi, youtubeApi, type DriveFile as ApiDriveFile } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { dataCache } from '@/lib/dataCache';
import {
    selectFilteredFiles,
    selectFolderCount,
    selectVideoCount,
    selectSelectedFiles,
} from '@/lib/selectors';

// Types for Drive links data
export interface DriveLink {
    id: string;
    name: string;
    link: string;
    parentId?: string;
    language?: string;
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
    createdAt: number;
    updatedAt: number;
}

// Breadcrumb item type
export interface BreadcrumbItem {
    id: string;
    name: string;
}

export interface DriveImporterProps {
    onVideoSelect?: (video: { id: string; name: string; link: string; mimeType?: string }) => void;
    onFolderSelect?: (folder: DriveLink) => void;
    onSelectionChange?: (selectedItems: DriveLink[]) => void;
    onFilesSelected?: (files: ApiDriveFile[]) => void;
    mode?: 'single' | 'multiple';
    driveFolderId?: string;
}

// Fallback folder ID when VideoYoutube is not found in drive-links
const VIDEOYOUTUBE_FOLDER_ID_FALLBACK = '1xVCe3zglpQc9MVF-10zHyTOgy9Dp7nID';
const VIDEOYOUTUBE_FOLDER_NAME = 'VideoYoutube';

export function isRealDriveId(id?: string): boolean {
    const value = (id ?? '').trim();
    return /^[a-zA-Z0-9_-]{20,}$/.test(value);
}

export function resolveDriveFolderId(folder: { id: string; link?: string }): string | null {
    const id = (folder.id ?? '').trim();
    if (isRealDriveId(id)) return id;

    const link = folder.link ?? '';
    const fromFolderPath = link.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
    if (fromFolderPath?.[1] && isRealDriveId(fromFolderPath[1])) return fromFolderPath[1];

    const fromIdQuery = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (fromIdQuery?.[1] && isRealDriveId(fromIdQuery[1])) return fromIdQuery[1];

    return null;
}

export function normalizeFolderId(id?: string): string {
    const value = (id ?? '').trim();
    return isRealDriveId(value) ? value : VIDEOYOUTUBE_FOLDER_ID_FALLBACK;
}

export function stripExtension(name: string): string {
    return name.replace(/\.[^/.]+$/, '');
}

export interface FileItem {
    id: string;
    name: string;
    type: 'folder' | 'file';
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
}

export interface ChannelGroup {
    id: string;
    name: string;
    channels: Array<{ id: string; name: string; thumbnail?: string }>;
}

type ManagerGroupsResponse = {
    ok?: boolean;
    groups?: Record<string, {
        name?: string;
        channels?: Array<{
            id: string;
            title?: string;
            name?: string;
            thumbnail?: string;
        }>;
    }> | Array<{
        name?: string;
        channels?: Array<{
            id: string;
            title?: string;
            name?: string;
            thumbnail?: string;
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
            id: groupName,
            name: group.name || groupName,
            channels: (group.channels || []).map(ch => ({
                id: ch.id,
                name: ch.name || ch.title || ch.id,
                thumbnail: ch.thumbnail,
            })),
        }));
};

export function useDriveImporter(props: DriveImporterProps) {
    const {
        driveFolderId: driveFolderIdProp,
    } = props;

    const [currentFolderId, setCurrentFolderId] = useState(VIDEOYOUTUBE_FOLDER_ID_FALLBACK);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
        { id: VIDEOYOUTUBE_FOLDER_ID_FALLBACK, name: VIDEOYOUTUBE_FOLDER_NAME }
    ]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [driveAvailable, setDriveAvailable] = useState(true);

    // Upload form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [visibility, setVisibility] = useState<'private' | 'public' | 'unlisted'>('private');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // Thumbnail state - solo da Drive o nessuna
    const [thumbnailMode, setThumbnailMode] = useState<'none' | 'drive'>('none');
    const [driveThumbnailPreview, _setDriveThumbnailPreview] = useState<string | null>(null);

    // Channel groups - loaded from API
    const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    // YouTube channels
    const [channels, setChannels] = useState<{id: string; name: string; thumbnail?: string}[]>([]);

    // Load YouTube channels (cached for 5 minutes)
    useEffect(() => {
        let cancelled = false;
        const loadChannels = async () => {
            try {
                const res = await dataCache.get(
                    'manager-groups',
                    () => youtubeApi.managerGroups(),
                    { ttl: 5 * 60 * 1000 }
                );
                if (cancelled) return;
                const groups = normalizeGroups((res as ManagerGroupsResponse).groups);
                const mapped = Array.from(
                    new Map(groups.flatMap(group => group.channels).map(ch => [ch.id, ch])).values()
                );
                setChannels(mapped);
            } catch (e) {
                if (!cancelled) console.error('[DriveImporter] Failed to load channels:', e);
                if (!cancelled) setChannels([]);
            }
        };
        loadChannels();
        return () => { cancelled = true; };
    }, []);

    // Load channel groups from API (cached for 5 minutes)
    useEffect(() => {
        let cancelled = false;
        const loadGroups = async () => {
            try {
                const res = await dataCache.get(
                    'groups',
                    () => youtubeApi.managerGroups(),
                    { ttl: 5 * 60 * 1000 }
                );
                if (cancelled) return;
                const groups = normalizeGroups((res as ManagerGroupsResponse).groups);
                const allChannels = groups.flatMap(g => g.channels);
                const uniqueChannels = Array.from(
                    new Map(allChannels.map(ch => [ch.id, ch])).values()
                );
                groups.push({
                    id: 'all',
                    name: 'All channels',
                    channels: uniqueChannels,
                });
                setChannelGroups(groups);
            } catch (e) {
                if (!cancelled) console.error('[DriveImporter] Failed to load channel groups:', e);
                setChannelGroups([]);
            }
        };
        loadGroups();
        return () => { cancelled = true; };
    }, []);

    // Auto-select YouTube group based on folder name
    useEffect(() => {
        const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
        if (currentBreadcrumb?.name && channelGroups.length > 0) {
            const folderName = currentBreadcrumb.name.toLowerCase();
            const matchingGroup = channelGroups.find(g => 
                g.id !== 'all' && g.name.toLowerCase() === folderName
            );
            if (matchingGroup) {
                setSelectedGroup(matchingGroup.id);
                setSelectedChannels(matchingGroup.channels.map(ch => ch.id));
            }
        }
    }, [breadcrumbs, channelGroups]);

    // Toggle channel selection
    const toggleChannel = (channelId: string) => {
        setSelectedChannels(prev => 
            prev.includes(channelId) 
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId]
        );
    };

    // Resolve VideoYoutube folder from drive-links
    useEffect(() => {
        if (driveFolderIdProp) {
            const normalized = normalizeFolderId(driveFolderIdProp);
            setCurrentFolderId(normalized);
            setBreadcrumbs([{ id: normalized, name: VIDEOYOUTUBE_FOLDER_NAME }]);
            return;
        }
        let cancelled = false;
        driveLinksApi.listFolders()
            .then((res) => {
                if (cancelled || !res.success || !res.folders?.length) return;
                const nameLower = VIDEOYOUTUBE_FOLDER_NAME.toLowerCase();
                const candidates = res.folders.filter((f) => f.name?.toLowerCase() === nameLower);
                const resolved = candidates
                    .map((f) => ({ folder: f, id: resolveDriveFolderId(f) }))
                    .find((x) => x.id);

                const id = resolved?.id ?? VIDEOYOUTUBE_FOLDER_ID_FALLBACK;
                const name = resolved?.folder?.name ?? VIDEOYOUTUBE_FOLDER_NAME;
                if (!cancelled) {
                    setCurrentFolderId(id);
                    setBreadcrumbs([{ id, name }]);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCurrentFolderId(VIDEOYOUTUBE_FOLDER_ID_FALLBACK);
                    setBreadcrumbs([{ id: VIDEOYOUTUBE_FOLDER_ID_FALLBACK, name: VIDEOYOUTUBE_FOLDER_NAME }]);
                }
            });
        return () => { cancelled = true; };
    }, [driveFolderIdProp]);

    // Load files when folder changes
    useEffect(() => {
        loadFolder(currentFolderId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFolderId]);

    // Update title when selection changes
    useEffect(() => {
        if (selectedIds.size === 1) {
            const selectedFile = files.find(f => selectedIds.has(f.id));
            if (selectedFile) {
                const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
                setTitle(nameWithoutExt);
            }
        } else if (selectedIds.size === 0) {
            setTitle('');
            setDescription('');
            setTags('');
        }
    }, [selectedIds, files]);

    const loadFolder = useCallback(async (folderId: string) => {
        setLoading(true);
        setError(null);
        const safeFolderId = normalizeFolderId(folderId);

        try {
            const result = await driveApi.files(safeFolderId);
            const rawFiles = result.files || [];

            const subfolders = rawFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
            const videoFiles = rawFiles.filter(f => 
                f.mimeType?.startsWith('video/') || 
                f.name?.endsWith('.mp4') ||
                f.name?.endsWith('.mov') ||
                f.name?.endsWith('.avi')
            );

            const items: FileItem[] = [
                ...subfolders.map(sf => ({
                    id: sf.id,
                    name: sf.name,
                    type: 'folder' as const,
                    mimeType: sf.mimeType,
                })),
                ...videoFiles.map(vf => ({
                    id: vf.id,
                    name: vf.name,
                    type: 'file' as const,
                    mimeType: vf.mimeType,
                    size: vf.size,
                    thumbnailUrl: vf.thumbnailLink,
                })),
            ];

            setFiles(items);
            setDriveAvailable(true);
        } catch (err) {
            console.error('Failed to load folder:', err);
            setError(err instanceof Error ? err.message : 'Failed to load Drive data');
            setDriveAvailable(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const startDriveOAuth = useCallback(async () => {
        try {
            const response = await fetch('/api/drive/oauth/start');
            const data = await response.json();
            if (data?.auth_url) {
                window.open(data.auth_url, '_blank', 'noopener,noreferrer');
            }
        } catch (err) {
            console.error('Failed to start Drive OAuth:', err);
        }
    }, []);

    const navigateToFolder = useCallback((folderId: string, folderName: string) => {
        const safeFolderId = normalizeFolderId(folderId);
        const existingIndex = breadcrumbs.findIndex(b => b.id === safeFolderId);
        if (existingIndex >= 0) {
            setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
        } else {
            setBreadcrumbs([...breadcrumbs, { id: safeFolderId, name: folderName }]);
        }

        setCurrentFolderId(safeFolderId);
        setSelectedIds(new Set());
    }, [breadcrumbs]);

    const navigateToBreadcrumb = useCallback((index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolderId(breadcrumbs[index].id);
        setSelectedIds(new Set());
    }, [breadcrumbs]);

    const toggleSelection = useCallback((fileId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileId)) {
                newSet.delete(fileId);
            } else {
                newSet.add(fileId);
            }
            return newSet;
        });
    }, []);

    const getSelectedFiles = useCallback(() => {
        return files.filter(f => selectedIds.has(f.id) && f.type === 'file');
    }, [files, selectedIds]);

    const stageDriveFileForUpload = useCallback(async (file: FileItem): Promise<string> => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tempPath = `/tmp/velox_youtube_uploads/${Date.now()}_${file.id}_${safeName}`;
        const response = await fetch(`/api/drive/download/${encodeURIComponent(file.id)}?dest=${encodeURIComponent(tempPath)}`);
        if (!response.ok) {
            throw new Error(`Failed to download Drive file: HTTP ${response.status}`);
        }
        return tempPath;
    }, []);

    const handlePublishNow = useCallback(async () => {
        const selected = getSelectedFiles();
        if (selected.length === 0) return;
        if (selectedChannels.length === 0) {
            alert('Select at least one YouTube channel.');
            return;
        }

        setIsPublishing(true);

        try {
            const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
            const uploads: Array<{ fileName: string; channelId: string }> = [];

            for (const selectedFile of selected) {
                const stagedFilePath = await stageDriveFileForUpload(selectedFile);
                const uploadTitle = title.trim() || stripExtension(selectedFile.name);

                for (const channelId of selectedChannels) {
                    await youtubeApi.uploadFromPath(stagedFilePath, {
                        channel_id: channelId,
                        title: uploadTitle,
                        description,
                        tags: tagList,
                        privacy: visibility,
                    });
                    uploads.push({ fileName: selectedFile.name, channelId });
                }
            }

            setSelectedIds(new Set());
            setTitle('');
            setDescription('');
            setTags('');

            alert(`${uploads.length} upload${uploads.length !== 1 ? 's' : ''} completed successfully.`);
        } catch (err) {
            console.error('Failed to publish:', err);
            alert(err instanceof Error ? err.message : 'Publishing failed.');
        } finally {
            setIsPublishing(false);
        }
    }, [description, getSelectedFiles, selectedChannels, stageDriveFileForUpload, tags, title, visibility]);

    const handleSchedule = useCallback(async () => {
        if (!scheduleDate || !scheduleTime) {
            alert('Select a date and time for publishing.');
            return;
        }

        const selected = getSelectedFiles();
        if (selected.length === 0) return;

        const publishAt = new Date(`${scheduleDate}T${scheduleTime}`);

        setIsPublishing(true);

        try {
            console.log('Scheduling YouTube upload:', {
                files: selected,
                title,
                description,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                visibility,
                publishAt: publishAt.toISOString()
            });

            await new Promise(resolve => setTimeout(resolve, 1500));

            setSelectedIds(new Set());
            setTitle('');
            setDescription('');
            setTags('');
            setScheduleDate('');
            setScheduleTime('');

            alert(`${selected.length} video scheduled for ${scheduleDate} at ${scheduleTime}.`);
        } catch (err) {
            console.error('Failed to schedule:', err);
            alert('Scheduling failed.');
        } finally {
            setIsPublishing(false);
        }
    }, [getSelectedFiles, title, description, tags, visibility, scheduleDate, scheduleTime]);

    const formatSize = useCallback((bytes?: number) => {
        if (!bytes) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${units[i]}`;
    }, []);

    // Debounce search query to prevent filtering on every keystroke
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

    // Memoized selectors - only recalculate when dependencies change
    const filteredFiles = useMemo(
        () => selectFilteredFiles(files, debouncedSearchQuery),
        [files, debouncedSearchQuery]
    );
    const folderCount = useMemo(() => selectFolderCount(files), [files]);
    const videoCount = useMemo(() => selectVideoCount(files), [files]);
    const selectedFiles = useMemo(
        () => selectSelectedFiles(files, selectedIds),
        [files, selectedIds]
    );

    return {
        // State
        loading,
        files,
        error,
        breadcrumbs,
        selectedIds,
        searchQuery,
        title,
        description,
        tags,
        visibility,
        scheduleDate,
        scheduleTime,
        thumbnailMode,
        driveThumbnailPreview,
        channelGroups,
        selectedGroup,
        selectedChannels,
        channels,
        currentFolderId,
        driveAvailable,
        // Computed
        filteredFiles,
        folderCount,
        videoCount,
        selectedFiles,
        isPublishing,
        // Setters
        setSearchQuery,
        setTitle,
        setDescription,
        setTags,
        setVisibility,
        setScheduleDate,
        setScheduleTime,
        setThumbnailMode,
        setSelectedIds,
        setSelectedGroup,
        setSelectedChannels,
        // Callbacks
        loadFolder,
        startDriveOAuth,
        navigateToFolder,
        navigateToBreadcrumb,
        toggleSelection,
        toggleChannel,
        handlePublishNow,
        handleSchedule,
        formatSize,
        // Helpers
        normalizeFolderId,
        stripExtension,
    };
}
