/** DrivePickerModal shared types and utilities */

export interface DriveEntry {
    id: string;
    name: string;
    mimeType?: string;
    type?: 'folder' | 'file';
    modifiedTime?: string;
    createdTime?: string;
    webViewLink?: string;
    thumbnailLink?: string;
}

export interface FolderNode {
    id: string;
    name: string;
}

export function normalizeGroup(s: string) {
    return (s || '').trim().toLowerCase();
}

export function isTextFile(name: string) {
    return (name || '').toLowerCase().endsWith('.txt');
}

export function isClipFile(f: DriveEntry) {
    const mime = (f.mimeType || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    return mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name);
}

export function getItemTime(f: DriveEntry) {
    const raw = f.modifiedTime || f.createdTime;
    const ts = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(ts) ? ts : 0;
}

export function formatDateTime(raw?: string) {
    if (!raw) return 'n/d';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return 'n/d';
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(secs: number | undefined) {
    if (!secs || !Number.isFinite(secs)) return '--:--';
    const s = Math.max(0, Math.round(secs));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function buildClipPayload(f: DriveEntry) {
    return {
        id: f.id,
        name: f.name,
        url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    };
}

export async function loadDriveFiles(
    folderId: string,
    apiBase: string
): Promise<{ ok: boolean; folders: DriveEntry[]; files: DriveEntry[]; error?: string }> {
    try {
        const res = await fetch(`${apiBase}/api/drive/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parent_id: folderId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
            return { ok: false, folders: [], files: [], error: data?.error || `Errore ${res.status}` };
        }
        const all: DriveEntry[] = Array.isArray(data.files) ? data.files : [];
        return {
            ok: true,
            folders: all.filter((e) => e.type === 'folder' || e.mimeType === 'application/vnd.google-apps.folder'),
            files: all.filter((e) => !(e.type === 'folder' || e.mimeType === 'application/vnd.google-apps.folder')),
        };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Errore rete';
        return { ok: false, folders: [], files: [], error: message };
    }
}

export async function resolveGroupFolder(
    selectedGroup: string,
    masterFolderId: string,
    apiBase: string
): Promise<{ folderId: string | null; folderName: string; path: FolderNode[] }> {
    try {
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
                return {
                    folderId: resolvedId,
                    folderName: resolvedName,
                    path: [
                        { id: masterFolderId, name: 'Master' },
                        { id: resolvedId, name: resolvedName },
                    ],
                };
            }
        }
    } catch (e) {
        // fall through
    }
    return { folderId: null, folderName: '', path: [] };
}

export async function readTxtFile(
    fileId: string,
    apiBase: string
): Promise<{ content: string; error?: string }> {
    try {
        const res = await fetch(`${apiBase}/api/drive/read-txt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
            return { content: '', error: data?.error || `Errore ${res.status}` };
        }
        return { content: String(data?.content || '') };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Errore rete';
        return { content: '', error: message };
    }
}
