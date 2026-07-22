import React, { useState, useEffect, useCallback } from 'react';
import { VideoStyle } from '../types';
import { useScriptGenerator } from '../hooks/useScriptGenerator';
import { useScriptEditorState } from '../editor/useScriptEditorState';
import { ScriptToolbar } from '../editor/ScriptToolbar';
import { ScriptCanvas } from '../editor/ScriptCanvas';
import { useAutoLanguageDetection } from '../editor/ScriptToolbar';
import { normalizeTitle, normalizeLink, historyItemKey } from '../editor/utils';
import { ProjectHistoryItem } from '../modals/ProjectHistoryModal';

// History types
interface TitleSourceHistoryItem {
    id: string;
    title: string;
    link: string;
    lastUsedAt: number;
    uses: number;
}

// History constants
const MAX_TITLE_LINK_HISTORY = 200;
const PENDING_PROJECTS_KEY = 'studio_pending_projects_v1';

// Pending project utilities
interface PendingProject {
    id: string;
    title: string;
    url: string;
    group?: string;
    addedAt: number;
}

/**
 * Saves a pending project to localStorage for later processing.
 * @param data - The project data to save
 * @param data.title - The title of the video project
 * @param data.url - The YouTube URL of the video
 * @param data.group - Optional group/category for the project
 * @returns {boolean} True if the project was saved successfully, false otherwise
 * @example
 * savePendingProject({ title: 'My Video', url: 'https://youtube.com/watch?v=...', group: 'wwe' });
 */
const savePendingProject = (data: { title: string; url: string; group?: string }) => {
    try {
        const raw = localStorage.getItem(PENDING_PROJECTS_KEY) || '[]';
        const pending: PendingProject[] = JSON.parse(raw);
        const newPending: PendingProject = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: data.title,
            url: data.url || '',
            group: data.group,
            addedAt: Date.now(),
        };
        pending.push(newPending);
        localStorage.setItem(PENDING_PROJECTS_KEY, JSON.stringify(pending));
        console.warn('[PENDING] Saved pending project:', newPending.title);
        return true;
    } catch (e) {
        console.error('[PENDING] Failed to save pending project', e);
        return false;
    }
};

// Main component
export const ScriptTabApp: React.FC = () => {
    // Use the modularized editor state hook
    const {
        projects,
        currentIndex,
        project,
        canUndo,
        updateProject,
        addProject,
        setCurrentIndex,
        undoLastSelection,
        pushSelectionHistory,
        handleGroupChange,
    } = useScriptEditorState();

    // Generation hook
    const {
        progress: hookProgress,
        generateScripts,
    } = useScriptGenerator(project);

    // Local state for history
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress] = useState(0);
    const [titleLinkHistory, setTitleLinkHistory] = useState<TitleSourceHistoryItem[]>([]);
    const [projectHistory, setProjectHistory] = useState<ProjectHistoryItem[]>([]);
    
    // History modal state (passed to ScriptCanvas for rendering)
    const [titleHistoryModalOpen, setTitleHistoryModalOpen] = useState(false);
    const [projectHistoryModalOpen, setProjectHistoryModalOpen] = useState(false);

    // Auto-select languages based on title language detection
    // Uses the modularized hook from ScriptToolbar - eliminates duplication
    useAutoLanguageDetection(
        project.titles || [],
        project.voiceoverLangs || ['it-IT'],
        (newLangs) => updateProject({ voiceoverLangs: newLangs })
    );

    // History management callbacks
    const upsertTitleLinkHistory = useCallback((titleRaw: string, linkRaw: string) => {
        const title = normalizeTitle(titleRaw);
        const link = normalizeLink(linkRaw);
        if (!title && !link) return;

        setTitleLinkHistory((prev) => {
            const key = historyItemKey(title, link);
            const now = Date.now();
            const next = prev.map((item) => {
                const itemKey = historyItemKey(item.title, item.link);
                if (itemKey !== key) return item;
                return {
                    ...item,
                    title: title || item.title,
                    link: link || item.link,
                    lastUsedAt: now,
                    uses: (Number(item.uses) || 0) + 1,
                };
            });
            const exists = next.some((item) => historyItemKey(item.title, item.link) === key);
            if (!exists) {
                next.unshift({
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    title,
                    link,
                    lastUsedAt: now,
                    uses: 1,
                });
            }
            return next.sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, MAX_TITLE_LINK_HISTORY);
        });
    }, []);

    const handleDeleteTitleLink = useCallback((itemId: string) => {
        setTitleLinkHistory((prev) => prev.filter((item) => item.id !== itemId));
    }, []);

    const handleClearTitleLinkHistory = useCallback(() => {
        setTitleLinkHistory([]);
    }, []);

    const handleMarkHistoryUsed = useCallback((itemId: string) => {
        setTitleLinkHistory((prev) => prev.map((item) => item.id === itemId
            ? { ...item, lastUsedAt: Date.now(), uses: (Number(item.uses) || 0) + 1 }
            : item,
        ).sort((a, b) => b.lastUsedAt - a.lastUsedAt));
    }, []);

    const handleApplyProjectHistory = useCallback((item: ProjectHistoryItem) => {
        // Update project with history item
        if (item?.project) {
            updateProject(item.project);
        }
        // Update project history usage
        setProjectHistory((prev) => prev.map((p) => p.id === item.id
            ? { ...p, lastUsedAt: Date.now(), uses: (Number(p.uses) || 0) + 1 }
            : p,
        ).sort((a, b) => b.lastUsedAt - a.lastUsedAt));
    }, [updateProject]);

    const handleDeleteProjectHistory = useCallback((itemId: string) => {
        setProjectHistory((prev) => prev.filter((item) => item.id !== itemId));
    }, []);

    const handleClearProjectHistory = useCallback(() => {
        setProjectHistory([]);
    }, []);

    // Global function to add project from external source (e.g., YouTube Manager)
    useEffect(() => {
        (window as unknown as { addVideoProject: (data: { title: string; url: string; group?: string }) => void }).addVideoProject = (data: { title: string; url: string; group?: string }) => {
            console.warn('[ScriptTab] Adding video project:', data);
            
            // Save to pending projects (persists in localStorage)
            savePendingProject(data);
            
            // If we're on the script tab, also add immediately
            // Use the addProject from useScriptEditorState
            addProject();
            
            // Update the newly added project
            setTimeout(() => {
                updateProject({
                    titles: [data.title, ''],
                    sourceContext: data.url || '',
                    youtubeGroup: data.group || null,
                    videoStyle: 'normal',
                });
            }, 0);
            
            // Switch to script tab if not already there
            window.dispatchEvent(new CustomEvent('studio-tab-change', { detail: { tab: 'script' } }));
        };
        return () => { delete (window as unknown as { addVideoProject?: unknown }).addVideoProject; };
    }, [addProject, updateProject]);

    // Handle execute - generate scripts
    const handleExecute = async () => {
        if (project.titles.filter(t => t.trim()).length === 0) {
            alert('Inserisci almeno un titolo.');
            return;
        }
        if (!project.youtubeGroup) {
            alert('Seleziona un gruppo YouTube.');
            return;
        }
        if (!project.externalDestinationId) {
            alert('Seleziona una destinazione di pubblicazione.');
            return;
        }

        setIsGenerating(true);
        console.warn('Starting generation for project:', project);

        const validTitles = (project.titles || []).map((t) => t.trim()).filter(Boolean);
        validTitles.forEach((title) => upsertTitleLinkHistory(title, project.sourceContext || ''));

        try {
            const result = await generateScripts({ forceRemoteGeneration: true });
            
            if (result.ok) {
                console.warn('[SCRIPT] Generation completed successfully', result);
                // Dispatch success event for other components
                window.dispatchEvent(new CustomEvent('velox:generation-complete', { 
                    detail: { job_id: result.job_id, results: result.results } 
                }));
            } else {
                console.error('[SCRIPT] Generation failed:', result.error);
                alert(`Errore durante la generazione: ${result.error || 'Errore sconosciuto'}`);
            }
        } catch (e) {
            console.error('[SCRIPT] Generation failed', e);
            alert('Errore durante la generazione script.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div id="tab-script" className="relative w-full max-w-7xl mx-auto animate-fadeIn pb-32 px-4">
            <div id="video-projects-container" className="contents" />
            
            <div className="flex flex-col gap-6">
                {/* TOOLBAR - Project Queue + Style/Group Selector */}
                <ScriptToolbar
                    projects={projects}
                    currentIndex={currentIndex}
                    isGenerating={isGenerating}
                    progress={progress}
                    onProjectSelect={setCurrentIndex}
                    onAddProject={addProject}
                    onGroupChange={handleGroupChange}
                    onStyleChange={(style: VideoStyle) => updateProject({ videoStyle: style })}
                    onHistoryClick={() => setProjectHistoryModalOpen(true)}
                    onExecute={handleExecute}
                />

                {/* CANVAS - Main editor content */}
                <ScriptCanvas
                    project={project}
                    canUndo={canUndo}
                    titleLinkHistory={titleLinkHistory}
                    projectHistory={projectHistory}
                    isGenerating={isGenerating}
                    progress={{ 
                        percent: hookProgress?.percent ?? 0, 
                        status: hookProgress?.status ?? 'idle', 
                        logs: hookProgress?.logs ?? [] 
                    }}
                    onProjectUpdate={updateProject}
                    onPushSelectionHistory={pushSelectionHistory}
                    onUndo={undoLastSelection}
                    // Modal state
                    titleHistoryModalOpen={titleHistoryModalOpen}
                    setTitleHistoryModalOpen={setTitleHistoryModalOpen}
                    projectHistoryModalOpen={projectHistoryModalOpen}
                    setProjectHistoryModalOpen={setProjectHistoryModalOpen}
                    // History callbacks
                    onUpsertTitleLink={upsertTitleLinkHistory}
                    onDeleteTitleLink={handleDeleteTitleLink}
                    onClearTitleLinkHistory={handleClearTitleLinkHistory}
                    onMarkHistoryUsed={handleMarkHistoryUsed}
                    onApplyProjectHistory={handleApplyProjectHistory}
                    onDeleteProjectHistory={handleDeleteProjectHistory}
                    onClearProjectHistory={handleClearProjectHistory}
                />
            </div>
        </div>
    );
};
