import { useState, useCallback, useRef } from 'react';
import { useScript } from '../../../app/providers/ScriptProvider';
import type { VideoProject } from '../types';
import type {
    BackendResponse,
    ApiResponse,
    TitleResult,
} from './useProjectQueue';
import { hasQueueConfirmation, getBackendErrorMessage } from './useProjectQueue';

// Language normalization maps
const VOICEOVER_LANG_MAP: Record<string, string> = {
    it: 'it-IT',
    es: 'es-ES',
    pt: 'pt-BR',
    en: 'en-US',
    fr: 'fr-FR',
    ru: 'ru-RU',
    tr: 'tr-TR',
    id: 'id-ID',
    pl: 'pl-PL',
    de: 'de-DE',
};

const UI_GROUP_TO_API_MAP: Record<string, string> = {
    WWE: 'Wwe',
    HipHop: 'Pop',
    Music: 'Music',
    Crime: 'Crime',
    Discovery: 'discovery',
    Pop: 'Pop',
    Boxe: 'boxe',
};

// Helper functions
const normalizeVoiceoverLangs = (langs: string[]): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    
    for (const l of langs) {
        const raw = String(l || '').trim();
        if (!raw) continue;
        
        const low = raw.toLowerCase();
        const normalized = low.includes('-') ? raw : VOICEOVER_LANG_MAP[low] || raw;
        
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
    }
    
    return out;
};

const mapUiGroupToApiGroup = (groupName: string | null): string | null => {
    if (!groupName) return null;
    return UI_GROUP_TO_API_MAP[groupName] || groupName;
};

const extractYouTubeUrl = (text: string): string => {
    const ytPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = String(text || '').match(ytPattern);
    if (!match || !match[0]) return '';
    return match[0].includes('http') ? match[0] : `https://www.youtube.com/watch?v=${match[1]}`;
};

const sanitizeTitlesArray = (titles: string[]): string[] => {
    return titles.map(t => String(t || '').trim()).filter(Boolean);
};

interface GenerationResult {
    ok: boolean;
    error?: string;
    results?: TitleResult[];
    job_id?: string;
}

interface UseScriptGeneratorReturn {
    isGenerating: boolean;
    progress: {
        percent: number;
        status: string;
        logs: string[];
    };
    generateScripts: (options?: {
        forceRemoteGeneration?: boolean;
    }) => Promise<GenerationResult>;
    cancelGeneration: () => void;
}

export const useScriptGenerator = (projectOverride?: VideoProject): UseScriptGeneratorReturn => {
    const {
        currentProject,
        // updateProject reserved for future use
        isGenerating: contextGenerating,
        setIsGenerating,
        progress,
        setProgress,
        emitCreateMasterPayload,
        emitCreateMasterResponse,
    } = useScript();
    
    const [localGenerating, setLocalGenerating] = useState(false);
    const cancelRef = useRef(false);
    const inFlightRef = useRef(new Map<string, Promise<ApiResponse>>());

    const isGenerating = contextGenerating || localGenerating;
    const activeProject = projectOverride ?? currentProject;
    
    const generateScripts = useCallback(async (options: {
        forceRemoteGeneration?: boolean;
    } = {}): Promise<GenerationResult> => {
        if (localGenerating) {
            setProgress({ percent: 0, status: 'already_running', logs: ['Generazione già in corso'] });
            return { ok: false, error: 'Generazione già in corso' };
        }
        
        cancelRef.current = false;
        setLocalGenerating(true);
        setIsGenerating(true);
        
        const titles = sanitizeTitlesArray(activeProject.titles);
        
        if (titles.length === 0) {
            setLocalGenerating(false);
            setIsGenerating(false);
            return { ok: false, error: 'Inserisci almeno un titolo video' };
        }
        
        const youtubeGroup = mapUiGroupToApiGroup(activeProject.youtubeGroup);
        
        if (!youtubeGroup) {
            setLocalGenerating(false);
            setIsGenerating(false);
            return { ok: false, error: 'Seleziona un gruppo YouTube' };
        }
        
        const sourceContext = activeProject.sourceContext || '';
        const youtubeUrl = extractYouTubeUrl(sourceContext);
        const selectedLangs = normalizeVoiceoverLangs(activeProject.voiceoverLangs);
        
        setProgress({
            percent: 10,
            status: 'starting',
            logs: ['Avvio generazione script...'],
        });
        
        try {
            const results: TitleResult[] = [];
            const SCRIPT_PLACEHOLDER = options.forceRemoteGeneration ? '[SCRIPT WILL BE GENERATED]' : '';
            
            setProgress({
                percent: 20,
                status: 'validating',
                logs: ['Validazione cartelle Drive...'],
            });
            
            // Validate drive folders if needed
            if (activeProject.voiceoverFolderId) {
                try {
                    const resp = await fetch('/api/drive/folder-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folder_id: activeProject.voiceoverFolderId }),
                    });
                    
                    if (!resp.ok) {
                        const text = await resp.text();
                        let data: BackendResponse | null = null;
                        try { data = JSON.parse(text); } catch { /* JSON parse failed */ }
                        
                        const error = getBackendErrorMessage(data, text || `HTTP ${resp.status}`);
                        setLocalGenerating(false);
                        setIsGenerating(false);
                        return { ok: false, error: `Cartella voiceover non valida: ${error}` };
                    }
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : 'Errore sconosciuto';
                    setLocalGenerating(false);
                    setIsGenerating(false);
                    return { ok: false, error: `Errore validazione cartella: ${message}` };
                }
            }
            
            setProgress({
                percent: 30,
                status: 'sending',
                logs: [`Invio ${titles.length} titolo/i al Master Server...`],
            });
            
            for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
                if (cancelRef.current) {
                    setLocalGenerating(false);
                    setIsGenerating(false);
                    return { ok: false, error: 'Generazione annullata' };
                }
                
                const title = titles[titleIndex];
                const titleLanguage = selectedLangs[0]?.split('-')[0]?.toLowerCase() || 'it';
                
                const payload = {
                    job_spec_version: '1',
                    project_name: youtubeGroup || 'default',
                    youtube_group: youtubeGroup,
                    video_style: activeProject.videoStyle || 'normal',
                    video_name: title,
                    source: sourceContext,
                    source_context: sourceContext,
                    youtube_url: youtubeUrl,
                    language: titleLanguage,
                    duration: '5',
                    voiceover_drive_folder: activeProject.voiceoverFolderId || null,
                    script_text: SCRIPT_PLACEHOLDER,
                    start_clips: activeProject.clipFolders.initial || [],
                    middle_clips: activeProject.clipFolders.inter || [],
                    end_clips: activeProject.clipFolders.final || [],
                    stock_clips_timestamps: activeProject.stockTimestamps || [],
                    voiceover_items: [],
                    voiceover_languages: selectedLangs,
                    assets: {
                        background: activeProject.background || 'Nessuno',
                        music: activeProject.music || 'Nessuno',
                    },
                    drive_folder_id: activeProject.driveFolderId || null,
                };
                
                // Emit payload event
                emitCreateMasterPayload({ titleIndex, title, payload });
                
                setProgress({
                    percent: 30 + Math.round((titleIndex / titles.length) * 50),
                    status: 'processing',
                    logs: [`Elaborazione titolo ${titleIndex + 1}/${titles.length}: ${title.substring(0, 50)}...`],
                });
                
                // Check for deduplication
                const dedupeKey = `create-master:${JSON.stringify(payload)}`;
                let response: ApiResponse;
                
                const existingPromise = inFlightRef.current.get(dedupeKey);
                if (existingPromise) {
                    setProgress({
                        ...progress,
                        logs: [...progress.logs, 'Richiesta duplicata rilevata: riuso risposta in-flight'],
                    });
                    response = await existingPromise;
                } else {
                    const requestPromise = (async (): Promise<ApiResponse> => {
                        const endpoints = [
                            `${window.location.origin}/api/video/create-master`,
                            '/api/video/create-master',
                        ];
                        
                        let lastError: Error | null = null;
                        for (const endpoint of endpoints) {
                            try {
                                const resp = await fetch(endpoint, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload),
                                });
                                
                                const text = await resp.text();
                                let data: BackendResponse | null = null;
                                try { data = JSON.parse(text); } catch { /* JSON parse failed */ }
                                
                                return { status: resp.status, body: data, text };
                            } catch (e: unknown) {
                                lastError = e instanceof Error ? e : new Error('Errore sconosciuto');
                            }
                        }
                        
                        throw lastError || new Error('Nessun endpoint raggiungibile');
                    })();
                    
                    inFlightRef.current.set(dedupeKey, requestPromise);
                    
                    try {
                        response = await requestPromise;
                    } finally {
                        inFlightRef.current.delete(dedupeKey);
                    }
                }
                
                const { status, body, text } = response;
                const queueConfirmed = hasQueueConfirmation(body);
                
                // Emit response event
                emitCreateMasterResponse({
                    titleIndex,
                    title,
                    response: { status, ok: !!(body?.ok && queueConfirmed), queueConfirmed, text, json: body },
                });
                
                results.push({ titleIndex, title, result: body, status });
            }
            
            const failed = results.filter(r => !hasQueueConfirmation(r.result));
            
            if (failed.length === 0) {
                setProgress({
                    percent: 100,
                    status: 'done',
                    logs: ['Generazione completata! Job in coda.'],
                });
                
                setLocalGenerating(false);
                setIsGenerating(false);
                
                return {
                    ok: true,
                    results,
                    job_id: results[0]?.result?.job_id || results[0]?.result?.jobId,
                };
            }
            
            const errorMsg = getBackendErrorMessage(
                failed[0]?.result,
                `HTTP ${failed[0]?.status || '?'} su /api/video/create-master`,
            );
            
            setProgress({
                percent: 100,
                status: 'error',
                logs: [`Errore: ${errorMsg}`],
            });
            
            setLocalGenerating(false);
            setIsGenerating(false);
            
            return { ok: false, error: errorMsg, results };
            
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Errore durante la generazione';
            
            setProgress({
                percent: 100,
                status: 'error',
                logs: [`Errore: ${errorMsg}`],
            });
            
            setLocalGenerating(false);
            setIsGenerating(false);
            
            return { ok: false, error: errorMsg };
        }
    }, [
        activeProject,
        setProgress,
        setIsGenerating,
        emitCreateMasterPayload,
        emitCreateMasterResponse,
        localGenerating,
        progress,
    ]);
    
    const cancelGeneration = useCallback(() => {
        cancelRef.current = true;
    }, []);
    
    return {
        isGenerating,
        progress,
        generateScripts,
        cancelGeneration,
    };
};

export default useScriptGenerator;
