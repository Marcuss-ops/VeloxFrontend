/**
 * Drag Ghost Component
 * 
 * A lightweight overlay that follows the cursor during drag.
 * The grid stays static - only this ghost moves.
 */

import React, { memo } from 'react';
import { CalendarEvent } from '@/lib/api';

interface DragGhostProps {
    event: CalendarEvent | null;
    position: { x: number; y: number } | null;
    isVisible: boolean;
}

export const DragGhost = memo<DragGhostProps>(({ event, position, isVisible }) => {
    if (!isVisible || !event || !position) {
        return null;
    }

    return (
        <div
            className="fixed pointer-events-none z-50"
            style={{
                left: position.x - 80,
                top: position.y - 20,
                transform: 'scale(1.05)',
                opacity: 0.9,
                // GPU acceleration for smooth drag
                willChange: 'transform, opacity',
            }}
        >
            <div className="bg-gradient-to-r from-purple-500/40 to-violet-500/40 text-white text-[10px] font-medium p-2 rounded-lg border-l-2 border-purple-400 shadow-lg shadow-purple-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-purple-300">video_file</span>
                    <span className="truncate max-w-[120px]">{event.title}</span>
                </div>
                <div className="flex gap-1 mt-1">
                    {event.stockFootage && event.stockFootage.length > 0 && (
                        <span className="text-[8px] bg-blue-500/40 px-1 rounded">{event.stockFootage.length}</span>
                    )}
                    {event.initialClips && event.initialClips.length > 0 && (
                        <span className="text-[8px] bg-green-500/40 px-1 rounded">{event.initialClips.length}</span>
                    )}
                    {event.intermediateClips && event.intermediateClips.length > 0 && (
                        <span className="text-[8px] bg-orange-500/40 px-1 rounded">{event.intermediateClips.length}</span>
                    )}
                    {event.finalClips && event.finalClips.length > 0 && (
                        <span className="text-[8px] bg-red-500/40 px-1 rounded">{event.finalClips.length}</span>
                    )}
                </div>
            </div>
        </div>
    );
});

DragGhost.displayName = 'DragGhost';

export default DragGhost;