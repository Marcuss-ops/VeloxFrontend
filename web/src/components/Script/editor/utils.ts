import { YouTubeUrl } from '@/lib/domain';

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
export const isYouTubeUrl = (url: string): boolean => YouTubeUrl.isValid(url);

// Extract first YouTube URL from text
export const extractFirstYouTubeUrl = (text: string): string => {
    const url = YouTubeUrl.extractFirst(text);
    return url || '';
};
