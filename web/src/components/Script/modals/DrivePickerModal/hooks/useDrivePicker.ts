import { useEffect, useMemo, useState } from 'react';

interface DriveEntry {
    id: string;
    name: string;
    mimeType?: string;
    type?: 'folder' | 'file';
    modifiedTime?: string;
    createdTime?: string;
    webViewLink?: string;
    thumbnailLink?: string;
}

declare global {
    interface Window {
        API_BASE_URL?: string;
    }
}

interface DrivePickerModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'clip' | 'stock' | 'voiceover';
    title: string;
    initialFolderId?: string | null;
    initialFolderName?: string | null;
    /** Gruppo YouTube selezionato in tab Script: apre il modal già nella cartella corrispondente (clip/stock/voiceover) */
    selectedGroup?: string | null;
    /** ID cartella master (Clips / Stock / Voiceover) per risolvere selectedGroup da drive_links */
    masterFolderId?: string | null;
    onSelectFolder: (folder: { id: string; name: string }) => void;
    onSelectClip?: (clip: { id: string; name: string; url: string }) => void;
    onSelectClips?: (clips: Array<{ id: string; name: string; url: string }>) => void;
}

interface FolderNode {
    id: string;
    name: string;
}

const normalizeGroup = (s: string) => (s || '').trim().toLowerCase();

export const useDrivePicker = ({
    open,
    onClose,
    mode,
    title,
    initialFolderId,
    initialFolderName,
    selectedGroup,
    masterFolderId,
    onSelectFolder,
    onSelectClip,
    onSelectClips,
}: DrivePickerModalProps) => {
    const [path, setPath] = useState<FolderNode[]>([]);
    const [folders, setFolders] = useState<DriveEntry[]>([]);
    const [files, setFiles] = useState<DriveEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewClip, setPreviewClip] = useState<{ id: string; name: string } | null>(null);
    const [previewTimer, setPreviewTimer] = useState<number | null>(null);
    const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'txt'>('all');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');
    const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
    const [durationById, setDurationById] = useState<Record<string, string>>({});
    const [txtViewer, setTxtViewer] = useState<{ loading: boolean; name: string; content: string; error: string | null }>({
        loading: false,
        name: '',
        content: '',
        error: null,
    });

    const currentFolderId = useMemo(
        () => (path.length > 0 ? path[path.length - 1].id : (initialFolderId || null)),
        [path, initialFolderId],
    );

    const currentFolderName = useMemo(
        () => (path.length > 0 ? path[path.length - 1].name : (initialFolderName || 'Root')),
        [path, initialFolderName],
    );

    const loadFolder = async (folderId: string, nextPath: FolderNode[]) => {
        try {
            setLoading(true);
            setError(null);
            const apiBase = (window.API_BASE_URL || '').toString().trim();
            const res = await fetch(`${apiBase}/api/drive/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: folderId }),
            });
            const data = await res.json();
            if (!res.ok || !data?.ok) {
                setError(data?.error || `Errore ${res.status}`);
                return;
            }
            const all: DriveEntry[] = Array.isArray(data.files) ? data.files : [];
            setFolders(all.filter((e) => e.type === 'folder' || e.mimeType === 'application/vnd.google-apps.folder'));
            setFiles(all.filter((e) => !(e.type === 'folder' || e.mimeType === 'application/vnd.google-apps.folder')));
            setPath(nextPath);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Errore rete';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        setSearchTerm('');
        setFileTypeFilter('all');
        setSortBy('date_desc');
        setSelectedClipIds(new Set());
        setActivePreviewId(null);
        setPreviewClip(null);

        const run = async () => {
            let folderId: string | null = initialFolderId || null;
            let folderName: string = initialFolderName || 'Root';
            let startPath: FolderNode[] = [];

            if (folderId) {
                startPath = [{ id: folderId, name: folderName }];
            } else if (selectedGroup && masterFolderId) {
                setLoading(true);
                setError(null);
                try {
                    const apiBase = (window.API_BASE_URL || '').toString().trim();
                    const res = await fetch(`${apiBase}/api/drive/folders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: masterFolderId }),
                    });
                    const data = await res.json();
                    if (res.ok && data?.folders && Array.isArray(data.folders)) {
                        const want = normalizeGroup(selectedGroup);
                        const matched = data.folders.find(
                            (f: { id?: string; name?: string; language?: string }) => {
                                const n = normalizeGroup((f.name || '').toString());
                                const lang = normalizeGroup((f.language || '').toString());
                                return n === want || lang === want || n.includes(want) || want.includes(n);
                            },
                        );
                        if (matched?.id) {
                            const resolvedId = matched.id;
                            const resolvedName = (matched.name || selectedGroup || '').toString();
                            folderId = resolvedId;
                            folderName = resolvedName;
                            startPath = [
                                { id: masterFolderId as string, name: 'Master' },
                                { id: resolvedId, name: resolvedName },
                            ];
                        }
                    }
                } catch (e) {
                    setError((e as Error)?.message || 'Errore caricamento gruppi');
                } finally {
                    setLoading(false);
                }
            }

            if (!folderId) {
                setFolders([]);
                setFiles([]);
                if (!selectedGroup || !masterFolderId) {
                    setError('Cartella base non configurata per questo gruppo.');
                } else {
                    setError('Nessuna cartella trovata per il gruppo "' + (selectedGroup || '') + '". Seleziona una cartella manualmente.');
                }
                setPath([]);
                return;
            }
            setPath(startPath);
            loadFolder(folderId, startPath);
        };

        run();
    }, [open, initialFolderId, initialFolderName, selectedGroup, masterFolderId]);

    useEffect(() => () => {
        if (previewTimer) window.clearTimeout(previewTimer);
    }, [previewTimer]);

    const isTextFile = (name: string) => (name || '').toLowerCase().endsWith('.txt');
    const isClipFile = (f: DriveEntry) => {
        const mime = (f.mimeType || '').toLowerCase();
        const name = (f.name || '').toLowerCase();
        return mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name);
    };
    const getItemTime = (f: DriveEntry) => {
        const raw = f.modifiedTime || f.createdTime;
        const ts = raw ? Date.parse(raw) : NaN;
        return Number.isFinite(ts) ? ts : 0;
    };
    const formatDateTime = (raw?: string) => {
        if (!raw) return 'n/d';
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return 'n/d';
        return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const formatDuration = (secs: number | undefined) => {
        if (!secs || !Number.isFinite(secs)) return '--:--';
        const s = Math.max(0, Math.round(secs));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    };

    const filteredFolders = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return folders;
        return folders.filter((f) => (f.name || '').toLowerCase().includes(q));
    }, [folders, searchTerm]);

    const filteredFiles = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const base = files.filter((f) => {
            if (!q) return true;
            return (f.name || '').toLowerCase().includes(q);
        });
        const byType = base.filter((f) => {
            if (fileTypeFilter === 'video') return isClipFile(f);
            if (fileTypeFilter === 'txt') return isTextFile(f.name || '');
            return true;
        });
        return byType.sort((a, b) => {
            if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'it');
            if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'it');
            if (sortBy === 'date_asc') return getItemTime(a) - getItemTime(b);
            return getItemTime(b) - getItemTime(a);
        });
    }, [files, searchTerm, fileTypeFilter, sortBy]);

    const clipFiles = filteredFiles.filter(isClipFile);
    const txtFiles = filteredFiles.filter((f) => isTextFile(f.name || ''));
    const genericFiles = filteredFiles.filter((f) => !isClipFile(f) && !isTextFile(f.name || ''));

    const toggleClipSelection = (clipId: string) => {
        setSelectedClipIds((prev) => {
            const next = new Set(prev);
            if (next.has(clipId)) next.delete(clipId);
            else next.add(clipId);
            return next;
        });
    };

    const buildClipPayload = (f: DriveEntry) => ({
        id: f.id,
        name: f.name,
        url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    });

    const addSelectedClips = () => {
        if (selectedClipIds.size === 0) return;
        const selected = clipFiles.filter((f) => selectedClipIds.has(f.id)).map(buildClipPayload);
        if (selected.length === 0) return;
        onSelectClips?.(selected);
    };

    const openTxtFile = async (file: DriveEntry) => {
        try {
            setTxtViewer({ loading: true, name: file.name, content: '', error: null });
            const apiBase = ((window as any).API_BASE_URL || '').toString().trim();
            const res = await fetch(`${apiBase}/api/drive/read-txt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: file.id }),
            });
            const data = await res.json();
            if (!res.ok || !data?.ok) {
                setTxtViewer({ loading: false, name: file.name, content: '', error: data?.error || `Errore ${res.status}` });
                return;
            }
            setTxtViewer({ loading: false, name: file.name, content: String(data?.content || ''), error: null });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Errore rete';
            setTxtViewer({ loading: false, name: file.name, content: '', error: message });
        }
    };

    const startClipPreviewHover = (clip: DriveEntry) => {
        if (previewTimer) window.clearTimeout(previewTimer);
        const t = window.setTimeout(() => {
            setActivePreviewId(clip.id);
            setPreviewClip({ id: clip.id, name: clip.name });
        }, 2000);
        setPreviewTimer(t);
    };

    const clearClipPreviewHover = () => {
        if (previewTimer) window.clearTimeout(previewTimer);
        setPreviewTimer(null);
        setActivePreviewId(null);
        setPreviewClip(null);
    };

    return {
        // State
        path,
        folders,
        files,
        loading,
        error,
        previewClip,
        activePreviewId,
        searchTerm,
        fileTypeFilter,
        sortBy,
        selectedClipIds,
        durationById,
        txtViewer,
        currentFolderId,
        currentFolderName,
        filteredFolders,
        filteredFiles,
        clipFiles,
        txtFiles,
        genericFiles,
        // Setters
        setSearchTerm,
        setFileTypeFilter,
        setSortBy,
        setDurationById,
        setTxtViewer,
        setSelectedClipIds,
        // Functions
        loadFolder,
        toggleClipSelection,
        buildClipPayload,
        addSelectedClips,
        openTxtFile,
        startClipPreviewHover,
        clearClipPreviewHover,
        formatDateTime,
        formatDuration,
        isTextFile,
        isClipFile,
        // Config
        mode,
        onSelectFolder,
        onSelectClip,
        onSelectClips,
        onClose,
        title,
    };
};
