/**
 * useScriptGenerator Hook
 * 
 * AGENT 1B: Core Logic Hook for Script Generation
 * Migrated from: script-generator.js (~800 lines)
 * 
 * Responsibilities:
 * - Orchestration of script generation flow
 * - Batch project processing
 * - Master Server communication
 * - Progress tracking and error handling
 */

import { useState, useCallback, useRef } from 'react';
import type {
    ClipRefInput,
    StockTimestamp,
    ProjectRef,
    CreateMasterPayload,
    GenerationProgress,
    GenerationResult,
    GenerationResultItem,
} from '../types/scriptGenerator';

// Import shared utilities from scriptGenerator.ts (Agent 1A)
import {
    normalizeVoiceoverLangs,
    mapUiGroupToApiGroup,
    shortLangFromNormalized,
    extractYouTubeUrl,
    toClipRef,
    toStockTimestamp,
    sanitizeTitlesArray,
    collectProjectVoiceLangs,
    hasQueueConfirmation,
    extractDriveId,
    getApiCandidates,
    getBackendErrorMessage,
} from '../utils/scriptGenerator';

// ============ Additional Local Types ============

export interface ProjectBatch {
    project: ProjectRef;
    queueIndex: number | null;
    titles: string[];
}

export interface UseScriptGeneratorOptions {
    apiBaseUrl?: string;
    onGenerationComplete?: (results: GenerationResult[]) => void;
    onError?: (error: Error) => void;
    onProgress?: (progress: GenerationProgress) => void;
}

export interface UseScriptGeneratorReturn {
    isGenerating: boolean;
    progress: GenerationProgress;
    logs: string[];
    generateScripts: (projects: ProjectBatch[], options?: BatchGenerationOptions) => Promise<GenerationResult>;
    cancelGeneration: () => void;
    clearLogs: () => void;
}

export interface BatchGenerationOptions {
    forceRemoteGeneration?: boolean;
    sourceContext?: string;
    duration?: string;
}

// ============ Constants ============

const INITIAL_PROGRESS: GenerationProgress = {
    global: 0,
    scripting: { percent: 0, status: 'idle', logs: [] },
    voiceover: { percent: 0, status: 'idle', logs: [] },
    remote: { step: 'IDLE', message: 'In attesa...', progress: 0, isError: false },
};

// ============ Main Hook ============

export function useScriptGenerator(
    options: UseScriptGeneratorOptions = {}
): UseScriptGeneratorReturn {
    const {
        apiBaseUrl,
        onGenerationComplete,
        onError,
        onProgress,
    } = options;
    
    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<GenerationProgress>(INITIAL_PROGRESS);
    const [logs, setLogs] = useState<string[]>([]);
    
    // Refs
    const abortRef = useRef(false);
    const inFlightRef = useRef(new Map<string, Promise<{ status: number; body: unknown; rawText: string }>>());
    
    // ============ Internal Helpers ============
    
    const updateProgress = useCallback((update: Partial<GenerationProgress>) => {
        setProgress(prev => {
            const newProgress = { ...prev };
            
            if (update.global !== undefined) newProgress.global = update.global;
            if (update.scripting) {
                newProgress.scripting = { ...prev.scripting, ...update.scripting };
            }
            if (update.voiceover) {
                newProgress.voiceover = { ...prev.voiceover, ...update.voiceover };
            }
            if (update.remote) {
                newProgress.remote = { ...prev.remote, ...update.remote };
            }
            
            onProgress?.(newProgress);
            return newProgress;
        });
    }, [onProgress]);
    
    const appendLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;
        setLogs(prev => [...prev, logLine]);
    }, []);
    
    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);
    
    // ============ Drive Folder Validation ============
    
    const validateDriveFolder = useCallback(async (
        folderIdRaw: string,
        label: string
    ): Promise<{ ok: boolean; error?: string; folderId?: string; folderName?: string }> => {
        const folderId = extractDriveId(folderIdRaw);
        if (!folderId) {
            return { ok: false, error: `${label}: folder_id mancante` };
        }
        
        const candidates = getApiCandidates('/api/drive/folder-info', apiBaseUrl);
        let lastError = '';
        
        for (const endpoint of candidates) {
            try {
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder_id: folderId }),
                });
                
                const rawText = await resp.text();
                let body: unknown = null;
                try {
                    body = rawText ? JSON.parse(rawText) : null;
                } catch {
                    body = null;
                }
                
                const bodyObj = body as { ok?: boolean; folder?: { id?: string; name?: string } };
                if (resp.ok && bodyObj?.ok && bodyObj?.folder?.id) {
                    return {
                        ok: true,
                        folderId: bodyObj.folder.id,
                        folderName: bodyObj.folder.name || '',
                    };
                }
                
                const backendError = getBackendErrorMessage(body, rawText || `HTTP ${resp.status}`);
                lastError = `${label} non valida (${folderId}): ${backendError}`;
                appendLog(`❌ ${lastError}`);
            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                lastError = `${label} non raggiungibile (${folderId}): ${errorMessage}`;
                appendLog(`❌ ${lastError}`);
            }
        }
        
        return { ok: false, error: lastError || `${label} non valida (${folderId})` };
    }, [apiBaseUrl, appendLog]);
    
    const validateProjectDriveFolders = useCallback(async (
        projectRef: ProjectRef | null,
        stockClips: StockTimestamp[]
    ): Promise<{ ok: boolean; error?: string }> => {
        const checks: Promise<{ ok: boolean; error?: string }>[] = [];
        
        const voiceFolder = projectRef?.voiceoverFolderId || '';
        if (voiceFolder) {
            checks.push(validateDriveFolder(voiceFolder, 'Cartella voiceover'));
        }
        
        const seenStock = new Set<string>();
        for (const item of stockClips) {
            const folderId = item.folder_id;
            if (!folderId || seenStock.has(folderId)) continue;
            seenStock.add(folderId);
            checks.push(validateDriveFolder(folderId, `Cartella stock (${item.folder_name || folderId})`));
        }
        
        const results = await Promise.all(checks);
        const failed = results.find(r => !r?.ok);
        
        if (failed) {
            return { ok: false, error: failed.error || 'Validazione cartelle fallita' };
        }
        
        return { ok: true };
    }, [validateDriveFolder]);
    
    // ============ Master Server Communication ============
    
    const sendToMasterServer = useCallback(async (
        scriptText: string,
        videoData: {
            videoTitle: string;
            background: string;
            music: string;
            duration: string;
        },
        sendOptions: {
            forceRemoteGeneration?: boolean;
            remoteVoiceoverLangs: string[];
            projectRef: ProjectRef | null;
            titles: string[];
            sourceContext: string;
        }
    ): Promise<GenerationResult> => {
        const {
            forceRemoteGeneration = false,
            remoteVoiceoverLangs,
            projectRef,
            titles,
            sourceContext,
        } = sendOptions;
        
        const sanitizedTitles = sanitizeTitlesArray(titles);
        if (sanitizedTitles.length === 0) {
            return { ok: false, error: 'Nessun titolo inserito' };
        }
        
        const youtubeUrl = extractYouTubeUrl(sourceContext);
        const selectedGroup = projectRef?.youtubeGroup || null;
        const youtubeGroup = mapUiGroupToApiGroup(selectedGroup);
        
        const clipsRef = projectRef?.clipFolders || {};
        const stockRef = projectRef?.stockTimestamps || [];
        
        const startClips = (clipsRef.initial || []).map((c) => toClipRef(c as ClipRefInput | string)).filter(Boolean) as string[];
        const middleClips = (clipsRef.inter || []).map((c) => toClipRef(c as ClipRefInput | string)).filter(Boolean) as string[];
        const endClips = (clipsRef.final || []).map((c) => toClipRef(c as ClipRefInput | string)).filter(Boolean) as string[];
        const stockClips = (stockRef || []).map(toStockTimestamp).filter(Boolean) as StockTimestamp[];
        
        const defaultRemoteVoiceoverLangs = normalizeVoiceoverLangs(remoteVoiceoverLangs);
        
        // Validate drive folders
        const folderValidation = await validateProjectDriveFolders(projectRef, stockClips);
        if (!folderValidation.ok) {
            return {
                ok: false,
                error: `❌ Validazione Drive fallita: ${folderValidation.error}`,
            };
        }
        
        const results: GenerationResultItem[] = [];
        const createMasterCandidates = getApiCandidates('/api/video/create-master', apiBaseUrl);
        
        for (let titleIndex = 0; titleIndex < sanitizedTitles.length; titleIndex++) {
            if (abortRef.current) {
                return { ok: false, error: 'Generazione annullata' };
            }
            
            const title = sanitizedTitles[titleIndex];
            const titleOverride = projectRef?.titleOverrides?.[titleIndex];
            
            const langsForTitleRaw = titleOverride?.voiceover_langs
                ? titleOverride.voiceover_langs
                : defaultRemoteVoiceoverLangs;
            const langsForTitle = normalizeVoiceoverLangs(langsForTitleRaw);
            const titleLanguage = shortLangFromNormalized(langsForTitle[0]) || 'it';
            
            const payload: CreateMasterPayload = {
                job_spec_version: '1',
                project_name: youtubeGroup || 'default',
                youtube_group: youtubeGroup,
                video_style: projectRef?.videoStyle || 'normal',
                video_name: title,
                source: sourceContext,
                source_context: sourceContext,
                youtube_url: youtubeUrl,
                language: titleLanguage,
                duration: videoData.duration || '5',
                voiceover_drive_folder: projectRef?.voiceoverFolderId || null,
                script_text: forceRemoteGeneration ? '[SCRIPT WILL BE GENERATED]' : scriptText,
                start_clips: startClips,
                middle_clips: middleClips,
                end_clips: endClips,
                stock_clips_timestamps: stockClips,
                voiceover_items: [],
                voiceover_languages: langsForTitle,
                assets: {
                    background: videoData.background || 'Nessuno',
                    music: videoData.music || 'Nessuno',
                },
                drive_folder_id: projectRef?.driveFolderId || null,
            };
            
            appendLog(`📤 Payload titolo ${titleIndex + 1}/${sanitizedTitles.length}: ${title}`);
            
            const dedupeKey = `create-master:${JSON.stringify(payload)}`;
            
            let status: number;
            let body: unknown;
            
            const existingPromise = inFlightRef.current.get(dedupeKey);
            if (existingPromise) {
                appendLog('♻️ Richiesta duplicata rilevata: riuso risposta in-flight');
                const sharedResult = await existingPromise;
                status = sharedResult.status;
                body = sharedResult.body;
            } else {
                const requestPromise = (async () => {
                    let response: Response | null = null;
                    let lastFetchError: Error | null = null;
                    
                    for (const endpoint of createMasterCandidates) {
                        try {
                            response = await fetch(endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                            });
                            
                            if (response) {
                                appendLog(`🌐 Endpoint: ${endpoint} (HTTP ${response.status})`);
                                break;
                            }
                        } catch (e: unknown) {
                            lastFetchError = e instanceof Error ? e : new Error(String(e));
                            appendLog(`⚠️ Endpoint KO: ${endpoint} (${lastFetchError.message})`);
                        }
                    }
                    
                    if (!response) {
                        throw new Error(lastFetchError?.message || 'Nessun endpoint raggiungibile');
                    }
                    
                    let parsed: unknown;
                    let text = '';
                    try {
                        text = await response.text();
                        parsed = text ? JSON.parse(text) : null;
                    } catch {
                        parsed = null;
                    }
                    
                    return { status: response.status, body: parsed, rawText: text };
                })();
                
                inFlightRef.current.set(dedupeKey, requestPromise);
                
                try {
                    const uniqueResult = await requestPromise;
                    status = uniqueResult.status;
                    body = uniqueResult.body;
                } finally {
                    inFlightRef.current.delete(dedupeKey);
                }
            }
            
            results.push({
                titleIndex,
                title,
                result: body as GenerationResult | null,
                status,
            });
        }
        
        const failed = results.filter(r => !hasQueueConfirmation(r.result));
        
        if (failed.length === 0) {
            return {
                ok: true,
                results,
                job_id: results[0]?.result?.job_id || results[0]?.result?.jobId,
            };
        }
        
        const errorMsg = getBackendErrorMessage(
            failed[0]?.result,
            `HTTP ${failed[0]?.status || '?'} su /api/video/create-master`
        );
        
        return { ok: false, error: errorMsg, results };
    }, [apiBaseUrl, appendLog, validateProjectDriveFolders]);
    
    // ============ Main Generation Function ============
    
    const generateScripts = useCallback(async (
        projects: ProjectBatch[],
        batchOptions: BatchGenerationOptions = {}
    ): Promise<GenerationResult> => {
        if (isGenerating) {
            appendLog('⏳ Generazione già in corso');
            return { ok: false, error: 'Generazione già in corso' };
        }
        
        if (!projects || projects.length === 0) {
            return { ok: false, error: 'Nessun progetto da elaborare' };
        }
        
        abortRef.current = false;
        setIsGenerating(true);
        clearLogs();
        
        const {
            forceRemoteGeneration = true,
            sourceContext = '',
            duration = '5',
        } = batchOptions;
        
        const totalProjects = projects.length;
        const totalTitles = projects.reduce((acc, p) => acc + p.titles.length, 0);
        
        appendLog(`🎬 Avvio generazione batch: ${totalProjects} progetto/i, ${totalTitles} titolo/i`);
        
        updateProgress({
            global: 0,
            scripting: { percent: 0, status: 'starting', logs: ['Avvio...'] },
            voiceover: { percent: 0, status: 'waiting', logs: ['In attesa...'] },
            remote: { step: 'START', message: 'Invio batch al Master...', progress: 5 },
        });
        
        try {
            const allResults: GenerationResult[] = [];
            let processedProjects = 0;
            
            for (const entry of projects) {
                if (abortRef.current) {
                    setIsGenerating(false);
                    return { ok: false, error: 'Generazione annullata' };
                }
                
                const project = entry.project || {};
                const projectLangs = collectProjectVoiceLangs(project, []);
                const projectLabel = entry.queueIndex === null
                    ? 'corrente'
                    : `coda #${entry.queueIndex + 1}`;
                
                const projectSource = project.sourceContext || sourceContext || '';
                const projectVideoData = {
                    videoTitle: entry.titles[0] || '',
                    background: project.background || 'Nessuno',
                    music: project.music || 'Nessuno',
                    duration: duration,
                };
                
                appendLog(`📤 Invio progetto ${projectLabel}: titoli=${entry.titles.length}`);
                
                updateProgress({
                    global: Math.round((processedProjects / totalProjects) * 80),
                    scripting: { percent: Math.round((processedProjects / totalProjects) * 100), status: 'processing', logs: [`Progetto ${processedProjects + 1}/${totalProjects}`] },
                    remote: { step: 'INFO', message: `Batch ${processedProjects + 1}/${totalProjects}`, progress: 10 + Math.round((processedProjects / totalProjects) * 70) },
                });
                
                const result = await sendToMasterServer(
                    '[SCRIPT WILL BE GENERATED]',
                    projectVideoData,
                    {
                        forceRemoteGeneration,
                        remoteVoiceoverLangs: projectLangs,
                        projectRef: project,
                        titles: entry.titles,
                        sourceContext: projectSource,
                    }
                );
                
                processedProjects += 1;
                allResults.push(result);
                
                if (result.ok) {
                    appendLog(`✅ Progetto ${projectLabel} inviato (job_id: ${result.job_id || 'N/A'})`);
                } else {
                    appendLog(`❌ Progetto ${projectLabel} fallito: ${result.error}`);
                }
            }
            
            const successCount = allResults.filter(r => r.ok).length;
            const failedCount = allResults.length - successCount;
            
            if (failedCount === 0) {
                updateProgress({
                    global: 100,
                    scripting: { percent: 100, status: 'done', logs: ['Completato'] },
                    voiceover: { percent: 100, status: 'done', logs: ['Completato'] },
                    remote: { step: 'DONE', message: '✅ Batch completato! Job in coda.', progress: 100 },
                });
                
                appendLog('✅ Batch completato con successo');
                onGenerationComplete?.(allResults);
                
                setIsGenerating(false);
                return { ok: true, results: allResults.flatMap(r => r.results || []), job_id: allResults[0]?.job_id };
            }
            
            // Partial failure
            updateProgress({
                global: 100,
                scripting: { percent: 100, status: 'partial', logs: [`${successCount}/${totalProjects} ok`] },
                voiceover: { percent: 100, status: 'partial', logs: [`${successCount}/${totalProjects} ok`] },
                remote: { step: 'ERROR', message: `⚠️ Parziale: ${failedCount} falliti`, progress: 100, isError: true },
            });
            
            appendLog(`⚠️ Batch parziale: ${successCount} ok, ${failedCount} falliti`);
            onGenerationComplete?.(allResults);
            
            setIsGenerating(false);
            return {
                ok: successCount > 0,
                error: failedCount > 0 ? `${failedCount} progetti falliti` : undefined,
                results: allResults.flatMap(r => r.results || []),
            };
            
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Errore durante la generazione';
            
            updateProgress({
                global: 100,
                scripting: { percent: 0, status: 'error', logs: [errorMsg] },
                voiceover: { percent: 0, status: 'error', logs: [errorMsg] },
                remote: { step: 'ERROR', message: `❌ ${errorMsg}`, progress: 100, isError: true },
            });
            
            appendLog(`❌ Errore: ${errorMsg}`);
            onError?.(error instanceof Error ? error : new Error(errorMsg));
            
            setIsGenerating(false);
            return { ok: false, error: errorMsg };
        }
    }, [
        isGenerating,
        appendLog,
        clearLogs,
        updateProgress,
        sendToMasterServer,
        onGenerationComplete,
        onError,
    ]);
    
    // ============ Cancel Generation ============
    
    const cancelGeneration = useCallback(() => {
        abortRef.current = true;
        appendLog('🛑 Generazione annullata');
        
        updateProgress({
            global: 0,
            scripting: { percent: 0, status: 'cancelled', logs: ['Annullato'] },
            voiceover: { percent: 0, status: 'cancelled', logs: ['Annullato'] },
            remote: { step: 'CANCELLED', message: 'Generazione annullata', progress: 0 },
        });
        
        setIsGenerating(false);
    }, [appendLog, updateProgress]);
    
    // ============ Return ============
    
    return {
        isGenerating,
        progress,
        logs,
        generateScripts,
        cancelGeneration,
        clearLogs,
    };
}

export default useScriptGenerator;
