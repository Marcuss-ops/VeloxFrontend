/**
 * Calendar Toolbar Component
 * 
 * Isolated toolbar that doesn't re-render when calendar content changes.
 */

import React, { memo, useCallback } from 'react';

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
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
                {/* Month Navigation */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 backdrop-blur-sm">
                    <button 
                        onClick={onPrevMonth}
                        className="px-2 py-0.5 hover:bg-white/10 rounded text-white/60 transition-colors"
                        aria-label="Previous month"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                    </button>
                    <span className="text-xs font-semibold px-2 text-white/80">
                        {monthName} {year}
                    </span>
                    <button 
                        onClick={onNextMonth}
                        className="px-2 py-0.5 hover:bg-white/10 rounded text-white/60 transition-colors"
                        aria-label="Next month"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                    </button>
                </div>

                {/* Today Button */}
                <button 
                    onClick={onToday}
                    className="text-xs font-medium text-white/60 hover:text-white border border-white/10 px-3 py-1 bg-white/5 rounded-lg backdrop-blur-sm transition-colors"
                >
                    Today
                </button>
                
                {/* Search Input */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-sm">search</span>
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="bg-white/5 border border-white/10 rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 w-48"
                    />
                    {(searchQuery || hasActiveSearch) && (
                        <button
                            onClick={onClearSearch}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                            aria-label="Clear search"
                        >
                            <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 text-xs text-white/40">
                {loading && (
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Loading...
                    </span>
                )}
                {isSearching && (
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">search</span>
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