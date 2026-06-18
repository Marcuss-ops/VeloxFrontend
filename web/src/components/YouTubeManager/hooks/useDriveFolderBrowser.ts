/**
 * useDriveFolderBrowser Hook
 * 
 * Manages Drive folder navigation, file listing, and search.
 * Extracted from DriveImporter to separate navigation logic from UI.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { driveApi, type DriveFile as ApiDriveFile } from '@/lib/api';

// Constants
const VIDEOYOUTUBE_FOLDER_ID_FALLBACK = '1xVCe3zglpQc9MVF-10zHyTOgy9Dp7nID';
const VIDEOYOUTUBE_FOLDER_NAME = 'VideoYoutube';

// Types
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

export interface UseDriveFolderBrowserOptions {
  /** Initial folder ID to load (optional, defaults to VideoYoutube) */
  initialFolderId?: string;
}

export interface UseDriveFolderBrowserReturn {
  /** Current folder ID */
  currentFolderId: string;
  /** Breadcrumb navigation items */
  breadcrumbs: BreadcrumbItem[];
  /** Files and folders in current directory */
  files: FileItem[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether Drive is available */
  driveAvailable: boolean;
  /** Search query */
  searchQuery: string;
  /** Selected file IDs */
  selectedIds: Set<string>;
  
  // Actions
  /** Navigate to a folder */
  navigateToFolder: (folderId: string, folderName: string) => void;
  /** Navigate to breadcrumb at index */
  navigateToBreadcrumb: (index: number) => void;
  /** Toggle file selection */
  toggleSelection: (fileId: string) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Reload current folder */
  reloadFolder: () => Promise<void>;
  /** Get selected files */
  getSelectedFiles: () => FileItem[];
  /** Filtered files based on search */
  filteredFiles: FileItem[];
}

// Utility functions
function isRealDriveId(id?: string): boolean {
  const value = (id ?? '').trim();
  return /^[a-zA-Z0-9_-]{20,}$/.test(value);
}

function normalizeFolderId(id?: string): string {
  const value = (id ?? '').trim();
  return isRealDriveId(value) ? value : VIDEOYOUTUBE_FOLDER_ID_FALLBACK;
}

function fileToFileItem(file: ApiDriveFile): FileItem {
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
  return {
    id: file.id,
    name: file.name,
    type: isFolder ? 'folder' : 'file',
    mimeType: file.mimeType,
    size: file.size,
    thumbnailUrl: file.thumbnailLink,
  };
}

/**
 * Hook to browse Drive folders and files
 */
export function useDriveFolderBrowser({
  initialFolderId,
}: UseDriveFolderBrowserOptions = {}): UseDriveFolderBrowserReturn {
  const [currentFolderId, setCurrentFolderId] = useState(
    normalizeFolderId(initialFolderId)
  );
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: normalizeFolderId(initialFolderId), name: VIDEOYOUTUBE_FOLDER_NAME }
  ]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driveAvailable, setDriveAvailable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load folder
  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    const safeFolderId = normalizeFolderId(folderId);

    try {
      const result = await driveApi.files(safeFolderId);
      const rawFiles = result.files || [];

      const items: FileItem[] = rawFiles.map(fileToFileItem);

      setFiles(items);
      setDriveAvailable(true);
    } catch (err) {
      console.error('Failed to load folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Drive data');
      setDriveAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial folder
  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  // Navigate to folder
  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    const safeFolderId = normalizeFolderId(folderId);
    const existingIndex = breadcrumbs.findIndex(b => b.id === safeFolderId);
    
    if (existingIndex >= 0) {
      setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
    } else {
      setBreadcrumbs([...breadcrumbs, { id: safeFolderId, name: folderName }]);
    }

    setCurrentFolderId(safeFolderId);
    setSelectedIds(new Set());
  }, [breadcrumbs]);

  // Navigate to breadcrumb
  const navigateToBreadcrumb = useCallback((index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(breadcrumbs[index].id);
    setSelectedIds(new Set());
  }, [breadcrumbs]);

  // Toggle selection
  const toggleSelection = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Reload folder
  const reloadFolder = useCallback(async () => {
    await loadFolder(currentFolderId);
  }, [loadFolder, currentFolderId]);

  // Get selected files
  const getSelectedFiles = useCallback(() => {
    return files.filter(f => selectedIds.has(f.id) && f.type === 'file');
  }, [files, selectedIds]);

  // Filtered files
  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return {
    currentFolderId,
    breadcrumbs,
    files,
    loading,
    error,
    driveAvailable,
    searchQuery,
    selectedIds,
    navigateToFolder,
    navigateToBreadcrumb,
    toggleSelection,
    clearSelection,
    setSearchQuery,
    reloadFolder,
    getSelectedFiles,
    filteredFiles,
  };
}

export default useDriveFolderBrowser;
