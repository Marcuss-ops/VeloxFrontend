/**
 * Utility functions for Script Editor History management
 * Consolidated from ScriptTabApp.tsx and ScriptCanvas.tsx
 */

// Normalize title for history storage
export const normalizeTitle = (value: string): string => String(value || '').trim();

// Normalize link for history storage
export const normalizeLink = (value: string): string => String(value || '').trim();

// Create unique key for title+link history item
export const historyItemKey = (title: string, link: string): string => {
    return `${normalizeTitle(title).toLowerCase()}::${normalizeLink(link).toLowerCase()}`;
};

// Check if URL is YouTube
export const isYouTubeUrl = (url: string): boolean => {
    const s = String(url || '').toLowerCase();
    return s.includes('youtube.com') || s.includes('youtu.be');
};

// Extract first YouTube URL from text
export const extractFirstYouTubeUrl = (text: string): string => {
    const urls = String(text || '').match(/https?:\/\/[^\s]+/g) || [];
    return urls.find((u: string) => isYouTubeUrl(u)) || '';
};
