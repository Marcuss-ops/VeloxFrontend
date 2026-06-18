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
    ChevronRight,
    Home,
} from 'lucide-react';

import { useDriveImporter, type DriveImporterProps } from './hooks/useDriveImporter';
import { DriveImporterError } from './components/DriveImporterError';
import { DriveImporterForm } from './components/DriveImporterForm';

export const DriveImporter: React.FC<DriveImporterProps> = (props) => {
    const {
        loading,
        files,
        error,
        breadcrumbs,
        selectedIds,
        searchQuery,
        title,
        description,
        tags,
        visibility,
        scheduleDate,
        scheduleTime,
        thumbnailMode,
        driveThumbnailPreview,
        channelGroups,
        selectedGroup,
        selectedChannels,
        channels,
        currentFolderId,
        driveAvailable,
        filteredFiles,
        folderCount,
        videoCount,
        selectedFiles,
        isPublishing,
        formatSize,
        setSearchQuery,
        setTitle,
        setDescription,
        setTags,
        setVisibility,
        setScheduleDate,
        setScheduleTime,
        setThumbnailMode,
        setSelectedIds,
        setSelectedGroup,
        setSelectedChannels,
        loadFolder,
        startDriveOAuth,
        navigateToFolder,
        navigateToBreadcrumb,
        toggleSelection,
        toggleChannel,
        handlePublishNow,
        handleSchedule,
    } = useDriveImporter(props);

    // Error / loading states handled by DriveImporterError
    const errorState = DriveImporterError({
        loading,
        files,
        error,
        driveAvailable,
        startDriveOAuth,
        loadFolder,
        currentFolderId,
    });
    if (errorState) {
        return errorState;
    }

    return (
        <div className="space-y-4">
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
                        onClick={() => loadFolder(currentFolderId)}
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
                            onClick={() => navigateToBreadcrumb(index)}
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
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
                                onClick={() => navigateToFolder(folder.id, folder.name)}
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
                                    onClick={() => toggleSelection(item.id)}
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

            {/* Upload Form */}
            <DriveImporterForm
                selectedFiles={selectedFiles}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                tags={tags}
                setTags={setTags}
                visibility={visibility}
                setVisibility={setVisibility}
                scheduleDate={scheduleDate}
                setScheduleDate={setScheduleDate}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                thumbnailMode={thumbnailMode}
                setThumbnailMode={setThumbnailMode}
                driveThumbnailPreview={driveThumbnailPreview}
                channelGroups={channelGroups}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                selectedChannels={selectedChannels}
                setSelectedChannels={setSelectedChannels}
                channels={channels}
                toggleChannel={toggleChannel}
                handlePublishNow={handlePublishNow}
                handleSchedule={handleSchedule}
                isPublishing={isPublishing}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
            />
        </div>
    );
};