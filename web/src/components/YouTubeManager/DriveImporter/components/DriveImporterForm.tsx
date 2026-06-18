import React from 'react';
import {
    ShieldCheck,
    Check,
    FileVideo,
    AlertCircle,
    Type,
    FileText,
    Tag,
    Calendar,
    Image,
    Folder,
    Globe,
    Upload,
    Loader2,
} from 'lucide-react';
import type { FileItem, ChannelGroup } from '../hooks/useDriveImporter';

interface DriveImporterFormProps {
    selectedFiles: FileItem[];
    title: string;
    setTitle: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    tags: string;
    setTags: (v: string) => void;
    visibility: 'private' | 'public' | 'unlisted';
    setVisibility: (v: 'private' | 'public' | 'unlisted') => void;
    scheduleDate: string;
    setScheduleDate: (v: string) => void;
    scheduleTime: string;
    setScheduleTime: (v: string) => void;
    thumbnailMode: 'none' | 'drive';
    setThumbnailMode: (v: 'none' | 'drive') => void;
    driveThumbnailPreview: string | null;
    channelGroups: ChannelGroup[];
    selectedGroup: string | null;
    setSelectedGroup: (v: string | null) => void;
    selectedChannels: string[];
    setSelectedChannels: (v: string[]) => void;
    channels: Array<{ id: string; name: string; thumbnail?: string }>;
    toggleChannel: (id: string) => void;
    handlePublishNow: () => Promise<void>;
    handleSchedule: () => Promise<void>;
    isPublishing: boolean;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
}

export const DriveImporterForm: React.FC<DriveImporterFormProps> = ({
    selectedFiles,
    title,
    setTitle,
    description,
    setDescription,
    tags,
    setTags,
    visibility,
    setVisibility,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    thumbnailMode,
    setThumbnailMode,
    driveThumbnailPreview,
    channelGroups,
    selectedGroup,
    setSelectedGroup,
    selectedChannels,
    setSelectedChannels,
    channels,
    toggleChannel,
    handlePublishNow,
    handleSchedule,
    isPublishing,
    selectedIds,
    setSelectedIds,
}) => {
    return (
        <div className={`bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 space-y-4 transition-all ${selectedFiles.length === 0 ? 'opacity-60' : ''}`}>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShieldCheck className="h-4 w-4 text-red-300" />
                    <span className="material-icons text-blue-400">cloud_download</span>
                    Upload compliance
                </div>
                <p className="mt-2 text-xs text-gray-300">
                    Privacy disponibile in fase di upload: `Private`, `Public`, `Unlisted`. Per le linee guida ufficiali vedi
                    {' '}
                    <a className="text-red-300 underline underline-offset-2 hover:text-red-200" href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noreferrer">Developer Policies</a>
                    {' '}
                    e
                    {' '}
                    <a className="text-red-300 underline underline-offset-2 hover:text-red-200" href="https://developers.google.com/youtube/terms/branding-guidelines" target="_blank" rel="noreferrer">Branding Guidelines</a>.
                </p>
            </div>

            {/* Selection Summary */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    {selectedFiles.length > 0 ? (
                        <>
                            <Check className="w-5 h-5 text-red-400" />
                            <span className="font-semibold text-text-primary">
                                {selectedFiles.length} video{selectedFiles.length !== 1 ? 's selected' : ' selected'}
                            </span>
                        </>
                    ) : (
                        <>
                            <FileVideo className="w-5 h-5 text-gray-400" />
                            <span className="font-semibold text-text-secondary">
                                No videos selected
                            </span>
                        </>
                    )}
                </div>
                {selectedFiles.length > 0 && (
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                        Clear selection
                    </button>
                )}
            </div>

            {selectedFiles.length === 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Select a video from the list above to fill in the metadata</span>
                </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Type className="w-4 h-4" />
                    Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Video title..."
                    disabled={selectedFiles.length === 0}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <FileText className="w-4 h-4" />
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video description..."
                    rows={3}
                    disabled={selectedFiles.length === 0}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Tag className="w-4 h-4" />
                    Tags (comma separated)
                </label>
                <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2, tag3..."
                    disabled={selectedFiles.length === 0}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">Privacy status</label>
                <div className="grid gap-3 md:grid-cols-3">
                    {([
                        { value: 'private', label: 'Private', helper: 'Visible only to the channel owner.' },
                        { value: 'public', label: 'Public', helper: 'Published and visible to everyone.' },
                        { value: 'unlisted', label: 'Unlisted', helper: 'Accessible only through a direct link.' },
                    ] as const).map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setVisibility(option.value)}
                            disabled={selectedFiles.length === 0}
                            className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                                visibility === option.value
                                    ? 'border-red-500 bg-red-500/15 text-white shadow-lg shadow-red-500/10'
                                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700/80'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <div className="font-semibold">{option.label}</div>
                            <div className="mt-1 text-xs text-gray-400">{option.helper}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Schedule Date/Time */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    Scheduling (optional)
                </label>
                <div className="flex gap-3">
                    <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        disabled={selectedFiles.length === 0}
                        className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        disabled={selectedFiles.length === 0}
                        className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            {/* Thumbnail - Drive only or none */}
            <div className="space-y-3 pt-2 border-t border-gray-700">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Image className="w-4 h-4" />
                    Thumbnail
                </label>

                <div className="flex gap-2">
                    <button
                        onClick={() => setThumbnailMode('none')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                            thumbnailMode === 'none'
                                ? 'bg-gray-700 text-white'
                                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        None
                    </button>
                    <button
                        onClick={() => setThumbnailMode('drive')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                            thumbnailMode === 'drive'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        From Drive
                    </button>
                </div>

                {thumbnailMode === 'drive' && (
                    <div className="space-y-3">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-gray-700">
                            {driveThumbnailPreview ? (
                                <img src={driveThumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Folder className="w-12 h-12 text-gray-600" />
                                </div>
                            )}
                        </div>
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-red-500/40 cursor-pointer transition-colors">
                            <Folder className="w-4 h-4" />
                            Select folder thumbnail
                        </button>
                        <p className="text-xs text-gray-500">The thumbnail will be searched in the Drive folder with the same name as the video</p>
                    </div>
                )}
            </div>

            {/* YouTube Channels Selection */}
            <div className="space-y-3 pt-2 border-t border-gray-700">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Globe className="w-4 h-4" />
                    YouTube channels ({selectedChannels.length} selected)
                </label>

                {/* Channel Groups Selection */}
                {channelGroups.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400">Group:</label>
                        <div className="flex flex-wrap gap-2">
                            {channelGroups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => {
                                        setSelectedGroup(group.id);
                                        setSelectedChannels(group.channels.map(ch => ch.id));
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        selectedGroup === group.id
                                            ? 'bg-red-500 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    {group.name} ({group.channels.length})
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Channels Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                    {channels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => toggleChannel(channel.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                selectedChannels.includes(channel.id)
                                    ? 'bg-red-500/15 border border-red-500/30'
                                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                                selectedChannels.includes(channel.id)
                                    ? 'bg-red-500 border-red-500'
                                    : 'border-gray-600'
                            }`}>
                                {selectedChannels.includes(channel.id) && (
                                    <Check className="w-3 h-3 text-white" />
                                )}
                            </div>
                            {channel.thumbnail ? (
                                <img src={channel.thumbnail} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                                    <Globe className="w-3 h-3 text-gray-400" />
                                </div>
                            )}
                            <span className="text-xs text-gray-300 truncate flex-1">{channel.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={handlePublishNow}
                    disabled={isPublishing || !title.trim() || selectedFiles.length === 0}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                    {isPublishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            Publish now
                        </>
                    )}
                </button>
                <button
                    onClick={handleSchedule}
                    disabled={isPublishing || !title.trim() || !scheduleDate || !scheduleTime || selectedFiles.length === 0}
                    className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isPublishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Calendar className="w-5 h-5" />
                            Schedule
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};