/**
 * Calendar Modal - Clip Thumbnail Component
 *
 * Memoized clip thumbnail with hover preview and audio/text file support
 */

import React, { useEffect, useRef } from 'react';

interface VideoClip {
    id: string;
    name: string;
    driveId: string;
    thumbnail?: string;
    duration?: number;
    type: 'stock' | 'initial' | 'intermediate' | 'final';
    startTime?: string;
    endTime?: string;
}

interface ClipThumbnailProps {
    clip: VideoClip;
    onRemove: () => void;
    onHoverPreview?: (clip: VideoClip) => void;
    onCancelPreview?: () => void;
}

export const ClipThumbnail: React.FC<ClipThumbnailProps> = React.memo(
    ({ clip, onRemove, onHoverPreview, onCancelPreview }) => {
        const formatDuration = (ms?: number) => {
            if (!ms) return '';
            const seconds = Math.floor(ms / 1000);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const hoverTimerRef = useRef<number | null>(null);

        const handleMouseEnter = () => {
            if (onHoverPreview) {
                hoverTimerRef.current = window.setTimeout(() => {
                    onHoverPreview(clip);
                }, 1500);
            }
        };

        const handleMouseLeave = () => {
            if (hoverTimerRef.current) {
                window.clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
            }
            if (onCancelPreview) {
                onCancelPreview();
            }
        };

        useEffect(() => {
            return () => {
                if (hoverTimerRef.current) {
                    window.clearTimeout(hoverTimerRef.current);
                }
            };
        }, []);

        return (
            <div className="group relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <div className="aspect-video bg-white/5 rounded-lg overflow-hidden border border-white/10 group-hover:border-purple-500/50 transition-colors">
                    {clip.thumbnail ? (
                        <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/20 text-sm">video_file</span>
                        </div>
                    )}
                    {clip.duration && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[8px] text-white font-medium">
                            {formatDuration(clip.duration)}
                        </span>
                    )}
                </div>
                <p className="text-[9px] text-white/50 truncate mt-1">{clip.name}</p>
                <button
                    onClick={onRemove}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <span className="text-white text-[10px]">×</span>
                </button>
            </div>
        );
    }
);

ClipThumbnail.displayName = 'ClipThumbnail';

export type { VideoClip, ClipThumbnailProps };
export default ClipThumbnail;
