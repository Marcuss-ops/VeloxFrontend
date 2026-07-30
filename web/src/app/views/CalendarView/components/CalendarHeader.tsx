/**
 * CalendarHeader Component
 *
 * Toolbar with month navigation, day range filter, and loading/error display.
 * Extracted from the original monolithic CalendarView.tsx.
 */

import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarHeaderProps {
    currentDate: Date;
    loading: boolean;
    error: string | null;
    eventsCount: number;
    dayRange: number | null;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onSetDayRange: (range: number | null) => void;
    onToday?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = memo(({
    currentDate,
    loading,
    error,
    eventsCount,
    dayRange,
    onPrevMonth,
    onNextMonth,
    onSetDayRange,
    onToday,
}) => {
    return (
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.03] backdrop-blur-xl">
            <div className="flex items-center gap-4">
                {/* Month Navigation */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-sm">
                    <button
                        onClick={onPrevMonth}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="text-xs font-semibold px-2 text-white/80 min-w-[100px] text-center">
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button
                        onClick={onNextMonth}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="size-3.5" />
                    </button>
                </div>

                {/* Day Range Filter Buttons */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-sm">
                    <button
                        onClick={() => onSetDayRange(7)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            dayRange === 7
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        7 giorni
                    </button>
                    <button
                        onClick={() => onSetDayRange(14)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            dayRange === 14
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        14 giorni
                    </button>
                    <button
                        onClick={() => onSetDayRange(28)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            dayRange === 28
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        28 giorni
                    </button>
                    <button
                        onClick={() => onSetDayRange(null)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            dayRange === null
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Tutto
                    </button>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-3 text-xs text-white/40">
                {loading && (
                    <span className="flex items-center gap-1.5">
                        <RefreshCw className="size-3 animate-spin" />
                        Loading...
                    </span>
                )}
                {error && (
                    <span className="text-red-400">{error}</span>
                )}
                <span>{eventsCount} projects scheduled</span>
            </div>
        </div>
    );
});

CalendarHeader.displayName = 'CalendarHeader';

export default CalendarHeader;