/**
 * Memoized Selectors
 * 
 * Pure functions for deriving data from state.
 * Use with useMemo in components to prevent unnecessary recalculations.
 * 
 * These selectors are designed to work with normalized state shapes:
 * - filesById, foldersById
 * - channelsById
 * - groupsByName
 * 
 * @example
 * ```tsx
 * const filteredFiles = useMemo(
 *   () => selectFilteredFiles(files, searchQuery),
 *   [files, searchQuery]
 * );
 * ```
 */

import type { FileItem } from '@/components/YouTubeManager/hooks/useDriveFolderBrowser';
import type { ChannelOption, ChannelGroupOption } from '@/components/YouTubeManager/hooks/useYouTubeChannelSelection';

// ============================================
// Drive File Selectors
// ============================================

/**
 * Filter files by search query
 */
export function selectFilteredFiles(files: FileItem[], searchQuery: string): FileItem[] {
  if (!searchQuery.trim()) return files;
  
  const query = searchQuery.toLowerCase();
  return files.filter(f => f.name.toLowerCase().includes(query));
}

/**
 * Count folders in file list
 */
export function selectFolderCount(files: FileItem[]): number {
  return files.filter(f => f.type === 'folder').length;
}

/**
 * Count video files in file list
 */
export function selectVideoCount(files: FileItem[]): number {
  return files.filter(f => f.type === 'file').length;
}

/**
 * Get selected files only (exclude folders)
 */
export function selectSelectedFiles(files: FileItem[], selectedIds: Set<string>): FileItem[] {
  return files.filter(f => selectedIds.has(f.id) && f.type === 'file');
}

/**
 * Get selected folders only
 */
export function selectSelectedFolders(files: FileItem[], selectedIds: Set<string>): FileItem[] {
  return files.filter(f => selectedIds.has(f.id) && f.type === 'folder');
}

/**
 * Check if any files are selected
 */
export function selectHasSelection(selectedIds: Set<string>): boolean {
  return selectedIds.size > 0;
}

/**
 * Get files filtered by type
 */
export function selectFilesByType(files: FileItem[], type: 'file' | 'folder'): FileItem[] {
  return files.filter(f => f.type === type);
}

// ============================================
// Channel Selectors
// ============================================

/**
 * Filter channels by search query
 */
export function selectFilteredChannels(
  channels: ChannelOption[],
  searchQuery: string
): ChannelOption[] {
  if (!searchQuery.trim()) return channels;
  
  const query = searchQuery.toLowerCase();
  return channels.filter(ch => 
    ch.name.toLowerCase().includes(query) ||
    ch.id.toLowerCase().includes(query)
  );
}

/**
 * Get selected channels from channel list
 */
export function selectSelectedChannels(
  channels: ChannelOption[],
  selectedChannelIds: string[]
): ChannelOption[] {
  const selectedIds = new Set(selectedChannelIds);
  return channels.filter(ch => selectedIds.has(ch.id));
}

/**
 * Check if a group is fully selected
 */
export function selectIsGroupSelected(
  group: ChannelGroupOption,
  selectedChannelIds: string[]
): boolean {
  if (group.channels.length === 0) return false;
  const selectedIds = new Set(selectedChannelIds);
  return group.channels.every(ch => selectedIds.has(ch.id));
}

/**
 * Get channel by ID (for normalized state)
 */
export function selectChannelById(
  channels: ChannelOption[],
  channelId: string
): ChannelOption | undefined {
  return channels.find(ch => ch.id === channelId);
}

// ============================================
// Group Selectors
// ============================================

/**
 * Get active group from groups list
 */
export function selectActiveGroup(
  groups: ChannelGroupOption[],
  selectedGroupId: string | null
): ChannelGroupOption | undefined {
  if (!selectedGroupId) return undefined;
  return groups.find(g => g.id === selectedGroupId);
}

/**
 * Get all unique channels from all groups
 */
export function selectAllGroupChannels(
  groups: ChannelGroupOption[]
): ChannelOption[] {
  const channelMap = new Map<string, ChannelOption>();
  
  groups.forEach(group => {
    group.channels.forEach(ch => {
      if (!channelMap.has(ch.id)) {
        channelMap.set(ch.id, ch);
      }
    });
  });
  
  return Array.from(channelMap.values());
}

/**
 * Get groups with channel counts
 */
export function selectGroupsWithCounts(
  groups: ChannelGroupOption[]
): Array<ChannelGroupOption & { channelCount: number }> {
  return groups.map(group => ({
    ...group,
    channelCount: group.channels.length,
  }));
}

// ============================================
// Upload Form Selectors
// ============================================

/**
 * Check if upload form is valid (can publish)
 */
export function selectCanPublish(
  selectedFiles: FileItem[],
  selectedChannels: string[],
  title: string
): boolean {
  return selectedFiles.length > 0 && 
         selectedChannels.length > 0 && 
         title.trim().length > 0;
}

/**
 * Check if schedule is valid
 */
export function selectCanSchedule(
  selectedFiles: FileItem[],
  selectedChannels: string[],
  title: string,
  scheduleDate: string,
  scheduleTime: string
): boolean {
  return selectCanPublish(selectedFiles, selectedChannels, title) &&
         scheduleDate.length > 0 &&
         scheduleTime.length > 0;
}

/**
 * Get upload tags as array
 */
export function selectUploadTags(tags: string): string[] {
  return tags.split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

// ============================================
// Breadcrumb Selectors
// ============================================

/**
 * Get current breadcrumb (last in array)
 */
export function selectCurrentBreadcrumb<T extends { id: string; name: string }>(
  breadcrumbs: T[]
): T | undefined {
  return breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : undefined;
}

/**
 * Check if can navigate back (more than 1 breadcrumb)
 */
export function selectCanNavigateBack(breadcrumbCount: number): boolean {
  return breadcrumbCount > 1;
}

// ============================================
// Performance Helpers
// ============================================

/**
 * Create a stable reference to an object
 * Prevents unnecessary rerenders when object content hasn't changed
 */
export function createStableRef<T extends Record<string, any>>(
  current: T,
  previous: T | null
): T {
  if (!previous) return current;
  
  // Check if all keys have same values
  const keys = Object.keys(current) as (keyof T)[];
  const hasChanged = keys.some(key => current[key] !== previous[key]);
  
  return hasChanged ? current : previous;
}

/**
 * Memoize array reference
 * Returns previous array if content is the same (shallow comparison)
 */
export function memoizeArray<T>(current: T[], previous: T[] | null): T[] {
  if (!previous || current.length !== previous.length) return current;
  
  const hasChanged = current.some((item, index) => item !== previous![index]);
  return hasChanged ? current : previous;
}
