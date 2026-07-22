import { useState, useCallback, useEffect, useRef } from 'react';
import { createDefaultVideoProject, type VideoProject } from '../types';
import { useScript } from '../../../app/providers/ScriptProvider';
import { driveApiExtended } from '../../../lib/api';

// Drive group entry interface
export interface DriveGroupEntry {
    group?: string;
    display?: string;
    stock?: { id?: string; name?: string };
    clip?: { id?: string; name?: string };
    voiceover?: { id?: string; name?: string };
}

// Drive folder interface
export interface DriveFolder {
    id?: string;
    name?: string;
    language?: string;
}

// Selection snapshot interface
export interface SelectionSnapshot {
    projectIndex: number;
    clipFolders: VideoProject['clipFolders'];
    stockTimestamps: VideoProject['stockTimestamps'];
    voiceoverFolderId?: string | null;
    driveFolderId?: string | null;
    clipMainFolderId?: string | null;
    clipMainFolderName?: string | null;
    stockMainFolderId?: string | null;
    stockMainFolderName?: string | null;
    voiceoverMainFolderId?: string | null;
    voiceoverMainFolderName?: string | null;
}

// Editor state interface
export interface ScriptEditorState {
    projects: VideoProject[];
    currentIndex: number;
    selectionHistory: SelectionSnapshot[];
    isLoading: boolean;
}

// Editor actions interface
export interface ScriptEditorActions {
    project: VideoProject;
    canUndo: boolean;
    updateProject: (updated: Partial<VideoProject>) => void;
    addProject: () => void;
    setCurrentIndex: (index: number) => void;
    undoLastSelection: () => void;
}

// Master folder IDs (drive_links.json)
const CLIP_MASTER_ID = '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS';
const STOCK_MASTER_ID = '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh';
const VOICEOVER_MASTER_ID = '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A';

// Hook per lo stato dell'editor
export const useScriptEditorState = () => {
    const { setCurrentProject: syncCurrentProject, setProjects: syncProjects, setCurrentIndex: syncCurrentIndex } = useScript();

    const [projects, setProjects] = useState<VideoProject[]>(() => [createDefaultVideoProject()]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectionHistory, setSelectionHistory] = useState<SelectionSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const driveGroupsRef = useRef<any[] | null>(null);

    const project = projects[currentIndex] || createDefaultVideoProject();
    const canUndoCurrentProject = selectionHistory.some((s) => s.projectIndex === currentIndex);

    // Crea snapshot delle selezioni correnti
    const snapshotSelections = useCallback((p: VideoProject, idx: number): SelectionSnapshot => ({
        projectIndex: idx,
        clipFolders: {
            initial: [...(p.clipFolders.initial || [])],
            inter: [...(p.clipFolders.inter || [])],
            final: [...(p.clipFolders.final || [])],
        },
        stockTimestamps: [...(p.stockTimestamps || [])],
        voiceoverFolderId: p.voiceoverFolderId || null,
        driveFolderId: p.driveFolderId || null,
        clipMainFolderId: p.clipMainFolderId || null,
        clipMainFolderName: p.clipMainFolderName || null,
        stockMainFolderId: p.stockMainFolderId || null,
        stockMainFolderName: p.stockMainFolderName || null,
        voiceoverMainFolderId: p.voiceoverMainFolderId || null,
        voiceoverMainFolderName: p.voiceoverMainFolderName || null,
    }), []);

    // Aggiorna il progetto corrente
    const updateProject = useCallback((updated: Partial<VideoProject>) => {
        setProjects(prev => prev.map((p, i) => i === currentIndex ? { ...p, ...updated } : p));
    }, [currentIndex]);

    // Aggiunge un nuovo progetto
    const addProject = useCallback(() => {
        setProjects(prev => {
            const newProjects = [...prev, createDefaultVideoProject()];
            setCurrentIndex(newProjects.length - 1);
            return newProjects;
        });
    }, []);

    // Push della selezione corrente nella history
    const pushSelectionHistory = useCallback((p: VideoProject) => {
        setSelectionHistory((prev) => [...prev.slice(-29), snapshotSelections(p, currentIndex)]);
    }, [snapshotSelections, currentIndex]);

    // Annulla l'ultima selezione
    const undoLastSelection = useCallback(() => {
        setSelectionHistory((prev) => {
            if (prev.length === 0) return prev;
            let targetPos = -1;
            for (let i = prev.length - 1; i >= 0; i -= 1) {
                if (prev[i].projectIndex === currentIndex) {
                    targetPos = i;
                    break;
                }
            }
            if (targetPos === -1) return prev;
            const last = prev[targetPos];
        setProjects((all) => all.map((p, i) => {
                if (i !== currentIndex) return p;
                return {
                    ...p,
                    ...last,
                    clipFolders: {
                        initial: [...(last.clipFolders.initial || [])],
                        inter: [...(last.clipFolders.inter || [])],
                        final: [...(last.clipFolders.final || [])],
                    },
                    stockTimestamps: [...(last.stockTimestamps || [])],
                };
            }));
            return prev.filter((_, idx) => idx !== targetPos);
        });
    }, [currentIndex]);

    // Fetch dei gruppi Drive
    const fetchDriveGroups = useCallback(async () => {
        if (driveGroupsRef.current) return driveGroupsRef.current;
        try {
            const data = await driveApiExtended.groups() as { ok?: boolean; groups?: DriveGroupEntry[] };
            if (!data?.ok || !Array.isArray(data.groups)) return null;
            driveGroupsRef.current = data.groups;
            return data.groups;
        } catch (e) {
            console.warn('[SCRIPT] fetchDriveGroups failed', e);
            return null;
        }
    }, []);

    // Trova un gruppo Drive per nome
    const findDriveGroup = useCallback((groups: DriveGroupEntry[] | null, groupName: string) => {
        if (!groups || !groupName) return null;
        const g = groupName.toLowerCase().trim();
        return groups.find((item) => {
            const key = String(item?.group || '').toLowerCase();
            const display = String(item?.display || '').toLowerCase();
            return key === g || display === g;
        });
    }, []);

    // Log delle cartelle di default per un gruppo
    const logDefaultFoldersForGroup = useCallback((stockName: string, clipName: string, voiceoverName: string) => {
            console.warn(
            '[SCRIPT] Gruppo selezionato — Cartella Stock di default: %s, Cartella Clip: %s, Cartella Voiceover: %s',
            stockName || '-',
            clipName || '-',
            voiceoverName || '-',
        );
    }, []);

    // Pre-carica le cartelle Drive per un gruppo
    const preloadDriveFoldersForGroup = useCallback(async (group: string) => {
        const g = (group || '').trim();
        if (!g) return;
        try {
            const groups = await fetchDriveGroups();
            const entry = findDriveGroup(groups, g);
            if (entry) {
                const stockName = entry?.stock?.name || entry?.stock?.id || '-';
                const clipName = entry?.clip?.name || entry?.clip?.id || '-';
                const voiceoverName = entry?.voiceover?.name || entry?.voiceover?.id || '-';
                logDefaultFoldersForGroup(stockName, clipName, voiceoverName);

                setProjects((prev) => prev.map((p, i) => {
                    if (i !== currentIndex) return p;
                    return {
                        ...p,
                        clipMainFolderId: entry?.clip?.id || null,
                        clipMainFolderName: entry?.clip?.name || null,
                        stockMainFolderId: entry?.stock?.id || null,
                        stockMainFolderName: entry?.stock?.name || null,
                        voiceoverMainFolderId: entry?.voiceover?.id || null,
                        voiceoverMainFolderName: entry?.voiceover?.name || null,
                        driveFolderId: entry?.clip?.id || p.driveFolderId || null,
                        voiceoverFolderId: entry?.voiceover?.id || p.voiceoverFolderId || null,
                    };
                }));
                return;
            }

            // Fallback: risolvi da drive_links (tre master)
            const want = g.toLowerCase();
            const normalize = (s: string) => (s || '').trim().toLowerCase();
            let stockLabel = '-';
            let clipLabel = '-';
            let voiceoverLabel = '-';
            try {
                const [stockRes, clipRes, voiceRes] = await Promise.all([
                    fetch('/api/drive/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: STOCK_MASTER_ID }) }),
                    fetch('/api/drive/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: CLIP_MASTER_ID }) }),
                    fetch('/api/drive/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: VOICEOVER_MASTER_ID }) }),
                ]);
                const parse = async (r: Response) => {
                    const text = await r.text();
                    try {
                        const data = JSON.parse(text);
                        return (data?.folders || []) as { id?: string; name?: string }[];
                    } catch {
                        return [];
                    }
                };
                const [stockFolders, clipFolders, voiceFolders] = await Promise.all([parse(stockRes), parse(clipRes), parse(voiceRes)]);
                const find = (arr: { id?: string; name?: string }[]) =>
                    arr.find((f) => normalize(String(f.name || '')) === want || normalize(String((f as any).language || '')) === want);
                const s = find(stockFolders);
                const c = find(clipFolders);
                const v = find(voiceFolders);
                if (s) stockLabel = s.name || s.id || '-';
                if (c) clipLabel = c.name || c.id || '-';
                if (v) voiceoverLabel = v.name || v.id || '-';
            } catch (_) {
                /* ignore */
            }
            logDefaultFoldersForGroup(stockLabel, clipLabel, voiceoverLabel);
        } catch (e) {
            console.warn('[DRIVE] preload group folders failed', e);
        }
    }, [fetchDriveGroups, findDriveGroup, logDefaultFoldersForGroup, currentIndex]);

    // Gestione cambio gruppo
    const handleGroupChange = useCallback((group: string) => {
        updateProject({ youtubeGroup: group });
        console.warn('[SCRIPT] Gruppo selezionato:', group || '-');
        preloadDriveFoldersForGroup(group);
    }, [updateProject, preloadDriveFoldersForGroup]);

    // Synchronise editor state with the ScriptProvider context
    useEffect(() => {
        syncCurrentProject(project);
        syncProjects(projects);
        syncCurrentIndex(currentIndex);
    }, [project, projects, currentIndex, syncCurrentProject, syncProjects, syncCurrentIndex]);

    // Pre-carica cartelle quando cambia il gruppo
    useEffect(() => {
        if (project.youtubeGroup && !project.clipMainFolderId && !project.stockMainFolderId && !project.voiceoverMainFolderId) {
            preloadDriveFoldersForGroup(project.youtubeGroup);
        }
    }, [project.youtubeGroup, project.clipMainFolderId, project.stockMainFolderId, project.voiceoverMainFolderId, currentIndex, preloadDriveFoldersForGroup]);

    // Clear pending projects and reset to single empty project on mount
    useEffect(() => {
        const clearPendingProjects = () => {
            try {
                localStorage.removeItem('studio_pending_projects_v1');
                console.warn('[PENDING] Cleared all pending projects');
            } catch (e) {
                console.warn('[PENDING] Failed to clear pending projects', e);
            }
        };
        clearPendingProjects();
        setProjects([createDefaultVideoProject()]);
        setCurrentIndex(0);
    }, []);

    return {
        // State
        projects,
        currentIndex,
        selectionHistory,
        isLoading,
        setIsLoading,
        // Actions
        project,
        canUndo: canUndoCurrentProject,
        updateProject,
        addProject,
        setCurrentIndex,
        undoLastSelection,
        pushSelectionHistory,
        handleGroupChange,
        preloadDriveFoldersForGroup,
    };
};

export default useScriptEditorState;
