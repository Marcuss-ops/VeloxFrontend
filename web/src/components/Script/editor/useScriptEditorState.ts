import { useState, useCallback, useEffect } from 'react';
import { createDefaultVideoProject, type VideoProject } from '../types';
import { useScript } from '../../../app/providers/ScriptProvider';

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

// Hook per lo stato dell'editor
export const useScriptEditorState = () => {
    const { setCurrentProject: syncCurrentProject, setProjects: syncProjects, setCurrentIndex: syncCurrentIndex } = useScript();

    const [projects, setProjects] = useState<VideoProject[]>(() => [createDefaultVideoProject()]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectionHistory, setSelectionHistory] = useState<SelectionSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
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

    // Gestione cambio gruppo/destinazione
    const handleGroupChange = useCallback((externalDestinationId: string) => {
        updateProject({
            youtubeGroup: externalDestinationId,
            externalDestinationId,
        });
    }, [updateProject]);

    // Synchronise editor state with the ScriptProvider context
    useEffect(() => {
        syncCurrentProject(project);
        syncProjects(projects);
        syncCurrentIndex(currentIndex);
    }, [project, projects, currentIndex, syncCurrentProject, syncProjects, syncCurrentIndex]);

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
    };
};

export default useScriptEditorState;
