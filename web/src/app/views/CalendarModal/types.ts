/**
 * CalendarModal Types & Utilities
 *
 * Shared types, interfaces, and utility functions for the Calendar Modal component.
 */

export type { DriveFile } from '@/lib/api/driveApi';
import type { DriveFile } from '@/lib/api/driveApi';
import { driveApi } from '@/lib/api/driveApi';

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
    /** Legacy wire field retained for round-tripping old calendar events only. */
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

export interface CalendarProjectFolderContext {
    /** Folder IDs are opaque, project-scoped bridge data supplied by InstaEdit. */
    stockFolderId?: string | null;
    stockFolderName?: string | null;
    clipFolderId?: string | null;
    clipFolderName?: string | null;
    voiceoverFolderId?: string | null;
    voiceoverFolderName?: string | null;
}

export interface CalendarModalProps {
    event: CalendarEvent | null;
    selectedDay: number;
    selectedMonth: number;
    selectedYear: number;
    /** Optional authorized context; never inferred from groups or global Drive links. */
    projectContext?: CalendarProjectFolderContext;
    onClose: () => void;
    onSave: (event: CalendarEvent) => void | Promise<void>;
    onDelete?: (eventId: string) => void;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

/** Thin re-export over the canonical driveApi (single transport authority). */
export async function fetchDriveFiles(folderId: string, signal?: AbortSignal): Promise<DriveFile[]> {
    const result = await driveApi.filesOf(folderId);
    void signal; // abort propagates through the shared client's own signal plumbing
    return result.files;
}
