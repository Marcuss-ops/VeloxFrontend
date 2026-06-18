import React from 'react';

export interface SummaryEvent {
    id: string;
    type: 'task' | 'host_success' | 'host_failed' | 'play' | 'complete' | 'info' | 'progress';
    message: string;
    timestamp: Date;
}

export function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

// Animated dots component
export const AnimatedDots: React.FC = () => {
    return (
        <span className="inline-flex gap-0.5 ml-1">
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
    );
};

// Summary Event Line Component
export const SummaryEventLine: React.FC<{ event: SummaryEvent; isNew: boolean }> = ({ event, isNew }) => {
    const iconConfig: Record<string, { icon: string; color: string }> = {
        task: { icon: 'terminal', color: 'text-blue-400' },
        host_success: { icon: 'check_circle', color: 'text-emerald-400' },
        host_failed: { icon: 'error', color: 'text-red-400' },
        play: { icon: 'theaters', color: 'text-violet-400' },
        complete: { icon: 'verified', color: 'text-emerald-400' },
        info: { icon: 'info', color: 'text-slate-400' },
        progress: { icon: 'sync', color: 'text-amber-400' }
    };

    const config = iconConfig[event.type] || iconConfig.info;

    return (
        <div 
            className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all duration-300 ${
                isNew ? 'bg-white/5' : ''
            }`}
        >
            <span className={`material-symbols-rounded text-sm ${config.color} ${
                event.type === 'progress' ? 'animate-spin' : ''
            }`}>
                {config.icon}
            </span>
            <span className="text-xs text-slate-300 flex-1 truncate">{event.message}</span>
            <span className="text-[10px] text-slate-500">
                {event.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    );
};