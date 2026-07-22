import { useState, useEffect, useCallback, useMemo } from 'react';
import { driveApi, driveLinksApi, veloxApi, socialApi, type DriveFile as ApiDriveFile } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDataCache } from '@/hooks/useDataCache';
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

    const dataCache = useDataCache();

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

    // YouTube channels (kept for UI compatibility; populated from InstaEdit Velox destinations)
    const [channels, setChannels] = useState<{ id: string; name: string; thumbnail?: string }[]>([]);

    // Load InstaEdit Velox destinations (cached for 5 minutes)
    useEffect(() => {
        let cancelled = false;
        const loadDestinations = async () => {
            try {
                const res = await dataCache.get(
                    'velox-destinations',
                    () => socialApi.listDestinations(),
                    { ttl: 5 * 60 * 1000 }
                );
                if (cancelled) return;
                const destinations = (res as { destinations: Array<{ externalDestinationId: string; defaults?: { title?: string; name?: string } }> }).destinations || [];
                const mapped = destinations.map((d, idx) => ({
                    id: d.externalDestinationId,
                    name: d.defaults?.title || d.defaults?.name || `Destination ${idx + 1}`,
                }));
                setChannels(mapped);
            } catch (e) {
                if (!cancelled) console.error('[DriveImporter] Failed to load destinations:', e);
                if (!cancelled) setChannels([]);
            }
        };
        loadDestinations();
        return () => { cancelled = true; };
    }, []);

    // Load channel groups from API (cached for 5 minutes)
    // Kept as a single group wrapping the InstaEdit destinations for UI compatibility.
    useEffect(() => {
        let cancelled = false;
        const loadGroups = async () => {
            try {
                const res = await dataCache.get(
                    'velox-destinations-groups',
                    () => socialApi.listDestinations(),
                    { ttl: 5 * 60 * 1000 }
                );
                if (cancelled) return;
                const destinations = (res as { destinations: Array<{ externalDestinationId: string; defaults?: { title?: string; name?: string } }> }).destinations || [];
                const mapped = destinations.map((d, idx) => ({
                    id: d.externalDestinationId,
                    name: d.defaults?.title || d.defaults?.name || `Destination ${idx + 1}`,
                }));
                const group: ChannelGroup = {
                    id: 'all',
                    name: 'All destinations',
                    channels: mapped,
                };
                setChannelGroups([group]);
                if (!selectedGroup) {
                    setSelectedGroup(group.id);
                    setSelectedChannels(mapped.map(ch => ch.id));
                }
            } catch (e) {
                if (!cancelled) console.error('[DriveImporter] Failed to load destination groups:', e);
                setChannelGroups([]);
            }
        };
        loadGroups();
        return () => { cancelled = true; };
    }, [selectedGroup]);

    // Auto-select destination group based on folder name
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

    const buildMetadata = useCallback((file: FileItem): Record<string, unknown> => {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        const metadata: Record<string, unknown> = {
            title: title.trim() || stripExtension(file.name),
            description,
            tags: tagList,
            privacy_status: visibility,
        };
        if (scheduleDate && scheduleTime) {
            metadata.scheduled_time = `${scheduleDate}T${scheduleTime}`;
        }
        return metadata;
    }, [title, description, tags, visibility, scheduleDate, scheduleTime]);

    const createVeloxJobsForSelection = useCallback(async (): Promise<number> => {
        const selected = getSelectedFiles();
        if (selected.length === 0) return 0;
        if (selectedChannels.length === 0) {
            throw new Error('Select at least one destination');
        }

        let created = 0;
        for (const file of selected) {
            for (const destinationId of selectedChannels) {
                await veloxApi.createJob({
                    projectId: file.id,
                    renderSpec: {
                        type: 'passthrough',
                        source: 'drive',
                        driveFileId: file.id,
                        driveFileName: file.name,
                    },
                    deliveryPlan: {
                        destinations: [
                            {
                                externalDestinationId: destinationId,
                                metadata: buildMetadata(file),
                            },
                        ],
                    },
                });
                created++;
            }
        }
        return created;
    }, [getSelectedFiles, selectedChannels, buildMetadata]);

    const handlePublishNow = useCallback(async () => {
        const selected = getSelectedFiles();
        if (selected.length === 0) return;
        if (selectedChannels.length === 0) {
            alert('Select at least one destination.');
            return;
        }

        setIsPublishing(true);

        try {
            const count = await createVeloxJobsForSelection();
            setSelectedIds(new Set());
            setTitle('');
            setDescription('');
            setTags('');
            alert(`${count} Velox job${count !== 1 ? 's' : ''} created successfully.`);
        } catch (err) {
            console.error('Failed to publish:', err);
            alert(err instanceof Error ? err.message : 'Publishing failed.');
        } finally {
            setIsPublishing(false);
        }
    }, [createVeloxJobsForSelection, getSelectedFiles, selectedChannels]);

    const handleSchedule = useCallback(async () => {
        if (!scheduleDate || !scheduleTime) {
            alert('Select a date and time for publishing.');
            return;
        }

        const selected = getSelectedFiles();
        if (selected.length === 0) return;

        setIsPublishing(true);

        try {
            const count = await createVeloxJobsForSelection();
            setSelectedIds(new Set());
            setTitle('');
            setDescription('');
            setTags('');
            setScheduleDate('');
            setScheduleTime('');
            alert(`${count} Velox job${count !== 1 ? 's' : ''} scheduled for ${scheduleDate} at ${scheduleTime}.`);
        } catch (err) {
            console.error('Failed to schedule:', err);
            alert(err instanceof Error ? err.message : 'Scheduling failed.');
        } finally {
            setIsPublishing(false);
        }
    }, [createVeloxJobsForSelection, getSelectedFiles, scheduleDate, scheduleTime]);

    const formatSize = useCallback((bytes?: number) => {
        if (!bytes) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let value = bytes;
        while (value >= 1024 && i < units.length - 1) {
            value /= 1024;
            i++;
        }
        return `${value.toFixed(1)} ${units[i]}`;
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
