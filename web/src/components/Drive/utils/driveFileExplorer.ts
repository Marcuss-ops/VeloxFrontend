import type { DriveNode } from '../DriveFileExplorer/types';

export const isVideoFile = (f: DriveNode) => {
    const mime = (f.mimeType || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    return mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg)$/i.test(name);
};

export const isImageFile = (f: DriveNode) => {
    const mime = (f.mimeType || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);
};

export const isAudioFile = (f: DriveNode) => {
    const mime = (f.mimeType || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    return mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(name);
};

export const formatFileSize = (bytes?: number) => {
    if (!bytes) return '--';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
};

export const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'n/d';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'n/d';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getDefaultFileFilter = (mode: 'clip' | 'stock' | 'voiceover' | 'all') => {
    switch (mode) {
        case 'clip': return (f: DriveNode) => isVideoFile(f);
        case 'stock': return (f: DriveNode) => isImageFile(f);
        case 'voiceover': return (f: DriveNode) => isAudioFile(f);
        default: return (_f: DriveNode) => true;
    }
};
