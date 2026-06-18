import React from 'react';
import type { StreamConfig } from './YouTubeLivestreamApp';

interface LivestreamStatusPanelProps {
    config: StreamConfig;
    onConfigChange: (config: StreamConfig) => void;
}

export const LivestreamStatusPanel: React.FC<LivestreamStatusPanelProps> = ({
    config,
    onConfigChange,
}) => {
    const setConfig = onConfigChange;

    return (
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-5 shadow-sm h-full">
                {/* Video Order */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Video Order</h3>
                    <div className="grid grid-cols-2 gap-1 bg-surface-hover dark:bg-surface-dark-lighter p-1 rounded-lg">
                        <button
                            onClick={() => setConfig({ ...config, videoOrder: 'loop' })}
                            className={`py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                                config.videoOrder === 'loop'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-text-secondary hover:bg-surface-active dark:hover:bg-gray-700'
                            }`}
                        >
                            Loop videos
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, videoOrder: 'shuffle' })}
                            className={`py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                                config.videoOrder === 'shuffle'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-text-secondary hover:bg-surface-active dark:hover:bg-gray-700'
                            }`}
                        >
                            Shuffle
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-text-secondary leading-relaxed">
                        Shuffle will play a random video file from the list.<br/>
                        Loop will play the video files in the order they are listed.
                    </p>
                </div>

                {/* Ingest Settings */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Upstream Settings</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-text-secondary mb-1.5">Protocol</label>
                            <div className="grid grid-cols-2 gap-1 bg-surface-hover dark:bg-surface-dark-lighter p-1 rounded-lg">
                                <button
                                    onClick={() => setConfig({ ...config, protocol: 'rtmp' })}
                                    className={`py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                                        config.protocol === 'rtmp'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    RTMP
                                </button>
                                <button
                                    onClick={() => setConfig({ ...config, protocol: 'hls' })}
                                    className={`py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                                        config.protocol === 'hls'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    HLS
                                </button>
                            </div>
                        </div>
                        <label className="flex items-center gap-3 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                            <input
                                className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary bg-surface-hover dark:bg-surface-dark-lighter"
                                type="checkbox"
                                checked={config.autoStart}
                                onChange={(e) => setConfig({ ...config, autoStart: e.target.checked })}
                            />
                            Auto-start when encoder connects
                        </label>
                        <label className="flex items-center gap-3 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                            <input
                                className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary bg-surface-hover dark:bg-surface-dark-lighter"
                                type="checkbox"
                                checked={config.autoStop}
                                onChange={(e) => setConfig({ ...config, autoStop: e.target.checked })}
                            />
                            Auto-stop when encoder disconnects
                        </label>
                    </div>
                </div>

                {/* Schedule */}
                <div>
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Schedule Livestream</h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                            <input
                                className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary bg-surface-hover dark:bg-surface-dark-lighter"
                                type="checkbox"
                                checked={config.scheduleStart}
                                onChange={(e) => setConfig({ ...config, scheduleStart: e.target.checked })}
                            />
                            Schedule start time
                        </label>
                        {config.scheduleStart && (
                            <input
                                type="datetime-local"
                                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary"
                                value={config.scheduledStartTime || ''}
                                onChange={(e) => setConfig({ ...config, scheduledStartTime: e.target.value })}
                            />
                        )}
                        <label className="flex items-center gap-3 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                            <input
                                className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary bg-surface-hover dark:bg-surface-dark-lighter"
                                type="checkbox"
                                checked={config.scheduleEnd}
                                onChange={(e) => setConfig({ ...config, scheduleEnd: e.target.checked })}
                            />
                            Schedule end time
                        </label>
                        {config.scheduleEnd && (
                            <input
                                type="datetime-local"
                                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary"
                                value={config.scheduledEndTime || ''}
                                onChange={(e) => setConfig({ ...config, scheduledEndTime: e.target.value })}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LivestreamStatusPanel;