import React, { useState, useEffect, useCallback } from 'react';
import { 
    livestreamApi, 
    type Livestream, 
    type LivestreamConfig, 
    type LivestreamStatus
} from '../../lib/api';
import { StreamCard } from './StreamCard';
import { BeamsBackground } from '../ui/beams-background';
import { LivestreamConfigPanel } from './LivestreamConfigPanel';
import { LivestreamStatusPanel } from './LivestreamStatusPanel';

import type { StreamConfig, LoadingState, TabType } from './types';

const defaultConfig: StreamConfig = {
    name: '',
    platform: 'youtube',
    streamKey: '',
    streamUrl: '',
    description: '',
    isForKids: false,
    videoBitrate: 8000,
    audioBitrate: 128,
    streamType: 'video',
    videoOrder: 'loop',
    scheduleStart: false,
    scheduleEnd: false,
    protocol: 'rtmp',
    autoStart: false,
    autoStop: true,
};

export const YouTubeLivestreamApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('all_streams');
    const [streams, setStreams] = useState<Livestream[]>([]);
    const [selectedStream, setSelectedStream] = useState<Livestream | null>(null);
    const [config, setConfig] = useState<StreamConfig>(defaultConfig);
    const [loading, setLoading] = useState<LoadingState>({ isLoading: true });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Load streams from API
    const loadStreams = useCallback(async () => {
        setLoading({ isLoading: true });
        try {
            const result = await livestreamApi.list();
            setStreams(result.streams || []);
            setLoading({ isLoading: false });
        } catch (err) {
            console.error('Failed to load streams:', err);
            setLoading({ 
                isLoading: false, 
                error: err instanceof Error ? err.message : 'Failed to load streams' 
            });
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadStreams();
    }, [loadStreams]);

    // Auto-refresh streams every 10 seconds when viewing all streams
    useEffect(() => {
        if (activeTab !== 'all_streams') return;
        
        const interval = setInterval(loadStreams, 10000);
        return () => clearInterval(interval);
    }, [activeTab, loadStreams]);

    const handleCreateStream = () => {
        setActiveTab('stream_designer');
        setSelectedStream(null);
        setConfig(defaultConfig);
        setSaveError(null);
    };

    const handleEditStream = (stream: Livestream) => {
        setSelectedStream(stream);
        setConfig({
            name: stream.name,
            platform: stream.platform,
            streamKey: stream.stream_key,
            streamUrl: stream.stream_url,
            description: stream.description || '',
            isForKids: stream.is_for_kids,
            videoBitrate: stream.video_bitrate,
            audioBitrate: stream.audio_bitrate,
            streamType: 'video',
            videoOrder: stream.video_order,
            scheduleStart: !!stream.scheduled_start_time,
            scheduleEnd: !!stream.scheduled_end_time,
            protocol: stream.protocol,
            autoStart: stream.auto_start,
            autoStop: stream.auto_stop,
            scheduledStartTime: stream.scheduled_start_time,
            scheduledEndTime: stream.scheduled_end_time,
        });
        setActiveTab('stream_designer');
    };

    const handleSaveStream = async () => {
        if (!config.name || !config.streamKey || !config.streamUrl) {
            setSaveError('Please fill in all required fields: name, stream key, and stream URL');
            return;
        }

        setSaving(true);
        setSaveError(null);

        try {
            const apiConfig: LivestreamConfig = {
                name: config.name,
                platform: config.platform,
                stream_key: config.streamKey,
                stream_url: config.streamUrl,
                description: config.description,
                is_for_kids: config.isForKids,
                video_bitrate: config.videoBitrate,
                audio_bitrate: config.audioBitrate,
                stream_type: config.streamType,
                video_order: config.videoOrder,
                audio_order: 'loop',
                main_channel_volume: 70,
                secondary_channel_volume: 30,
                latency_preference: 'normal',
                protocol: config.protocol,
                auto_start: config.autoStart,
                auto_stop: config.autoStop,
                scheduled_start_time: config.scheduleStart ? config.scheduledStartTime : undefined,
                scheduled_end_time: config.scheduleEnd ? config.scheduledEndTime : undefined,
            };

            if (selectedStream) {
                await livestreamApi.update(selectedStream.id, apiConfig);
            } else {
                await livestreamApi.create(apiConfig);
            }

            await loadStreams();
            setActiveTab('all_streams');
        } catch (err) {
            console.error('Failed to save stream:', err);
            setSaveError(err instanceof Error ? err.message : 'Failed to save stream');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStream = useCallback(async (streamId: string) => {
        try {
            await livestreamApi.delete(streamId);
            setStreams(prev => prev.filter(s => s.id !== streamId));
        } catch (err) {
            console.error('Failed to delete stream:', err);
        }
    }, []);

    const handleStatusChange = useCallback((streamId: string, newStatus: LivestreamStatus) => {
        setStreams(prev => prev.map(s => 
            s.id === streamId ? { ...s, status: newStatus } : s
        ));
    }, []);

    const renderAllStreamsView = () => {
        if (loading.isLoading && streams.length === 0) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                        <span className="material-icons text-4xl text-primary animate-spin">sync</span>
                        <p className="text-text-secondary">Loading streams...</p>
                    </div>
                </div>
            );
        }

        if (loading.error && streams.length === 0) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="material-icons text-4xl text-red-500">error_outline</span>
                        <p className="text-red-400">{loading.error}</p>
                        <button 
                            onClick={loadStreams}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {/* New 24/7 Stream Card */}
                <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm flex flex-col h-full hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 bg-surface-hover dark:bg-surface-dark-lighter rounded-lg flex items-center justify-center mb-4">
                        <span className="material-icons text-text-secondary">add</span>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">New 24/7 stream</h3>
                    <p className="text-sm text-text-secondary mb-6 flex-1 leading-relaxed">
                        Every 24/7 stream is a server instance that you can manage and personalize from this dashboard.
                    </p>
                    <button
                        onClick={handleCreateStream}
                        className="w-full bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                    >
                        Create new 24/7 stream
                    </button>
                </div>

                {/* Backup Stream Card */}
                <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm flex flex-col h-full hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 bg-surface-hover dark:bg-surface-dark-lighter rounded-lg flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-text-secondary text-2xl">shield</span>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Backup stream</h3>
                    <p className="text-sm text-text-secondary mb-6 flex-1 leading-relaxed">
                        Backup streams serve as a fallback for your main stream, ensuring that your stream is always online.
                    </p>
                    <button
                        onClick={handleCreateStream}
                        className="w-full bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                    >
                        Add backup stream
                    </button>
                </div>

                {/* Stream Cards from API */}
                {streams.map(stream => (
                    <StreamCard
                        key={stream.id}
                        stream={stream}
                        onEdit={handleEditStream}
                        onDelete={handleDeleteStream}
                        onStatusChange={handleStatusChange}
                    />
                ))}
            </div>
        );
    };

    const renderStreamDesigner = () => (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <LivestreamConfigPanel
                config={config}
                selectedStream={selectedStream}
                saveError={saveError}
                saving={saving}
                onConfigChange={setConfig}
                onSave={handleSaveStream}
                onBack={() => setActiveTab('all_streams')}
                onDismissError={() => setSaveError(null)}
            />
            <LivestreamStatusPanel
                config={config}
                onConfigChange={setConfig}
            />
        </div>
    );

    return (
        <BeamsBackground className="h-full w-full" intensity="medium">
            <div className="h-full w-full flex flex-col">
                {/* Navigation Tabs - Centered */}
                <nav className="bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-sm border-b border-border dark:border-border-dark px-6 pt-4">
                <div className="flex items-center justify-center">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('all_streams')}
                            className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                                activeTab === 'all_streams'
                                    ? 'text-primary border-primary'
                                    : 'text-text-secondary hover:text-text-primary border-transparent'
                            }`}
                        >
                            <span className="material-icons text-base">grid_view</span>
                            All streams
                        </button>
                        <button
                            onClick={() => setActiveTab('stream_designer')}
                            className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                                activeTab === 'stream_designer'
                                    ? 'text-primary border-primary'
                                    : 'text-text-secondary hover:text-text-primary border-transparent'
                            }`}
                        >
                            <span className="material-icons text-base">add_circle</span>
                            Create Stream
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full overflow-auto">
                {activeTab === 'all_streams' && renderAllStreamsView()}
                {activeTab === 'stream_designer' && renderStreamDesigner()}
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

export default YouTubeLivestreamApp;
