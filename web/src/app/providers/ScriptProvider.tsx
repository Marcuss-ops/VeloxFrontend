import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createDefaultVideoProject, type VideoProject } from '../../components/Script/types';

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
    
    // Event emitters (delivered via context callbacks only)
    const emitCreateMasterPayload = useCallback((payload: unknown) => {
        payloadCallbacksRef.current.forEach(cb => {
            try {
                cb(payload);
            } catch (e) {
                console.error('[ScriptProvider] Payload callback error:', e);
            }
        });
    }, []);
    
    const emitCreateMasterResponse = useCallback((response: unknown) => {
        responseCallbacksRef.current.forEach(cb => {
            try {
                cb(response);
            } catch (e) {
                console.error('[ScriptProvider] Response callback error:', e);
            }
        });
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
        emitCreateMasterPayload,
        emitCreateMasterResponse,
        onCreateMasterPayload,
        onCreateMasterResponse,
    }), [currentProject, projects, currentIndex, isGenerating, progress, updateProject, setCurrentProject, setProjects, setCurrentIndex, setIsGenerating, setProgress, emitCreateMasterPayload, emitCreateMasterResponse, onCreateMasterPayload, onCreateMasterResponse]);
    
    return <ScriptContext.Provider value={value}>{children}</ScriptContext.Provider>;
};

export const useScript = (): ScriptContextValue => {
    const ctx = useContext(ScriptContext);
    if (!ctx) throw new Error('useScript must be used within ScriptProvider');
    return ctx;
};
