// Types for Drive links data
export interface DriveLink {
    id: string;
    name: string;
    link: string;
    parentId?: string;
    language?: string;
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
    createdAt: number;
    updatedAt: number;
}

// Breadcrumb item type
export interface BreadcrumbItem {
    id: string;
    name: string;
}

export interface FileItem {
    id: string;
    name: string;
    type: 'folder' | 'file';
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
}

export interface ChannelGroup {
    id: string;
    name: string;
    channels: Array<{ id: string; name: string; thumbnail?: string }>;
}

// Fallback folder ID when VideoYoutube is not found in drive-links
export const VIDEOYOUTUBE_FOLDER_ID_FALLBACK = '1xVCe3zglpQc9MVF-10zHyTOgy9Dp7nID';
export const VIDEOYOUTUBE_FOLDER_NAME = 'VideoYoutube';

export function isRealDriveId(id?: string): boolean {
    const value = (id ?? '').trim();
    return /^[a-zA-Z0-9_-]{20,}$/.test(value);
}

export function resolveDriveFolderId(folder: { id: string; link?: string }): string | null {
    const id = (folder.id ?? '').trim();
    if (isRealDriveId(id)) return id;

    const link = folder.link ?? '';
    const fromFolderPath = link.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
    if (fromFolderPath?.[1] && isRealDriveId(fromFolderPath[1])) return fromFolderPath[1];

    const fromIdQuery = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (fromIdQuery?.[1] && isRealDriveId(fromIdQuery[1])) return fromIdQuery[1];

    return null;
}

export function normalizeFolderId(id?: string): string {
    const value = (id ?? '').trim();
    return isRealDriveId(value) ? value : VIDEOYOUTUBE_FOLDER_ID_FALLBACK;
}

export function stripExtension(name: string): string {
    return name.replace(/\.[^/.]+$/, '');
}

export function formatSize(bytes?: number): string {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
}
