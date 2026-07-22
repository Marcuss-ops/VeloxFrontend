import { useState, useCallback, useEffect } from 'react';
import { VideoProject } from '../types';

import { ProjectHistoryItem } from '../modals/ProjectHistoryModal';

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

export function useDrivePicker() {
    const [drivePicker, setDrivePicker] = useState<DrivePickerState>({
        open: false,
        type: null,
    });

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

    const closeDrivePicker = useCallback(() => {
        setDrivePicker({ open: false, type: null });
    }, []);

    return { drivePicker, setDrivePicker, handleDriveClick, closeDrivePicker };
}

export function useHistoryPersistence(
    titleLinkHistory: TitleSourceHistoryItem[],
    projectHistory: ProjectHistoryItem[]
) {
    useEffect(() => {
        try {
            localStorage.setItem('studio_title_link_history_v1', JSON.stringify(titleLinkHistory));
        } catch (e) {
            console.warn('[HISTORY] failed writing title-link history', e);
        }
    }, [titleLinkHistory]);

    useEffect(() => {
        try {
            localStorage.setItem('studio_project_history_v1', JSON.stringify(projectHistory));
        } catch (e) {
            console.warn('[HISTORY] failed writing project history', e);
        }
    }, [projectHistory]);
}

export function useModalState(
    titleHistoryModalOpen?: boolean,
    setTitleHistoryModalOpen?: (open: boolean) => void,
    projectHistoryModalOpen?: boolean,
    setProjectHistoryModalOpen?: (open: boolean) => void
) {
    const [internalTitleModalOpen, setInternalTitleModalOpen] = useState(false);
    const [internalProjectModalOpen, setInternalProjectModalOpen] = useState(false);

    const isTitleModalOpen = titleHistoryModalOpen !== undefined ? titleHistoryModalOpen : internalTitleModalOpen;
    const setTitleModalOpen = setTitleHistoryModalOpen || setInternalTitleModalOpen;
    const isProjectModalOpen = projectHistoryModalOpen !== undefined ? projectHistoryModalOpen : internalProjectModalOpen;
    const setProjectModalOpen = setProjectHistoryModalOpen || setInternalProjectModalOpen;

    return { isTitleModalOpen, setTitleModalOpen, isProjectModalOpen, setProjectModalOpen };
}

export function useClipEvents(
    drivePicker: DrivePickerState,
    project: VideoProject,
    onProjectUpdate: (updated: Partial<VideoProject>) => void,
    onPushSelectionHistory: (p: VideoProject) => void,
    onClose: () => void
) {
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
        onClose();
    }, [drivePicker.type, project, onProjectUpdate, onPushSelectionHistory, onClose]);

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
        onClose();
    }, [drivePicker.type, project, onProjectUpdate, onPushSelectionHistory, onClose]);

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
        onClose();
    }, [drivePicker.type, project, onProjectUpdate, onPushSelectionHistory, onClose]);

    return { handleSelectFolder, handleSelectClip, handleSelectClips };
}
