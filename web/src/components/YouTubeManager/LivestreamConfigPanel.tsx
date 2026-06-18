import React from 'react';
import { DriveImporter } from './DriveImporter/DriveImporter';
import type { Livestream } from '../../lib/api';
import type { StreamConfig } from './YouTubeLivestreamApp';

interface LivestreamConfigPanelProps {
    config: StreamConfig;
    selectedStream: Livestream | null;
    saveError: string | null;
    saving: boolean;
    onConfigChange: (config: StreamConfig) => void;
    onSave: () => void;
    onBack: () => void;
    onDismissError: () => void;
}

export const LivestreamConfigPanel: React.FC<LivestreamConfigPanelProps> = ({
    config,
    selectedStream,
    saveError,
    saving,
    onConfigChange,
    onSave,
    onBack,
    onDismissError,
}) => {
    const setConfig = onConfigChange;

    return (
        <div className="lg:col-span-8 space-y-6">
            {/* Error Alert */}
            {saveError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <span className="material-icons text-red-400">error</span>
                    <div className="flex-1">
                        <p className="text-red-300 text-sm">{saveError}</p>
                    </div>
                    <button
                        onClick={onDismissError}
                        className="text-red-400 hover:text-red-300"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>
            )}

            <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-text-primary">
                        {selectedStream ? 'Edit Stream' : 'New Stream Configuration'}
                    </h2>
                    <button
                        onClick={onBack}
                        className="text-sm text-text-secondary hover:text-primary flex items-center gap-1"
                    >
                        <span className="material-icons text-sm">arrow_back</span> Back to all streams
                    </button>
                </div>

                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">
                            Stream name <span className="text-red-400">*</span>
                        </label>
                        <input
                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-500"
                            placeholder="My Awesome Stream"
                            type="text"
                            value={config.name}
                            onChange={(e) => setConfig({ ...config, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">
                            Stream key <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-500"
                                type="password"
                                value={config.streamKey}
                                onChange={(e) => setConfig({ ...config, streamKey: e.target.value })}
                                placeholder="••••••••••••••••"
                            />
                            <span className="material-icons absolute right-3 top-3 text-gray-500 cursor-pointer text-lg">visibility_off</span>
                        </div>
                        <a className="text-xs text-gray-500 underline hover:text-primary block mt-1" href="#">Where do I find my stream key?</a>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">
                            Stream url <span className="text-red-400">*</span>
                        </label>
                        <input
                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-500"
                            placeholder="rtmp://a.rtmp.youtube.com/live2"
                            type="text"
                            value={config.streamUrl}
                            onChange={(e) => setConfig({ ...config, streamUrl: e.target.value })}
                        />
                        <a className="text-xs text-gray-500 underline hover:text-primary block mt-1" href="#">Where do I find my stream url?</a>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Platform</label>
                        <select
                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            value={config.platform}
                            onChange={(e) => setConfig({ ...config, platform: e.target.value as StreamConfig['platform'] })}
                        >
                            <option value="youtube">YouTube</option>
                            <option value="twitch">Twitch</option>
                            <option value="facebook">Facebook</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-6 pt-4 border-t border-border dark:border-border-dark">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Description</label>
                        <textarea
                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-500 h-32 resize-none"
                            placeholder="Description of your stream"
                            value={config.description}
                            onChange={(e) => setConfig({ ...config, description: e.target.value })}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-text-primary">Audience</label>
                        <div className="space-y-3 pl-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        className="peer sr-only"
                                        name="audience_type"
                                        type="radio"
                                        checked={config.isForKids}
                                        onChange={() => setConfig({ ...config, isForKids: true })}
                                    />
                                    <div className="w-5 h-5 border-2 border-border dark:border-border-dark rounded-full peer-checked:border-primary peer-checked:border-[6px] transition-all bg-white dark:bg-surface-dark-lighter"></div>
                                </div>
                                <span className="text-sm text-text-primary group-hover:text-primary transition-colors">Yes, this stream is made for kids</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        className="peer sr-only"
                                        name="audience_type"
                                        type="radio"
                                        checked={!config.isForKids}
                                        onChange={() => setConfig({ ...config, isForKids: false })}
                                    />
                                    <div className="w-5 h-5 border-2 border-border dark:border-border-dark rounded-full peer-checked:border-primary peer-checked:border-[6px] transition-all bg-white dark:bg-surface-dark-lighter"></div>
                                </div>
                                <span className="text-sm text-text-primary group-hover:text-primary transition-colors">No, this stream is not made for kids</span>
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-primary">Video bitrate (kbps)</label>
                            <input
                                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-500"
                                type="number"
                                value={config.videoBitrate}
                                onChange={(e) => setConfig({ ...config, videoBitrate: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-primary">Audio bitrate (kbps)</label>
                            <input
                                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-500"
                                type="number"
                                value={config.audioBitrate}
                                onChange={(e) => setConfig({ ...config, audioBitrate: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Library Section */}
            <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-icons text-violet-500">video_library</span>
                    VideoYoutube
                </h3>
                <DriveImporter
                    mode="multiple"
                    onSelectionChange={(selectedItems) => {
                        console.log('Selected videos:', selectedItems);
                    }}
                />
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={onBack}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <span className="material-icons text-sm animate-spin">sync</span>
                            Saving...
                        </>
                    ) : (
                        <>
                            <span className="material-icons text-sm">save</span>
                            {selectedStream ? 'Save Changes' : 'Create Stream'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LivestreamConfigPanel;