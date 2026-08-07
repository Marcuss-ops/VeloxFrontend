/**
 * useCalendarState
 *
 * Custom hook managing all state, draft persistence, and data loading
 * for the Calendar Modal component.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ProjectStatus } from '@/lib/api';
import { loadCategories } from '@/lib/api/titleCategories';
import type { CalendarProjectFolderContext, VideoClip, DriveFolderLite, DriveFile, ClipType } from './types';
import { fetchDriveFiles } from './types';

interface UseCalendarStateProps {
    selectedDay: number;
    selectedMonth: number;
    selectedYear: number;
    initialEvent: CalendarEventInternal | null;
    projectContext?: CalendarProjectFolderContext;
    onClose: () => void;
}

interface CalendarEventInternal {
    id: string;
    title: string;
    date: number;
    month: number;
    year: number;
    /** Legacy wire field; never used for folder lookup or authorization. */
    youtubeGroup?: string;
    status?: ProjectStatus;
    stockFootage: VideoClip[];
    initialClips: VideoClip[];
    intermediateClips: VideoClip[];
    finalClips: VideoClip[];
    titles?: string[];
    scriptText?: string;
    youtubeLinks?: string[];
    voiceoverPaths?: string[];
    category?: string;
    selectedCategory?: string;
    projectStatus?: ProjectStatus;
}

export function useCalendarState({ selectedDay, selectedMonth, selectedYear, initialEvent, projectContext, onClose }: UseCalendarStateProps) {
    const [title, setTitle] = useState(initialEvent?.title || '');
    const [titles, setTitles] = useState<string[]>([]);
    const [youtubeGroup, setYoutubeGroup] = useState(initialEvent?.youtubeGroup || '');
    const [stockFootage, setStockFootage] = useState<VideoClip[]>(initialEvent?.stockFootage || []);
    const [initialClips, setInitialClips] = useState<VideoClip[]>(initialEvent?.initialClips || []);
    const [intermediateClips, setIntermediateClips] = useState<VideoClip[]>(initialEvent?.intermediateClips || []);
    const [finalClips, setFinalClips] = useState<VideoClip[]>(initialEvent?.finalClips || []);

    // Data from APIs
    const [stockSubfolders, setStockSubfolders] = useState<DriveFolderLite[]>([]);
    const [clipSubfolders, setClipSubfolders] = useState<DriveFolderLite[]>([]);
    const [loadingStockSubfolders, setLoadingStockSubfolders] = useState(false);
    const [loadingClipSubfolders, setLoadingClipSubfolders] = useState(false);
    const [selectedStockFolderId, setSelectedStockFolderId] = useState<string>('');
    const [selectedInitialClipFolderId, setSelectedInitialClipFolderId] = useState<string>('');
    const [selectedIntermediateClipFolderId, setSelectedIntermediateClipFolderId] = useState<string>('');
    const [selectedFinalClipFolderId, setSelectedFinalClipFolderId] = useState<string>('');
    const [stockFolderCounts, setStockFolderCounts] = useState<Record<string, number>>({});

    // Clip picker
    const [clipPickerOpen, setClipPickerOpen] = useState(false);
    const [clipPickerFolderId, setClipPickerFolderId] = useState('');
    const [clipPickerFolderName, setClipPickerFolderName] = useState('');
    const [clipPickerType, setClipPickerType] = useState<ClipType>('initial');
    const [clipPickerFiles, setClipPickerFiles] = useState<DriveFile[]>([]);
    const [clipPickerLoading, setClipPickerLoading] = useState(false);
    const hoverTimerRef = useRef<number | null>(null);
    const clipPickerAbortRef = useRef<AbortController | null>(null);

    // Title selection
    const [titleSelectionOpen, setTitleSelectionOpen] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState<'info' | 'clips'>(() => {
        const hash = window.location.hash.slice(1);
        if (hash === 'clips') return 'clips';
        return 'info';
    });

    // Script & YouTube
    const [scriptText, setScriptText] = useState(initialEvent?.scriptText || '');
    const [youtubeLinks, setYoutubeLinks] = useState<string[]>(initialEvent?.youtubeLinks || []);
    const [voiceoverPaths, setVoiceoverPaths] = useState<string[]>(initialEvent?.voiceoverPaths || []);
    const [newYoutubeLink, setNewYoutubeLink] = useState('');
    const [scriptHistory] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('velox_script_history') || '[]'); } catch { return []; }
    });
    const [youtubeHistory] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('velox_youtube_history') || '[]'); } catch { return []; }
    });
    const [showScriptHistory, setShowScriptHistory] = useState(false);
    const [showYoutubeHistory, setShowYoutubeHistory] = useState(false);

    // Category & status
    const [selectedCategory, setSelectedCategory] = useState<string>(initialEvent?.category || '');
    const [projectStatus, setProjectStatus] = useState<ProjectStatus>(initialEvent?.status || 'draft');

    // Clip detail
    const [clipDetailOpen, setClipDetailOpen] = useState(false);
    const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);
    const [clipDetailFiles, setClipDetailFiles] = useState<DriveFile[]>([]);
    const [clipDetailLoading, setClipDetailLoading] = useState(false);
    const [audioPlayerUrl, setAudioPlayerUrl] = useState<string | null>(null);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textContentLoading, setTextContentLoading] = useState(false);

    // Draft
    const draftKey = useMemo(() => `velox_calendar_draft_${selectedDay}_${selectedMonth}_${selectedYear}`, [selectedDay, selectedMonth, selectedYear]);

    const saveDraft = useCallback((draft: Partial<CalendarEventInternal>) => {
        try {
            localStorage.setItem(draftKey, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
        } catch (err) {
            console.warn('[CalendarModal] Failed to save draft:', err);
        }
    }, [draftKey]);

    const clearDraft = useCallback(() => {
        try { localStorage.removeItem(draftKey); } catch (err) {
            console.warn('[CalendarModal] Failed to clear draft:', err);
        }
    }, [draftKey]);

    // Load categories
    useEffect(() => { loadCategories(); }, []);

    // Load draft on mount
    useEffect(() => {
        if (!initialEvent) {
            try {
                const saved = localStorage.getItem(draftKey);
                if (saved) {
                    const draft = JSON.parse(saved);
                    if (draft.title) setTitle(draft.title);
                    if (draft.titles) setTitles(draft.titles);
                    if (typeof draft.youtubeGroup === 'string') setYoutubeGroup(draft.youtubeGroup);
                    if (draft.scriptText) setScriptText(draft.scriptText);
                    if (draft.youtubeLinks) setYoutubeLinks(draft.youtubeLinks);
                    if (draft.voiceoverPaths) setVoiceoverPaths(draft.voiceoverPaths);
                    if (draft.selectedCategory) setSelectedCategory(draft.selectedCategory);
                    if (draft.projectStatus) setProjectStatus(draft.projectStatus);
                    if (draft.stockFootage) setStockFootage(draft.stockFootage);
                    if (draft.initialClips) setInitialClips(draft.initialClips);
                    if (draft.intermediateClips) setIntermediateClips(draft.intermediateClips);
                    if (draft.finalClips) setFinalClips(draft.finalClips);
                }
            } catch (err) {
                console.warn('[CalendarModal] Failed to load draft:', err);
            }
        }
    }, [initialEvent, draftKey]);

    // Auto-save draft
    useEffect(() => {
        if (initialEvent) return;
        const timer = window.setTimeout(() => {
            saveDraft({ title, titles, youtubeGroup, scriptText, youtubeLinks, voiceoverPaths, selectedCategory, projectStatus, stockFootage, initialClips, intermediateClips, finalClips });
        }, 500);
        return () => window.clearTimeout(timer);
    }, [initialEvent, title, titles, youtubeGroup, scriptText, youtubeLinks, voiceoverPaths, selectedCategory, projectStatus, stockFootage, initialClips, intermediateClips, finalClips, saveDraft]);

    // Folder lists are loaded only from explicit project folder context. Velox does
    // not enumerate drive_links or infer folders from a social/group label.
    useEffect(() => {
        setStockSubfolders([]);
        setClipSubfolders([]);
        setSelectedStockFolderId('');
        setSelectedInitialClipFolderId('');
        setSelectedIntermediateClipFolderId('');
        setSelectedFinalClipFolderId('');
    }, [initialEvent?.id]);

    // Load only the explicit folder context supplied by the project bridge.
    // No global Drive-link catalog or social/group matching is performed.
    useEffect(() => {
        const controller = new AbortController();
        setStockSubfolders([]);
        setClipSubfolders([]);
        setStockFolderCounts({});
        setSelectedStockFolderId('');
        setSelectedInitialClipFolderId('');
        setSelectedIntermediateClipFolderId('');
        setSelectedFinalClipFolderId('');

        const loadSubfolders = async () => {
            setLoadingStockSubfolders(Boolean(projectContext?.stockFolderId));
            setLoadingClipSubfolders(Boolean(projectContext?.clipFolderId));
            try {
                const [stockResponse, clipResponse] = await Promise.all([
                    projectContext?.stockFolderId
                        ? fetch(`/api/drive/folders`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ parent_id: projectContext.stockFolderId }),
                            signal: controller.signal,
                        })
                        : null,
                    projectContext?.clipFolderId
                        ? fetch(`/api/drive/folders`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ parent_id: projectContext.clipFolderId }),
                            signal: controller.signal,
                        })
                        : null,
                ]);

                const parseFolders = async (response: Response | null) => {
                    if (!response || !response.ok) return [] as DriveFolderLite[];
                    const data = await response.json().catch(() => null) as { folders?: DriveFolderLite[] } | null;
                    return Array.isArray(data?.folders) ? data.folders : [];
                };
                const stockFolders = await parseFolders(stockResponse);
                const clipFolders = await parseFolders(clipResponse);
                setStockSubfolders(stockFolders);
                setClipSubfolders(clipFolders);
                setSelectedStockFolderId(stockFolders[0]?.id || '');
                setSelectedInitialClipFolderId(clipFolders[0]?.id || '');
                setSelectedIntermediateClipFolderId(clipFolders[0]?.id || '');
                setSelectedFinalClipFolderId(clipFolders[0]?.id || '');
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('[CalendarModal] Failed to load project folders:', error);
                }
            } finally {
                setLoadingStockSubfolders(false);
                setLoadingClipSubfolders(false);
            }
        };
        loadSubfolders();
        return () => controller.abort();
    }, [projectContext?.stockFolderId, projectContext?.clipFolderId]);

    // Load stock folder counts
    useEffect(() => {
        if (stockSubfolders.length === 0) return;
        const controller = new AbortController();
        let cancelled = false;
        const loadCounts = async () => {
            for (const folder of stockSubfolders) {
                if (cancelled) return;
                if (stockFolderCounts[folder.id] !== undefined) continue;
                const files = await fetchDriveFiles(folder.id, controller.signal);
                if (cancelled) return;
                setStockFolderCounts(prev => ({ ...prev, [folder.id]: files.length }));
            }
        };
        loadCounts().catch(() => {});
        return () => { cancelled = true; controller.abort(); };
    }, [stockSubfolders, stockFolderCounts]);

    // Clip picker files
    useEffect(() => {
        if (!clipPickerOpen || !clipPickerFolderId) return;
        clipPickerAbortRef.current?.abort();
        const controller = new AbortController();
        clipPickerAbortRef.current = controller;
        setClipPickerLoading(true);
        setClipPickerFiles([]);
        fetchDriveFiles(clipPickerFolderId, controller.signal)
            .then(files => {
                const visible = files.filter(f =>
                    f.mimeType !== 'application/vnd.google-apps.folder' &&
                    !f.name.toLowerCase().endsWith('.txt')
                );
                setClipPickerFiles(visible);
            })
            .catch(() => {})
            .finally(() => setClipPickerLoading(false));
        return () => controller.abort();
    }, [clipPickerOpen, clipPickerFolderId]);

    // Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // URL hash sync
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1);
            if (hash === 'clips' || hash === 'info') setActiveTab(hash);
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleTabChange = useCallback((tab: 'info' | 'clips') => {
        setActiveTab(tab);
        window.location.hash = tab;
    }, []);

    const handleRemoveClip = useCallback((clipId: string, type: 'stock' | 'initial' | 'intermediate' | 'final') => {
        switch (type) {
            case 'stock': setStockFootage(prev => prev.filter(c => c.id !== clipId)); break;
            case 'initial': setInitialClips(prev => prev.filter(c => c.id !== clipId)); break;
            case 'intermediate': setIntermediateClips(prev => prev.filter(c => c.id !== clipId)); break;
            case 'final': setFinalClips(prev => prev.filter(c => c.id !== clipId)); break;
        }
    }, []);

    const handleSave = useCallback(() => {
        const newEvent = {
            id: initialEvent?.id || `event_${Date.now()}`,
            title: title || `Video ${selectedDay}/${selectedMonth + 1}`,
            date: selectedDay,
            month: selectedMonth,
            year: selectedYear,
            youtubeGroup,
            status: projectStatus,
            stockFootage,
            initialClips,
            intermediateClips,
            finalClips,
            voiceoverPaths,
        } as CalendarEventInternal;
        clearDraft();
        // Notify parent via window event since we don't have onSave here
        window.dispatchEvent(new CustomEvent('calendar-save', { detail: newEvent }));
        onClose();
    }, [initialEvent, title, selectedDay, selectedMonth, selectedYear, youtubeGroup, projectStatus, stockFootage, initialClips, intermediateClips, finalClips, voiceoverPaths, onClose, clearDraft]);

    const monthName = useMemo(() =>
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth],
        [selectedMonth]
    );

    const clipFolderNameById = useMemo(() => {
        const map = new Map<string, string>();
        clipSubfolders.forEach(folder => map.set(folder.id, folder.name));
        return map;
    }, [clipSubfolders]);

    const stockFolderNameById = useMemo(() => {
        const map = new Map<string, string>();
        stockSubfolders.forEach(folder => map.set(folder.id, folder.name));
        return map;
    }, [stockSubfolders]);

    const openClipPicker = useCallback((folder: DriveFolderLite, type: ClipType) => {
        setClipPickerFolderId(folder.id);
        setClipPickerFolderName(folder.name);
        setClipPickerType(type);
        setClipPickerOpen(true);
    }, []);

    const scheduleClipPicker = useCallback((folder: DriveFolderLite, type: ClipType) => {
        if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = window.setTimeout(() => {
            openClipPicker(folder, type);
        }, 1500);
    }, [openClipPicker]);

    const cancelClipPickerHover = useCallback(() => {
        if (hoverTimerRef.current) {
            window.clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    }, []);

    useEffect(() => () => cancelClipPickerHover(), [cancelClipPickerHover]);

    const addClipFromFile = useCallback((file: DriveFile, type: ClipType) => {
        const clip: VideoClip = {
            id: file.id,
            driveId: file.id,
            name: file.name,
            thumbnail: file.thumbnailLink,
            duration: file.videoMediaMetadata?.durationMillis ? Number(file.videoMediaMetadata.durationMillis) : undefined,
            type,
        };
        const pushUnique = (prev: VideoClip[]) => (prev.some(c => c.id === clip.id) ? prev : [...prev, clip]);
        if (type === 'initial') setInitialClips(pushUnique);
        if (type === 'intermediate') setIntermediateClips(pushUnique);
        if (type === 'final') setFinalClips(pushUnique);
    }, []);

    const handleClipHoverPreview = useCallback((clip: VideoClip) => {
        setSelectedClip(clip);
        setClipDetailOpen(true);
    }, []);

    return {
        // State
        title, setTitle, titles, setTitles, youtubeGroup, setYoutubeGroup,
        stockFootage, setStockFootage, initialClips, intermediateClips, finalClips,
        stockSubfolders, clipSubfolders, loadingStockSubfolders, loadingClipSubfolders,
        selectedStockFolderId, setSelectedStockFolderId,
        selectedInitialClipFolderId, setSelectedInitialClipFolderId,
        selectedIntermediateClipFolderId, setSelectedIntermediateClipFolderId,
        selectedFinalClipFolderId, setSelectedFinalClipFolderId,
        stockFolderCounts, clipPickerOpen, setClipPickerOpen, clipPickerFolderId,
        clipPickerFolderName, clipPickerType, clipPickerFiles, clipPickerLoading,
        titleSelectionOpen, setTitleSelectionOpen, activeTab, handleTabChange,
        scriptText, setScriptText, youtubeLinks, setYoutubeLinks, newYoutubeLink, setNewYoutubeLink,
        voiceoverPaths, setVoiceoverPaths,
        scriptHistory, youtubeHistory, showScriptHistory, setShowScriptHistory,
        showYoutubeHistory, setShowYoutubeHistory,
        selectedCategory, setSelectedCategory, projectStatus, setProjectStatus,
        clipDetailOpen, setClipDetailOpen, selectedClip, setSelectedClip,
        clipDetailFiles, setClipDetailFiles, clipDetailLoading, setClipDetailLoading,
        audioPlayerUrl, setAudioPlayerUrl, textContent, setTextContent,
        textContentLoading, setTextContentLoading,
        // Computed
        monthName, clipFolderNameById, stockFolderNameById,
        // Handlers
        handleRemoveClip, handleSave, openClipPicker, scheduleClipPicker,
        cancelClipPickerHover, addClipFromFile, handleClipHoverPreview,
        clearDraft, draftKey,
    };
}
