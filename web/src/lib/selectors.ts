export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

/**
 * Minimal set of drive-file selectors used by the upload flows.
 * Previously this file contained many one-line selectors and custom
 * memoization helpers that duplicated React's built-in `useMemo`.
 * Keep only the functions actually imported by the app.
 */

export function selectFilteredFiles(files: FileItem[], searchQuery: string): FileItem[] {
  if (!searchQuery.trim()) return files;

  const query = searchQuery.toLowerCase();
  return files.filter(f => f.name.toLowerCase().includes(query));
}

export function selectFolderCount(files: FileItem[]): number {
  return files.filter(f => f.type === 'folder').length;
}

export function selectVideoCount(files: FileItem[]): number {
  return files.filter(f => f.type === 'file').length;
}

export function selectSelectedFiles(files: FileItem[], selectedIds: Set<string>): FileItem[] {
  return files.filter(f => selectedIds.has(f.id) && f.type === 'file');
}
