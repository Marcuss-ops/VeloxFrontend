import React from 'react';
import {
    Folder,
    RefreshCw,
    Search,
    X,
    Check,
    FileVideo,
    ExternalLink,
    Loader2,
    AlertCircle,
    ChevronRight,
    Home,
} from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
    selectFilteredFiles,
    selectFolderCount,
    selectVideoCount,
} from '@/lib/selectors';
import type { FileItem, BreadcrumbItem } from '../../utils/driveImporter';
import { normalizeFolderId, formatSize } from '../../utils/driveImporter';

interface DriveFileBrowserProps {
    currentFolderId: string;
    breadcrumbs: BreadcrumbItem[];
    files: FileItem[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    selectedIds: Set<string>;
    driveAvailable: boolean;
    onNavigateToFolder: (folderId: string, folderName: string) => void;
    onNavigateToBreadcrumb: (index: number) => void;
    onSearchChange: (query: string) => void;
    onToggleSelection: (fileId: string) => void;
    onReload: () => void;
    onStartDriveOAuth: () => void;
}

export const DriveFileBrowser: React.FC<DriveFileBrowserProps> = ({
    currentFolderId,
    breadcrumbs,
    files,
    loading,
    error,
    searchQuery,
    selectedIds,
    driveAvailable,
    onNavigateToFolder,
    onNavigateToBreadcrumb,
    onSearchChange,
    onToggleSelection,
    onReload,
    onStartDriveOAuth,
}) => {
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

    const filteredFiles = React.useMemo(
        () => selectFilteredFiles(files, debouncedSearchQuery),
        [files, debouncedSearchQuery]
    );
    const folderCount = React.useMemo(() => selectFolderCount(files), [files]);
    const videoCount = React.useMemo(() => selectVideoCount(files), [files]);

    if (loading && files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
                <p className="text-text-secondary">Loading videos from Drive...</p>
            </div>
        );
    }

    if (error && !driveAvailable) {
        const isServerDown = error.includes('404') || error.includes('Failed to fetch') || error.includes('NetworkError');
        const needsDriveAuth = error.toLowerCase().includes('no token set') || error.toLowerCase().includes('authenticate first');
        const displayError = needsDriveAuth
            ? 'Drive authentication expired or is not active on the server. Reconnect Google Drive and try again.'
            : error;

        return (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300 font-medium">
                        {isServerDown ? 'Server unavailable' : 'Google Drive unavailable'}
                    </span>
                </div>
                <p className="text-red-200 text-sm mb-3">{displayError}</p>
                {isServerDown && (
                    <div className="bg-red-900/30 rounded-lg p-3 mb-4">
                        <p className="text-red-200 text-sm font-medium mb-2">To fix this:</p>
                        <ol className="text-red-200/80 text-sm list-decimal list-inside space-y-1">
                            <li>Start the Go server: <code className="bg-red-900/50 px-1 rounded">velox-server</code></li>
                            <li>Make sure `VELOX_DRIVE_CLIENT_ID` and `VELOX_DRIVE_CLIENT_SECRET` are configured</li>
                        </ol>
                    </div>
                )}
                <div className="flex flex-wrap gap-3">
                    {needsDriveAuth && (
                        <button
                            onClick={onStartDriveOAuth}
                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Connect Google Drive
                        </button>
                    )}
                    <button
                        onClick={onReload}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/15 rounded-lg">
                        <Folder className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">VideoYoutube</h3>
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

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 flex-wrap">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id}>
                        {index > 0 && (
                            <ChevronRight className="w-4 h-4 text-text-secondary" />
                        )}
                        <button
                            onClick={() => onNavigateToBreadcrumb(index)}
                            className={`px-2 py-1 rounded text-sm transition-colors ${
                                index === breadcrumbs.length - 1
                                    ? 'bg-red-500/15 text-red-300 font-medium'
                                    : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {index === 0 ? (
                                <span className="flex items-center gap-1">
                                    <Home className="w-4 h-4" />
                                    {crumb.name}
                                </span>
                            ) : (
                                crumb.name
                            )}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                    type="text"
                    placeholder="Search this folder..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        <X className="w-4 h-4 text-text-secondary hover:text-text-primary" />
                    </button>
                )}
            </div>

            {/* Folders Grid - 3 per row */}
            {filteredFiles.some(f => f.type === 'folder') && (
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-red-300" />
                        Folders
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                        {filteredFiles.filter(f => f.type === 'folder').map(folder => (
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
            {filteredFiles.some(f => f.type === 'file') && (
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
                            {filteredFiles.filter(f => f.type === 'file').map(item => (
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
            {filteredFiles.length === 0 && !loading && (
                <div className="text-center py-8 text-text-secondary">
                    <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{searchQuery ? 'No results found' : 'This folder is empty'}</p>
                </div>
            )}
        </>
    );
};
