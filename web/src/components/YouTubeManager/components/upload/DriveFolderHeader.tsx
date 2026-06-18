/**
 * DriveFolderHeader Component
 * Pure presentational component for Drive folder header
 */

import React from 'react';
import { Folder, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';


export interface DriveFolderHeaderProps {
  /** Folder name */
  folderName: string;
  /** Number of folders */
  folderCount: number;
  /** Number of videos */
  videoCount: number;
  /** Whether currently loading */
  loading: boolean;
  /** Current folder ID for Drive link */
  currentFolderId: string;
  /** Reload folder handler */
  onReload: () => void;
}

export const DriveFolderHeader: React.FC<DriveFolderHeaderProps> = ({
  folderName,
  folderCount,
  videoCount,
  loading,
  currentFolderId,
  onReload,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/15 rounded-lg">
          <Folder className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{folderName}</h3>
          <p className="text-sm text-text-secondary">
            {folderCount > 0 && `${folderCount} folders`}
            {folderCount > 0 && videoCount > 0 && ' • '}
            {videoCount > 0 && `${videoCount} videos`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`https://drive.google.com/drive/folders/${currentFolderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-surface-hover dark:hover:bg-surface-dark-lighter rounded-lg transition-colors"
          title="Open in Google Drive"
        >
          <ExternalLink className="w-5 h-5 text-text-secondary" />
        </a>
        <button
          onClick={onReload}
          className="p-2 hover:bg-surface-hover dark:hover:bg-surface-dark-lighter rounded-lg transition-colors"
          title="Reload"
        >
          <RefreshCw className={`w-5 h-5 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default DriveFolderHeader;
