import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { DriveImporter } from './DriveImporter/DriveImporter';
import { BeamsBackground } from '../ui/beams-background';
import { YouTubeBrandMark } from '../ui/YouTubeBrandMark';
import type { DriveFile } from '@/lib/api';

// ============================================
// Types
// ============================================

interface VideoConfig {
    id: string;
    name: string;
    size?: number;
    thumbnail?: string;
    duration?: number;
    driveId: string;
    // Metadata
    channelId: string;
    title: string;
    description: string;
    tags: string[];
    // Settings
    visibility: 'private' | 'public';
    scheduledAt?: Date | null;
    // Thumbnail
    thumbnailFile?: File;
    thumbnailPreview?: string;
    // Upload state
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
    uploadProgress: number;
    error?: string;
}


// ============================================
// Utility Functions
// ============================================

const formatDuration = (millis: number): string => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
};

// ============================================
// Main Component
// ============================================

export const YouTubeUploadApp: React.FC = () => {
    // State
    const [videoConfigs, setVideoConfigs] = useState<VideoConfig[]>([]);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const videoConfigsRef = useRef<VideoConfig[]>([]);
    useEffect(() => {
        videoConfigsRef.current = videoConfigs;
    }, [videoConfigs]);


    // Handle file selection from DriveImporter
    const handleFilesSelected = useCallback((files: DriveFile[]) => {
        const configs: VideoConfig[] = files.map(f => ({
            id: `config_${f.id}`,
            name: f.name,
            size: f.size,
            thumbnail: f.thumbnailLink,
            duration: f.videoMediaMetadata?.durationMillis,
            driveId: f.id,
            channelId: '',
            title: f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            description: '',
            tags: [],
            visibility: 'private',
            scheduledAt: null,
            status: 'pending',
            uploadProgress: 0,
        }));
        setVideoConfigs(prev => [...prev, ...configs]);
        if (configs.length > 0 && !activeConfigId) {
            setActiveConfigId(configs[0].id);
        }
    }, [activeConfigId]);

    const removeConfig = (id: string) => {
        setVideoConfigs(prev => prev.filter(c => c.id !== id));
        if (activeConfigId === id) {
            setActiveConfigId(videoConfigs.find(c => c.id !== id)?.id || null);
        }
    };

    const activeConfig = videoConfigs.find(c => c.id === activeConfigId);

    // Render main upload view
    const renderMainView = () => (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Main Configuration Panel */}
            <div className="space-y-6">
                {/* Error Alert */}
                {saveError && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                        <span className="material-icons text-red-400">error</span>
                        <div className="flex-1">
                            <p className="text-red-300 text-sm">{saveError}</p>
                        </div>
                        <button 
                            onClick={() => setSaveError(null)}
                            className="text-red-400 hover:text-red-300"
                        >
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                )}

                {/* Video Library Section - Like Livestream */}
                <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="material-icons text-primary">cloud_upload</span>
                        Video Library
                    </h3>
                    
                    <DriveImporter onFilesSelected={handleFilesSelected} />

                    {/* Selected Videos List */}
                    {videoConfigs.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h3 className="text-sm font-medium text-text-secondary">Video selezionati ({videoConfigs.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {videoConfigs.map(config => (
                                    <div 
                                        key={config.id}
                                        onClick={() => setActiveConfigId(config.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                            activeConfigId === config.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border dark:border-border-dark hover:border-primary/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {config.thumbnail ? (
                                                <img src={config.thumbnail} alt="" className="w-16 h-10 object-cover rounded" />
                                            ) : (
                                                <div className="w-16 h-10 bg-surface-hover rounded flex items-center justify-center">
                                                    <span className="material-icons text-text-secondary text-sm">video_file</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text-primary truncate">{config.title || config.name}</p>
                                                <p className="text-xs text-text-secondary">
                                                    {formatFileSize(config.size)}
                                                    {config.duration && ` • ${formatDuration(config.duration)}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeConfig(config.id); }}
                                                className="p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400"
                                            >
                                                <span className="material-icons text-sm">close</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Upload Progress */}
                {activeConfig && (activeConfig.status === 'uploading' || activeConfig.status === 'processing') && (
                    <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-text-primary flex items-center gap-2">
                                <span className="material-icons text-primary animate-spin">sync</span>
                                Caricamento in corso...
                            </span>
                            <span className="text-sm font-mono text-text-secondary">{activeConfig.uploadProgress}%</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${activeConfig.uploadProgress}%` }}
                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                            />
                        </div>
                    </div>
                )}

                {/* Completed Status */}
                {activeConfig && activeConfig.status === 'completed' && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                        <span className="material-icons text-green-400">check_circle</span>
                        <div>
                            <p className="text-green-300 font-medium">Video caricato con successo!</p>
                            {activeConfig.error && (
                                <p className="text-xs text-green-400/60 mt-1">{activeConfig.error}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Status */}
                {activeConfig && activeConfig.status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <span className="material-icons text-red-400">error</span>
                        <p className="text-red-300 text-sm">{activeConfig.error}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <BeamsBackground className="h-full w-full" intensity="medium">
            <div className="h-full w-full flex flex-col">
                {/* Main Content */}
                <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full overflow-auto">
                    {renderMainView()}
                </main>

                {/* Floating Chat Button */}
                <div className="fixed bottom-6 right-6 z-50">
                    <button className="bg-primary hover:bg-primary/80 text-white w-12 h-12 rounded-full shadow-lg shadow-primary/40 flex items-center justify-center transition-transform hover:scale-110">
                        <span className="material-icons">chat_bubble</span>
                    </button>
                </div>
            </div>
        </BeamsBackground>
    );
};

export default YouTubeUploadApp;
