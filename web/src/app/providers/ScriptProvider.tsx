import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { youtubeApi } from '@/lib/api';
import { createDefaultVideoProject, type GroupChannel, type VideoProject } from '../../components/Script/types';
import { normalizeManagerGroups } from '@/components/YouTubeManager/utils/managerGroups';

// Extend Window interface for legacy properties
declare global {
    interface Window {
        currentProject: VideoProject;
        allProjects: VideoProject[];
        groupChannels: Record<string, GroupChannel[]>;
        selectedGroup: string | null;
        selectedVoiceoverLangs: string[];
    }
}

export interface GenerationProgress {
    percent: number;
    status: string;
    logs: string[];
}

export interface ScriptContextValue {
    // Project state
    currentProject: VideoProject;
    setCurrentProject: (project: VideoProject) => void;
    updateProject: (updates: Partial<VideoProject>) => void;
    
    // All projects (for queue)
    projects: VideoProject[];
    setProjects: React.Dispatch<React.SetStateAction<VideoProject[]>>;
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    
    // Generation state
    isGenerating: boolean;
    setIsGenerating: (generating: boolean) => void;
    progress: GenerationProgress;
    setProgress: (progress: GenerationProgress) => void;
    
    // Group channels (replaces window.groupChannels)
    groupChannels: Record<string, GroupChannel[]>;
    setGroupChannels: React.Dispatch<React.SetStateAction<Record<string, GroupChannel[]>>>;
    fetchGroupChannels: () => Promise<void>;
    
    // Event emitters (replaces CustomEvent)
    emitCreateMasterPayload: (payload: unknown) => void;
    emitCreateMasterResponse: (response: unknown) => void;
    
    // Event listeners
    onCreateMasterPayload: (callback: (payload: unknown) => void) => () => void;
    onCreateMasterResponse: (callback: (response: unknown) => void) => () => void;
}

const ScriptContext = createContext<ScriptContextValue | null>(null);

export const ScriptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Project state
    const [currentProject, setCurrentProjectState] = useState<VideoProject>(() => createDefaultVideoProject());
    const [projects, setProjects] = useState<VideoProject[]>(() => [createDefaultVideoProject()]);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<GenerationProgress>({
        percent: 0,
        status: 'idle',
        logs: [],
    });
    
    // Group channels
    const [groupChannels, setGroupChannels] = useState<Record<string, GroupChannel[]>>({});
    
    // Event callbacks (replaces global CustomEvents)
    const payloadCallbacksRef = useRef<Set<(payload: unknown) => void>>(new Set());
    const responseCallbacksRef = useRef<Set<(response: unknown) => void>>(new Set());
    
    // Update project helper
    const updateProject = useCallback((updates: Partial<VideoProject>) => {
        setCurrentProjectState(prev => ({ ...prev, ...updates }));
    }, []);
    
    // Set current project
    const setCurrentProject = useCallback((project: VideoProject) => {
        setCurrentProjectState(project);
    }, []);
    
    // Fetch group channels from API
    const fetchGroupChannels = useCallback(async () => {
        try {
            const data: any = await youtubeApi.managerGroups();
            const groups = normalizeManagerGroups(data?.groups);
            const channelsByGroup: Record<string, GroupChannel[]> = {};
            for (const group of groups) {
                const groupName = String(group.name || '').trim();
                if (!groupName) continue;
                channelsByGroup[groupName] = (group.channels || []).map((ch: { id: string; title?: string; name?: string; language?: string }) => ({
                    id: ch.id,
                    channel: ch.title || ch.name || ch.id,
                    title: ch.title || ch.name || ch.id,
                    lang: ch.language,
                }));
            }
            setGroupChannels(channelsByGroup);
        } catch (e) {
            console.warn('[ScriptProvider] Failed to fetch group channels:', e);
        }
    }, []);
    
    // Event emitters
    const emitCreateMasterPayload = useCallback((payload: unknown) => {
        payloadCallbacksRef.current.forEach(cb => {
            try {
                cb(payload);
            } catch (e) {
                console.error('[ScriptProvider] Payload callback error:', e);
            }
        });
        
        // Also dispatch global event for backward compatibility
        try {
            window.dispatchEvent(new CustomEvent('velox:create-master-payload', {
                detail: { payload }
            }));
        } catch (e) {
            console.warn('[ScriptProvider] Failed to dispatch legacy event:', e);
        }
    }, []);
    
    const emitCreateMasterResponse = useCallback((response: unknown) => {
        responseCallbacksRef.current.forEach(cb => {
            try {
                cb(response);
            } catch (e) {
                console.error('[ScriptProvider] Response callback error:', e);
            }
        });
        
        // Also dispatch global event for backward compatibility
        try {
            window.dispatchEvent(new CustomEvent('velox:create-master-response', {
                detail: { response }
            }));
        } catch (e) {
            console.warn('[ScriptProvider] Failed to dispatch legacy event:', e);
        }
    }, []);
    
    // Event listeners registration
    const onCreateMasterPayload = useCallback((callback: (payload: unknown) => void) => {
        payloadCallbacksRef.current.add(callback);
        return () => {
            payloadCallbacksRef.current.delete(callback);
        };
    }, []);
    
    const onCreateMasterResponse = useCallback((callback: (response: unknown) => void) => {
        responseCallbacksRef.current.add(callback);
        return () => {
            responseCallbacksRef.current.delete(callback);
        };
    }, []);
    
    // Sync with legacy window object for backward compatibility
    useEffect(() => {
        window.currentProject = currentProject;
        window.allProjects = projects;
        window.groupChannels = groupChannels;
        window.selectedGroup = currentProject.youtubeGroup;
        window.selectedVoiceoverLangs = currentProject.voiceoverLangs;
    }, [currentProject, projects, groupChannels]);
    
    // Initial fetch of group channels
    useEffect(() => {
        fetchGroupChannels();
    }, [fetchGroupChannels]);
    
    const value: ScriptContextValue = useMemo(() => ({
        currentProject,
        setCurrentProject,
        updateProject,
        projects,
        setProjects,
        currentIndex,
        setCurrentIndex,
        isGenerating,
        setIsGenerating,
        progress,
        setProgress,
        groupChannels,
        setGroupChannels,
        fetchGroupChannels,
        emitCreateMasterPayload,
        emitCreateMasterResponse,
        onCreateMasterPayload,
        onCreateMasterResponse,
    }), [currentProject, projects, currentIndex, isGenerating, progress, groupChannels, updateProject, setCurrentProject, setProjects, setCurrentIndex, setIsGenerating, setProgress, setGroupChannels, fetchGroupChannels, emitCreateMasterPayload, emitCreateMasterResponse, onCreateMasterPayload, onCreateMasterResponse]);
    
    return <ScriptContext.Provider value={value}>{children}</ScriptContext.Provider>;
};

export const useScript = (): ScriptContextValue => {
    const ctx = useContext(ScriptContext);
    if (!ctx) throw new Error('useScript must be used within ScriptProvider');
    return ctx;
};
