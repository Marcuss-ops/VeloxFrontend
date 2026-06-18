/**
 * DriveFileList Component
 * Pure presentational component for displaying Drive folders and files
 */

import React from 'react';
import { Folder, FileVideo, Loader2, Check } from 'lucide-react';
import type { FileItem } from '../../hooks/useDriveFolderBrowser';

export interface DriveFileListProps {
  /** Files and folders to display */
  files: FileItem[];
  /** Currently selected file IDs */
  selectedIds: Set<string>;
  /** Whether currently loading */
  loading: boolean;
  /** Search query for empty state message */
  searchQuery?: string;
  /** Toggle file selection handler */
  onToggleSelection: (fileId: string) => void;
  /** Navigate to folder handler */
  onNavigateToFolder: (folderId: string, folderName: string) => void;
}

export const DriveFileList: React.FC<DriveFileListProps> = ({
  files,
  selectedIds,
  loading,
  searchQuery,
  onToggleSelection,
  onNavigateToFolder,
}) => {
  const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const folders = files.filter(f => f.type === 'folder');
  const videoFiles = files.filter(f => f.type === 'file');

  const filteredFolders = searchQuery
    ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folders;

  const filteredVideos = searchQuery
    ? videoFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : videoFiles;

  // Loading state
  if (loading && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
        <p className="text-text-secondary">Loading videos from Drive...</p>
      </div>
    );
  }

  return (
    <>
      {/* Folders Grid */}
      {filteredFolders.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <Folder className="w-4 h-4 text-red-300" />
            Folders
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => onNavigateToFolder(folder.id, folder.name)}
                className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 cursor-pointer transition-all hover:border-red-500/40 hover:bg-red-500/5 group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-500/15 rounded-xl flex items-center justify-center mb-3 group-hover:bg-red-500/20 transition-colors">
                    <Folder className="w-8 h-8 text-red-300" />
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate w-full">
                    {folder.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Files List */}
      {filteredVideos.length > 0 && (
        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 max-h-[300px] overflow-auto">
          <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <FileVideo className="w-4 h-4 text-red-300" />
            Videos
          </h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredVideos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onToggleSelection(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedIds.has(item.id)
                      ? 'bg-red-500/15 border border-red-500/30'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                    selectedIds.has(item.id)
                      ? 'bg-red-500 border-red-500'
                      : 'border-gray-600'
                  }`}>
                    {selectedIds.has(item.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-12 h-8 object-cover rounded"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.name}
                    </p>
                    {item.size && (
                      <p className="text-xs text-text-secondary">{formatSize(item.size)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && !loading && (
        <div className="text-center py-8 text-text-secondary">
          <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{searchQuery ? 'No results found' : 'This folder is empty'}</p>
        </div>
      )}

      {/* No search results */}
      {files.length > 0 && filteredFolders.length === 0 && filteredVideos.length === 0 && searchQuery && (
        <div className="text-center py-8 text-text-secondary">
          <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No results found</p>
        </div>
      )}
    </>
  );
};

export default DriveFileList;
