/**
 * Calendar Day Cell - Optimized Component
 * 
 * Uses memo and isolated props to prevent unnecessary re-renders.
 * Only re-renders when its specific day data changes.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { CalendarEvent } from '@/lib/api';

interface CalendarDayCellProps {
    day: number;
    events: CalendarEvent[];
    isToday: boolean;
    isDropTarget: boolean;
    isDragSource: boolean;
    hiddenBySearch: boolean;
    onDayClick: (day: number) => void;
    onEventClick: (event: CalendarEvent) => void;
    onDragStart: (e: React.DragEvent, event: CalendarEvent, day: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, day: number) => void;
}

// Memoized event item component
const EventItem = memo<{
    event: CalendarEvent;
    onEventClick: (event: CalendarEvent) => void;
    onDragStart: (e: React.DragEvent, event: CalendarEvent, day: number) => void;
    day: number;
}>(({ event, onEventClick, onDragStart, day }) => {
    // Memoize clip counts to avoid recalculating on every render
    const clipCounts = useMemo(() => ({
        stock: event.stockFootage?.length || 0,
        initial: event.initialClips?.length || 0,
        intermediate: event.intermediateClips?.length || 0,
        final: event.finalClips?.length || 0,
    }), [event.stockFootage, event.initialClips, event.intermediateClips, event.finalClips]);

    // Memoize clip badges rendering
    const clipBadges = useMemo(() => {
        const badges: React.ReactNode[] = [];

        if (clipCounts.stock > 0) {
            badges.push(
                <span key="stock" className="text-[8px] bg-blue-500/30 px-1 rounded">{clipCounts.stock}</span>
            );
        }
        if (clipCounts.initial > 0) {
            badges.push(
                <span key="initial" className="text-[8px] bg-green-500/30 px-1 rounded">{clipCounts.initial}</span>
            );
        }
        if (clipCounts.intermediate > 0) {
            badges.push(
                <span key="intermediate" className="text-[8px] bg-orange-500/30 px-1 rounded">{clipCounts.intermediate}</span>
            );
        }
        if (clipCounts.final > 0) {
            badges.push(
                <span key="final" className="text-[8px] bg-red-500/30 px-1 rounded">{clipCounts.final}</span>
            );
        }

        return badges;
    }, [clipCounts]);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, event, day)}
            className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-white text-[10px] font-medium p-2 rounded-lg border-l-2 border-purple-500 truncate cursor-pointer hover:from-purple-500/30 hover:to-violet-500/30 transition-colors"
            onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
            }}
        >
            <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-purple-400">video_file</span>
                <span className="truncate">{event.title}</span>
            </div>
            {clipBadges.length > 0 && (
                <div className="flex gap-1 mt-1">
                    {clipBadges}
                </div>
            )}
        </div>
    );
});

EventItem.displayName = 'EventItem';

export const CalendarDayCell = memo<CalendarDayCellProps>(({
    day,
    events,
    isToday,
    isDropTarget,
    isDragSource,
    hiddenBySearch,
    onDayClick,
    onEventClick,
    onDragStart,
    onDragOver,
    onDrop,
}) => {
    // Stable callbacks
    const handleDayClick = useCallback(() => {
        onDayClick(day);
    }, [onDayClick, day]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(e);
    }, [onDragOver]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        onDrop(e, day);
    }, [onDrop, day]);

    // Filter visible events
    const visibleEvents = hiddenBySearch ? [] : events;

    return (
        <div
            className={`
                p-3 relative group cursor-pointer border-r border-b border-white/5 min-h-[100px]
                transition-colors duration-150
                ${isDropTarget ? 'bg-purple-500/20 ring-1 ring-purple-500/50' : 'bg-transparent hover:bg-white/5'}
                ${isDragSource ? 'opacity-50' : ''}
            `}
            style={{
                // CSS containment: layout, paint, and style are isolated per cell
                // This prevents the browser from recalculating layout for the entire grid
                contain: 'layout style paint',
            }}
            onClick={handleDayClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <span className={`
                block text-right text-sm font-medium mb-2
                ${isToday ? 'text-purple-400 font-bold' : 'text-white/70'}
            `}>
                {day}
            </span>
            <div className="space-y-1">
                {visibleEvents.map(event => (
                    <EventItem
                        key={event.id}
                        event={event}
                        onEventClick={onEventClick}
                        onDragStart={onDragStart}
                        day={day}
                    />
                ))}
            </div>
        </div>
    );
});

CalendarDayCell.displayName = 'CalendarDayCell';

export default CalendarDayCell;