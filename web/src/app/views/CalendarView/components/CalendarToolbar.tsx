/**
 * Calendar Toolbar Component
 * 
 * Isolated toolbar that doesn't re-render when calendar content changes.
 */

import React, { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, X, RefreshCw, Loader2 } from 'lucide-react';

interface CalendarToolbarProps {
    monthName: string;
    year: number;
    loading: boolean;
    error: string | null;
    eventsCount: number;
    searchQuery: string;
    hasActiveSearch: boolean;
    isSearching: boolean;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
}

export const CalendarToolbar = memo<CalendarToolbarProps>(({
    monthName,
    year,
    loading,
    error,
    eventsCount,
    searchQuery,
    hasActiveSearch,
    isSearching,
    onPrevMonth,
    onNextMonth,
    onToday,
    onSearchChange,
    onClearSearch,
}) => {
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
    }, [onSearchChange]);

    return (
        <div className="h-12 border-b border flex items-center justify-between px-6 bg-white/[0.03] backdrop-blur-xl">
            <div className="flex items-center gap-4">
                {/* Month Navigation */}
                <div className="flex items-center gap-1 bg-white/5 border border rounded-xl p-1 backdrop-blur-sm">
                    <button 
                        onClick={onPrevMonth}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="text-xs font-semibold px-2 text-white/80 min-w-[100px] text-center">
                        {monthName} {year}
                    </span>
                    <button 
                        onClick={onNextMonth}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="size-3.5" />
                    </button>
                </div>

                {/* Today Button */}
                <button 
                    onClick={onToday}
                    className="text-xs font-medium text-white/60 hover:text-white border border px-3 py-1 bg-white/5 rounded-xl backdrop-blur-sm transition-colors"
                >
                    Today
                </button>
                
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="bg-white/5 border border rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 w-48 transition-all"
                    />
                    {(searchQuery || hasActiveSearch) && (
                        <button
                            onClick={onClearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 text-xs text-white/40">
                {loading && (
                    <span className="flex items-center gap-1.5">
                        <RefreshCw className="size-3 animate-spin" />
                        Loading...
                    </span>
                )}
                {isSearching && (
                    <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" />
                        Searching...
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

CalendarToolbar.displayName = 'CalendarToolbar';

export default CalendarToolbar;