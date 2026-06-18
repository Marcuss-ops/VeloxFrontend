import React from 'react';
import type { 
    LivestreamStatus as StreamStatus, 
    LivestreamHealthStatus as HealthStatus, 
    LivestreamHealth as StreamHealth 
} from '../../lib/api';

// ===========================================
// Health Status Indicator Component
// ===========================================

interface HealthIndicatorProps {
    health?: StreamHealth;
    compact?: boolean;
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({ health, compact = false }) => {
    if (!health) {
        return (
            <div className="flex items-center gap-2 text-text-muted">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                <span className="text-xs">No health data</span>
            </div>
        );
    }

    const getStatusConfig = (status: HealthStatus) => {
        switch (status) {
            case 'good':
                return {
                    color: 'bg-green-500',
                    bgColor: 'bg-green-500/10',
                    textColor: 'text-green-400',
                    borderColor: 'border-green-500/30',
                    icon: 'check_circle',
                    label: 'Excellent'
                };
            case 'ok':
                return {
                    color: 'bg-yellow-500',
                    bgColor: 'bg-yellow-500/10',
                    textColor: 'text-yellow-400',
                    borderColor: 'border-yellow-500/30',
                    icon: 'warning',
                    label: 'Good'
                };
            case 'bad':
                return {
                    color: 'bg-orange-500',
                    bgColor: 'bg-orange-500/10',
                    textColor: 'text-orange-400',
                    borderColor: 'border-orange-500/30',
                    icon: 'error',
                    label: 'Poor'
                };
            case 'error':
                return {
                    color: 'bg-red-500',
                    bgColor: 'bg-red-500/10',
                    textColor: 'text-red-400',
                    borderColor: 'border-red-500/30',
                    icon: 'cancel',
                    label: 'Error'
                };
        }
    };

    const config = getStatusConfig(health.status);

    if (compact) {
        return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${config.bgColor} border ${config.borderColor}`}>
                <span className={`w-2 h-2 rounded-full ${config.color} animate-pulse`}></span>
                <span className={`material-icons text-sm ${config.textColor}`}>{config.icon}</span>
            </div>
        );
    }

    return (
        <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-3">
                <span className={`w-3 h-3 rounded-full ${config.color} animate-pulse`}></span>
                <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <span className="text-text-muted">Bitrate</span>
                    <div className="text-text-primary font-medium">{health.bitrate} kbps</div>
                </div>
                <div>
                    <span className="text-text-muted">Frame Rate</span>
                    <div className="text-text-primary font-medium">{health.framerate} fps</div>
                </div>
                <div>
                    <span className="text-text-muted">Resolution</span>
                    <div className="text-text-primary font-medium">{health.resolution}</div>
                </div>
                {health.packets_lost !== undefined && (
                    <div>
                        <span className="text-text-muted">Packets Lost</span>
                        <div className={health.packets_lost > 0 ? 'text-red-400 font-medium' : 'text-text-primary font-medium'}>
                            {health.packets_lost}
                        </div>
                    </div>
                )}
            </div>

            {health.message && (
                <div className="mt-3 pt-3 border-t border-border-dark text-xs text-text-secondary">
                    {health.message}
                </div>
            )}
        </div>
    );
};

// ===========================================
// Lifecycle Controls Component
// ===========================================

interface LifecycleControlsProps {
    streamId: string;
    status: StreamStatus;
    onTransition: (action: 'testing' | 'live' | 'complete') => Promise<void>;
    disabled?: boolean;
}

export const LifecycleControls: React.FC<LifecycleControlsProps> = ({
    streamId: _streamId,
    status,
    onTransition,
    disabled = false
}) => {
    const [isLoading, setIsLoading] = React.useState<string | null>(null);

    const handleAction = async (action: 'testing' | 'live' | 'complete') => {
        setIsLoading(action);
        try {
            await onTransition(action);
        } finally {
            setIsLoading(null);
        }
    };

    // Status descriptions for user guidance
    const statusInfo: Record<StreamStatus, { label: string; description: string; color: string }> = {
        created: {
            label: 'Created',
            description: 'Stream is configured but not started',
            color: 'text-gray-400'
        },
        testing: {
            label: 'Testing',
            description: 'Preview mode - only you can see the stream',
            color: 'text-yellow-400'
        },
        live: {
            label: 'Live',
            description: 'Stream is publicly visible',
            color: 'text-green-400'
        },
        complete: {
            label: 'Complete',
            description: 'Stream has ended',
            color: 'text-blue-400'
        },
        revoked: {
            label: 'Revoked',
            description: 'Stream was cancelled',
            color: 'text-red-400'
        }
    };

    const currentStatus = statusInfo[status];

    return (
        <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg p-4">
            {/* Current Status */}
            <div className="mb-4 pb-4 border-b border-border dark:border-border-dark">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${currentStatus.color}`}>
                        {status === 'live' && (
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                LIVE
                            </span>
                        )}
                        {status === 'testing' && (
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                TESTING
                            </span>
                        )}
                        {status !== 'live' && status !== 'testing' && currentStatus.label}
                    </span>
                </div>
                <p className="text-xs text-text-muted">{currentStatus.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
                {/* Created -> Testing */}
                {status === 'created' && (
                    <button
                        onClick={() => handleAction('testing')}
                        disabled={disabled || isLoading !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {isLoading === 'testing' ? (
                            <span className="material-icons animate-spin text-sm">sync</span>
                        ) : (
                            <span className="material-icons text-sm">preview</span>
                        )}
                        Start Testing (Preview)
                    </button>
                )}

                {/* Testing -> Live */}
                {status === 'testing' && (
                    <>
                        <button
                            onClick={() => handleAction('live')}
                            disabled={disabled || isLoading !== null}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {isLoading === 'live' ? (
                                <span className="material-icons animate-spin text-sm">sync</span>
                            ) : (
                                <span className="material-icons text-sm">sensors</span>
                            )}
                            Go Live
                        </button>
                        <button
                            onClick={() => handleAction('complete')}
                            disabled={disabled || isLoading !== null}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {isLoading === 'complete' ? (
                                <span className="material-icons animate-spin text-sm">sync</span>
                            ) : (
                                <span className="material-icons text-sm">stop</span>
                            )}
                            End Preview
                        </button>
                    </>
                )}

                {/* Live -> Complete */}
                {status === 'live' && (
                    <button
                        onClick={() => handleAction('complete')}
                        disabled={disabled || isLoading !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {isLoading === 'complete' ? (
                            <span className="material-icons animate-spin text-sm">sync</span>
                        ) : (
                            <span className="material-icons text-sm">stop_circle</span>
                        )}
                        End Stream
                    </button>
                )}

                {/* Complete/Revoked -> Testing (restart) */}
                {(status === 'complete' || status === 'revoked') && (
                    <button
                        onClick={() => handleAction('testing')}
                        disabled={disabled || isLoading !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {isLoading === 'testing' ? (
                            <span className="material-icons animate-spin text-sm">sync</span>
                        ) : (
                            <span className="material-icons text-sm">replay</span>
                        )}
                        Restart Stream
                    </button>
                )}
            </div>

            {/* Help Text */}
            <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
                <p className="text-[10px] text-text-muted leading-relaxed">
                    {status === 'created' && 
                        'Testing mode lets you preview the stream before going public. Only you can see it.'}
                    {status === 'testing' && 
                        'You are in preview mode. Click "Go Live" when ready to make the stream public.'}
                    {status === 'live' && 
                        'Your stream is live! Click "End Stream" to stop broadcasting.'}
                    {(status === 'complete' || status === 'revoked') && 
                        'This stream has ended. You can restart it or create a new one.'}
                </p>
            </div>
        </div>
    );
};

// ===========================================
// Stream Status Badge Component
// ===========================================

interface StreamStatusBadgeProps {
    status: StreamStatus;
    showLabel?: boolean;
}

export const StreamStatusBadge: React.FC<StreamStatusBadgeProps> = ({ status, showLabel = true }) => {
    const config = {
        created: { color: 'bg-gray-500', textColor: 'text-gray-300', label: 'Created', icon: 'radio_button_unchecked' },
        testing: { color: 'bg-yellow-500', textColor: 'text-yellow-300', label: 'Testing', icon: 'preview' },
        live: { color: 'bg-purple-600', textColor: 'text-purple-300', label: 'Live', icon: 'sensors' },
        complete: { color: 'bg-blue-500', textColor: 'text-blue-300', label: 'Complete', icon: 'check_circle' },
        revoked: { color: 'bg-red-700', textColor: 'text-red-400', label: 'Revoked', icon: 'cancel' }
    }[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${config.color}/20 border border-${config.color}/30`}>
            {status === 'live' && <span className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`}></span>}
            <span className={`material-icons text-xs ${config.textColor}`}>{config.icon}</span>
            {showLabel && <span className={`text-[10px] font-bold uppercase tracking-wider ${config.textColor}`}>{config.label}</span>}
        </span>
    );
};

// ===========================================
// Stream Statistics Component
// ===========================================

interface StreamStatsProps {
    viewers: number;
    duration: number; // in seconds
    maxViewers?: number;
    startTime?: string;
}

export const StreamStats: React.FC<StreamStatsProps> = ({ viewers, duration, maxViewers, startTime: _startTime }) => {
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-hover dark:bg-surface-dark-lighter rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{viewers.toLocaleString()}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Viewers</div>
            </div>
            <div className="bg-surface-hover dark:bg-surface-dark-lighter rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-text-primary font-mono">{formatDuration(duration)}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Duration</div>
            </div>
            {maxViewers !== undefined && (
                <div className="bg-surface-hover dark:bg-surface-dark-lighter rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-text-primary">{maxViewers.toLocaleString()}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Peak</div>
                </div>
            )}
        </div>
    );
};

export default {
    HealthIndicator,
    LifecycleControls,
    StreamStatusBadge,
    StreamStats
};