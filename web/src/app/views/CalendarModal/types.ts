/**
 * CalendarModal Types & Utilities
 *
 * Shared types, interfaces, and utility functions for the Calendar Modal component.
 */

import type { DriveLink } from '@/lib/api';
export type { DriveFile } from '@/lib/api/driveApi';
import type { DriveFile } from '@/lib/api/driveApi';

export interface YouTubeGroup {
    name: string;
    channels: Array<{
        id: string;
        name: string;
        thumbnail: string;
        title: string;
    }>;
}

export interface DriveGroup {
    group: string;
    display: string;
    stock: { id: string; name: string } | null;
    clip: { id: string; name: string } | null;
    voiceover: { id: string; name: string } | null;
}

export interface DriveFolderLite {
    id: string;
    name: string;
    parentId?: string;
}

export type ClipType = 'initial' | 'intermediate' | 'final' | 'stock';

export interface VideoClip {
    id: string;
    driveId: string;
    name: string;
    path?: string;
    url?: string;
    webViewLink?: string;
    thumbnail?: string;
    duration?: number;
    type: ClipType;
}

export interface CalendarEvent {
    id: string;
    externalId?: string;
    source?: string;
    title: string;
    date: number;
    month: number;
    year: number;
    status?: import('@/lib/api').ProjectStatus;
    youtubeGroup?: string;
    stockFootage: VideoClip[];
    initialClips: VideoClip[];
    intermediateClips: VideoClip[];
    finalClips: VideoClip[];
    voiceoverPaths?: string[];
    titles?: string[];
    scriptText?: string;
    youtubeLinks?: string[];
    category?: string;
    jobId?: string;
    jobStatus?: string;
    queuedAt?: string;
    queueError?: string;
    outputVideoPath?: string;
    outputVideoUrl?: string;
    publishStatus?: string;
}

export interface CalendarModalProps {
    event: CalendarEvent | null;
    selectedDay: number;
    selectedMonth: number;
    selectedYear: number;
    onClose: () => void;
    onSave: (event: CalendarEvent) => void | Promise<void>;
    onDelete?: (eventId: string) => void;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export async function parseDriveFoldersResponse(res: Response): Promise<DriveFolderLite[]> {
    const text = await res.text();
    try {
        const data = JSON.parse(text) as { folders?: DriveFolderLite[] };
        return data.folders || [];
    } catch {
        console.warn('[CalendarModal] Drive folders response not JSON:', res.status, text.slice(0, 160));
        return [];
    }
}

export async function parseDriveFilesAsFolders(res: Response): Promise<DriveFolderLite[]> {
    const text = await res.text();
    try {
        const data = JSON.parse(text) as { files?: Array<{ id: string; name: string; mimeType?: string }> };
        const files = data.files || [];
        return files
            .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
            .map(f => ({ id: f.id, name: f.name }));
    } catch {
        console.warn('[CalendarModal] Drive files response not JSON:', res.status, text.slice(0, 160));
        return [];
    }
}

export async function fetchDriveFiles(folderId: string, signal?: AbortSignal): Promise<DriveFile[]> {
    const res = await fetch('/api/drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
        signal,
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.files)) return [];
    return data.files as DriveFile[];
}

export function groupDriveLinksIntoDriveGroups(driveLinks: DriveLink[]): DriveGroup[] {
    const groupMap = new Map<string, DriveGroup>();
    driveLinks.forEach((item) => {
        if (item.language) {
            const lang = item.language.toLowerCase();
            if (!groupMap.has(lang)) {
                groupMap.set(lang, {
                    group: lang,
                    display: item.name,
                    stock: null,
                    clip: null,
                    voiceover: null
                });
            }
            const group = groupMap.get(lang)!;
            if (item.parentId === '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh' || item.name === 'Stock Master') {
                group.stock = { id: item.id, name: item.name };
            } else if (item.parentId === '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS' || item.name === 'Clips') {
                group.clip = { id: item.id, name: item.name };
            } else if (item.parentId === '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A' || item.name === 'Voiceover') {
                group.voiceover = { id: item.id, name: item.name };
            }
        }
    });
    return Array.from(groupMap.values());
}
