/**
 * CalendarGrid Component
 *
 * Day grid with inline memoized CalendarDayCell.
 * Extracted from the original monolithic CalendarView.tsx.
 */

import React, { memo } from 'react';
import { CalendarEvent } from '@/lib/api';

// --- Memoized Day Cell Component ---
interface CalendarDayCellProps {
    day: number;
    events: CalendarEvent[];
    isToday: boolean;
    onDayClick: (day: number) => void;
    onEventClick: (event: CalendarEvent) => void;
    onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, day: number) => void;
}

const CalendarDayCell = memo<CalendarDayCellProps>(({
    day,
    events,
    isToday,
    onDayClick,
    onEventClick,
    onDragStart,
    onDragOver,
    onDrop,
}) => {
    return (
        <div
            className="p-3 relative group cursor-pointer border-r border-b border-white/5 min-h-[100px] will-change-transform bg-transparent hover:bg-white/5"
            onClick={() => onDayClick(day)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, day)}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '140px' }}
        >
            <span className={`block text-right text-sm font-medium mb-2
                ${isToday
                    ? 'text-purple-400 font-bold'
                    : 'text-white/70'
                }`}
            >
                {day}
            </span>
            <div className="space-y-1">
                {events.map(event => (
                    <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, event)}
                        className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-white text-[10px] font-medium p-2 rounded-lg border-l-2 border-purple-500 truncate cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                        }}
                    >
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-purple-400">video_file</span>
                            <span className="truncate">{event.title}</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                            {event.stockFootage.length > 0 && (
                                <span className="text-[8px] bg-blue-500/30 px-1 rounded">{event.stockFootage.length}</span>
                            )}
                            {event.initialClips.length > 0 && (
                                <span className="text-[8px] bg-green-500/30 px-1 rounded">{event.initialClips.length}</span>
                            )}
                            {event.intermediateClips.length > 0 && (
                                <span className="text-[8px] bg-orange-500/30 px-1 rounded">{event.intermediateClips.length}</span>
                            )}
                            {event.finalClips.length > 0 && (
                                <span className="text-[8px] bg-red-500/30 px-1 rounded">{event.finalClips.length}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

CalendarDayCell.displayName = 'CalendarDayCell';

// --- Grid Component ---
interface CalendarGridProps {
    visibleDays: number[];
    getEventsForDay: (day: number) => CalendarEvent[];
    isToday: (day: number | null) => boolean;
    onDayClick: (day: number) => void;
    onEventClick: (event: CalendarEvent) => void;
    onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, day: number) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = memo(({
    visibleDays,
    getEventsForDay,
    isToday,
    onDayClick,
    onEventClick,
    onDragStart,
    onDragOver,
    onDrop,
}) => {
    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="h-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Days Grid - 4 columns, simple day numbers */}
                <div className="grid grid-cols-4 gap-px bg-white/5" style={{ gridAutoRows: 'minmax(140px, 1fr)' }}>
                    {visibleDays.map(day => (
                        <CalendarDayCell
                            key={`day-${day}`}
                            day={day}
                            events={getEventsForDay(day)}
                            isToday={isToday(day)}
                            onDayClick={onDayClick}
                            onEventClick={onEventClick}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});

CalendarGrid.displayName = 'CalendarGrid';

export default CalendarGrid;