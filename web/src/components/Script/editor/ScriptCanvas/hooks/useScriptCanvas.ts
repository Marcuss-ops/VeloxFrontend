import { useState, useEffect, useCallback } from 'react';
import { VideoProject } from '../../../types';
import { normalizeTitle, normalizeLink, extractFirstYouTubeUrl } from '../../utils';
import { useScript } from '../../../../../app/providers/ScriptProvider';
import { ProjectHistoryItem } from '../../../modals/ProjectHistoryModal';

// --- Types ---

export interface TitleSourceHistoryItem {
    id: string;
    title: string;
    link: string;
    lastUsedAt: number;
    uses: number;
}

export interface DrivePickerState {
    open: boolean;
    type: 'initial' | 'inter' | 'final' | 'stock' | 'voiceover' | null;
}

export interface UseScriptCanvasParams {
    // State
    project: VideoProject;
    canUndo: boolean;
    titleLinkHistory: TitleSourceHistoryItem[];
    projectHistory: ProjectHistoryItem[];
    isGenerating: boolean;
    progress: { percent: number; status: string; logs: string[] };
    // Actions
    onProjectUpdate: (updated: Partial<VideoProject>) => void;
    onPushSelectionHistory: (p: VideoProject) => void;
    onUndo: () => void;
    // Modal state (controlled by parent)
    titleHistoryModalOpen?: boolean;
    setTitleHistoryModalOpen?: (open: boolean) => void;
    projectHistoryModalOpen?: boolean;
    setProjectHistoryModalOpen?: (open: boolean) => void;
    // History callbacks
    onUpsertTitleLink?: (title: string, link: string) => void;
    onDeleteTitleLink?: (itemId: string) => void;
    onClearTitleLinkHistory?: () => void;
    onMarkHistoryUsed?: (itemId: string) => void;
    onApplyProjectHistory?: (item: ProjectHistoryItem) => void;
    onDeleteProjectHistory?: (itemId: string) => void;
    onClearProjectHistory?: () => void;
}

export interface UseScriptCanvasReturn {
    // Constants
    CLIP_MASTER_ID: string;
    STOCK_MASTER_ID: string;
    VOICEOVER_MASTER_ID: string;
    // Drive picker
    drivePicker: DrivePickerState;
    setDrivePicker: React.Dispatch<React.SetStateAction<DrivePickerState>>;
    // Modal state
    isTitleModalOpen: boolean;
    setTitleModalOpen: (open: boolean) => void;
    isProjectModalOpen: boolean;
    setProjectModalOpen: (open: boolean) => void;
    // Callbacks
    handleDriveClick: (type: string, payload?: any) => void;
    handleSelectFolder: (folder: any) => void;
    handleSelectClip: (clip: any) => void;
    handleSelectClips: (clips: any[]) => void;
    handleOpenHistory: () => void;
    appendTitleFromHistory: (titleRaw: string) => void;
    appendLinkToSourceContext: (linkRaw: string) => void;
    handleMarkHistoryUsed: (itemId: string) => void;
    handleUpsertTitleLink: (title: string, link: string) => void;
    // Parent history callbacks (passthrough for modals)
    onDeleteTitleLink?: (itemId: string) => void;
    onClearTitleLinkHistory?: () => void;
    onApplyProjectHistory?: (item: ProjectHistoryItem) => void;
    onDeleteProjectHistory?: (itemId: string) => void;
    onClearProjectHistory?: () => void;
}

// --- Constants ---

const CLIP_MASTER_ID = '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS';
const STOCK_MASTER_ID = '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh';
const VOICEOVER_MASTER_ID = '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A';

const TITLE_LINK_HISTORY_KEY = 'studio_title_link_history_v1';
const PROJECT_HISTORY_KEY = 'studio_project_history_v1';

// --- Hook ---

export function useScriptCanvas(params: UseScriptCanvasParams): UseScriptCanvasReturn {
    const {
        project,
        titleLinkHistory,
        projectHistory,
        onProjectUpdate,
        onPushSelectionHistory,
        titleHistoryModalOpen,
        setTitleHistoryModalOpen,
        projectHistoryModalOpen,
        setProjectHistoryModalOpen,
        onUpsertTitleLink,
        onDeleteTitleLink,
        onClearTitleLinkHistory,
        onMarkHistoryUsed,
        onApplyProjectHistory,
        onDeleteProjectHistory,
        onClearProjectHistory,
    } = params;

    const { groupChannels } = useScript();

    // Use controlled modal state from props, or fallback to internal state
    const [internalTitleModalOpen, setInternalTitleModalOpen] = useState(false);
    const [internalProjectModalOpen, setInternalProjectModalOpen] = useState(false);

    // Determine which state to use
    const isTitleModalOpen = titleHistoryModalOpen !== undefined ? titleHistoryModalOpen : internalTitleModalOpen;
    const setTitleModalOpen = setTitleHistoryModalOpen || setInternalTitleModalOpen;
    const isProjectModalOpen = projectHistoryModalOpen !== undefined ? projectHistoryModalOpen : internalProjectModalOpen;
    const setProjectModalOpen = setProjectHistoryModalOpen || setInternalProjectModalOpen;

    const [drivePicker, setDrivePicker] = useState<DrivePickerState>({
        open: false,
        type: null,
    });
    const [groupChannelsTick, setGroupChannelsTick] = useState(0);

    // Save title link history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(TITLE_LINK_HISTORY_KEY, JSON.stringify(titleLinkHistory));
        } catch (e) {
            console.warn('[HISTORY] failed writing title-link history', e);
        }
    }, [titleLinkHistory]);

    // Save project history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(projectHistory));
        } catch (e) {
            console.warn('[HISTORY] failed writing project history', e);
        }
    }, [projectHistory]);

    // Listen for group channels updates
    useEffect(() => {
        const onGroupChannelsUpdated = () => setGroupChannelsTick((v) => v + 1);
        window.addEventListener('velox-group-channels-updated', onGroupChannelsUpdated);
        return () => window.removeEventListener('velox-group-channels-updated', onGroupChannelsUpdated);
    }, []);

    // Auto-select channels based on languages
    useEffect(() => {
        const group = project.youtubeGroup || '';
        if (!group) return;

        const rawChannels = groupChannels?.[group] || [];
        if (!Array.isArray(rawChannels) || rawChannels.length === 0) return;

        const keyOf = (c: any) => String(c?.id || c?.channel || '').trim();
        const langOf = (c: any) => String(c?.lang || '').toLowerCase();
        const byKey = new Map<string, any>();
        rawChannels.forEach((c: any) => byKey.set(keyOf(c), c));

        const pickByLang = (lang: string) => {
            const base = String(lang || '').split('-')[0].toLowerCase();
            const exact = rawChannels.find((c: any) => langOf(c) === base);
            if (exact) return keyOf(exact);
            const prefixed = rawChannels.find((c: any) => langOf(c).startsWith(`${base}-`));
            if (prefixed) return keyOf(prefixed);
            return keyOf(rawChannels[0]);
        };

        const current = project.youtubeChannelByLang || {};
        let changed = false;
        const next = { ...current };

        for (const lang of project.voiceoverLangs || []) {
            const existing = next[lang];
            if (existing && byKey.has(existing)) continue;
            const auto = pickByLang(lang);
            if (auto && auto !== existing) {
                next[lang] = auto;
                changed = true;
            }
        }

        for (const key of Object.keys(next)) {
            if (!(project.voiceoverLangs || []).includes(key)) {
                delete next[key];
                changed = true;
            }
        }

        if (!changed) return;
        onProjectUpdate({ youtubeChannelByLang: next });
    }, [project.youtubeGroup, project.voiceoverLangs, project.youtubeChannelByLang, groupChannelsTick, groupChannels, onProjectUpdate]);

    // Handle drive click
    const handleDriveClick = useCallback((type: string, payload?: any) => {
        const isHoverTrigger = payload?.source === 'hover';
        const isClipType = type === 'initial' || type === 'inter' || type === 'final';
        if (isHoverTrigger && !isClipType) return;
        console.warn(`[DRIVE] Triggering ${type}`, payload);

        if (isClipType) {
            setDrivePicker({ open: true, type: type as 'initial' | 'inter' | 'final' });
        } else if (type === 'stock') {
            setDrivePicker({ open: true, type: 'stock' });
        } else if (type === 'voiceover') {
            setDrivePicker({ open: true, type: 'voiceover' });
        } else if (!isHoverTrigger) {
            window.alert(`Azione Drive non disponibile per: ${type}`);
        }
    }, []);

    // Handle folder selection from DrivePickerModal
    const handleSelectFolder = useCallback((folder: any) => {
        if (!drivePicker.type) return;
        onPushSelectionHistory(project);

        if (drivePicker.type === 'stock') {
            const already = (project.stockTimestamps || []).some((s) => s.folder_id === folder.id);
            if (!already) {
                onProjectUpdate({
                    stockMainFolderId: folder.id,
                    stockMainFolderName: folder.name,
                    stockTimestamps: [
                        ...project.stockTimestamps,
                        {
                            start: '00:00',
                            end: '00:10',
                            folder_id: folder.id,
                            folder_name: folder.name,
                            source: 'drive',
                        },
                    ],
                });
            } else {
                onProjectUpdate({
                    stockMainFolderId: folder.id,
                    stockMainFolderName: folder.name,
                });
            }
        } else if (drivePicker.type === 'voiceover') {
            onProjectUpdate({
                voiceoverMainFolderId: folder.id,
                voiceoverMainFolderName: folder.name,
                voiceoverFolderId: folder.id,
                driveFolderId: folder.id,
            });
        } else {
            const key = drivePicker.type as 'initial' | 'inter' | 'final';
            const prevList = project.clipFolders[key] || [];
            const nextList = prevList.includes(folder.id) ? prevList : [...prevList, folder.id];
            onProjectUpdate({
                clipMainFolderId: folder.id,
                clipMainFolderName: folder.name,
                driveFolderId: folder.id,
                clipFolders: {
                    ...project.clipFolders,
                    [key]: nextList,
                },
            });
        }
        setDrivePicker({ open: false, type: null });
    }, [drivePicker.type, project, onProjectUpdate, onPushSelectionHistory]);

    // Handle clip selection
    const handleSelectClip = useCallback((clip: any) => {
        if (!drivePicker.type || drivePicker.type === 'stock' || drivePicker.type === 'voiceover') return;
        onPushSelectionHistory(project);
        const key = drivePicker.type as 'initial' | 'inter' | 'final';
        const prevList = project.clipFolders[key] || [];
        const value = clip.url || clip.id;
        const nextList = prevList.includes(value) ? prevList : [...prevList, value];
        onProjectUpdate({
            clipFolders: {
                ...project.clipFolders,
                [key]: nextList,
            },
        });
        setDrivePicker({ open: false, type: null });
    }, [drivePicker.type, project, onProjectUpdate, onPushSelectionHistory]);

    // Handle multiple clips selection
    const handleSelectClips = useCallback((clips: any[]) => {
        if (!drivePicker.type || drivePicker.type === 'stock' || drivePicker.type === 'voiceover') return;
        if (!clips.length) return;
        onPushSelectionHistory(project);
        const key = drivePicker.type as 'initial' | 'inter' | 'final';
        const prevList = project.clipFolders[key] || [];
        const values = clips.map((c) => c.url || c.id).filter(Boolean);
        const merged = [...prevList];
        for (const v of values) {
            if (!merged.includes(v)) merged.push(v);
        }
        onProjectUpdate({
            clipFolders: {
                ...project.clipFolders,
                [key]: merged,
            },
        });
        setDrivePicker({ open: false, type: null });
    }, [drivePicker.type, project, onProjectUpdate, onPushSelectionHistory]);

    // Upsert title link history - call parent callback
    const handleUpsertTitleLink = useCallback((title: string, link: string) => {
        if (onUpsertTitleLink) {
            onUpsertTitleLink(title, link);
        }
    }, [onUpsertTitleLink]);

    // Listen for payload events
    useEffect(() => {
        const onPayload = (event: Event) => {
            const detail = (event as CustomEvent)?.detail || {};
            const payload = detail?.payload || {};
            const title = String(detail?.title || payload?.video_name || '');
            const sourceCandidate = String(payload?.source_context || payload?.source || '');

            // Process the title and link
            const normalizedTitle = normalizeTitle(title);
            const payloadYoutube = normalizeLink(payload?.youtube_url || '');
            const sourceLink = payloadYoutube || extractFirstYouTubeUrl(sourceCandidate);

            if (normalizedTitle || sourceLink) {
                handleUpsertTitleLink(normalizedTitle, sourceLink);
            }
        };
        window.addEventListener('velox:create-master-payload', onPayload as EventListener);
        return () => window.removeEventListener('velox:create-master-payload', onPayload as EventListener);
    }, [handleUpsertTitleLink]);

    // Append title from history
    const appendTitleFromHistory = useCallback((titleRaw: string) => {
        const title = normalizeTitle(titleRaw);
        if (!title) return;
        const nextTitles = [...(project.titles || [''])];
        const firstEmpty = nextTitles.findIndex((t) => !String(t || '').trim());
        if (firstEmpty >= 0) nextTitles[firstEmpty] = title;
        else nextTitles.push(title);
        if (String(nextTitles[nextTitles.length - 1] || '').trim() !== '') nextTitles.push('');
        onProjectUpdate({ titles: nextTitles });
    }, [onProjectUpdate, project.titles]);

    // Append link to source context
    const appendLinkToSourceContext = useCallback((linkRaw: string) => {
        const link = normalizeLink(linkRaw);
        if (!link) return;
        const currentSource = String(project.sourceContext || '').trim();
        const lines = currentSource ? currentSource.split('\n').map((l) => l.trim()).filter(Boolean) : [];
        if (!lines.includes(link)) lines.push(link);
        onProjectUpdate({ sourceContext: lines.join('\n') });
    }, [onProjectUpdate, project.sourceContext]);

    // Handle mark history used - call parent callback
    const handleMarkHistoryUsed = useCallback((itemId: string) => {
        if (onMarkHistoryUsed) {
            onMarkHistoryUsed(itemId);
        }
    }, [onMarkHistoryUsed]);

    // Handle history modal open - use the correct setter
    const handleOpenHistory = useCallback(() => {
        if (setTitleModalOpen) {
            setTitleModalOpen(true);
        }
    }, [setTitleModalOpen]);

    return {
        CLIP_MASTER_ID,
        STOCK_MASTER_ID,
        VOICEOVER_MASTER_ID,
        drivePicker,
        setDrivePicker,
        isTitleModalOpen,
        setTitleModalOpen,
        isProjectModalOpen,
        setProjectModalOpen,
        handleDriveClick,
        handleSelectFolder,
        handleSelectClip,
        handleSelectClips,
        handleOpenHistory,
        appendTitleFromHistory,
        appendLinkToSourceContext,
        handleMarkHistoryUsed,
        handleUpsertTitleLink,
        onDeleteTitleLink,
        onClearTitleLinkHistory,
        onApplyProjectHistory,
        onDeleteProjectHistory,
        onClearProjectHistory,
    };
}
