/**
 * Calendar Events State - Separated State Store
 *
 * Manages events data, loading from API, and CRUD operations
 * Completely isolated from view state
 *
 * Optimizations:
 * 1. Preload next/prev month data in background
 * 2. Cached events by range - no refetch if already loaded
 * 3. Incremental updates without full reload
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { calendarApi, CalendarEvent } from '@/lib/api';

export interface CalendarEventsState {
    events: CalendarEvent[];
    loading: boolean;
    preloadLoading: boolean;
    error: string | null;
}

export interface CalendarEventsActions {
    loadEvents: (prevMonth: number, prevYear: number, nextMonth: number, nextYear: number) => Promise<void>;
    preloadAdjacentMonth: (month: number, year: number) => Promise<void>;
    addEvent: (event: CalendarEvent) => void;
    updateEvent: (event: CalendarEvent) => void;
    deleteEvent: (eventId: string) => void;
    refreshEvents: () => Promise<void>;
}

export interface MonthEventsMap {
    [monthKey: string]: {
        [day: number]: CalendarEvent[];
    };
}

interface CachedRange {
    prevMonth: number;
    prevYear: number;
    nextMonth: number;
    nextYear: number;
    events: CalendarEvent[];
}

export function useCalendarEventsState(currentMonth: number, currentYear: number) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [preloadLoading, setPreloadLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastLoadedRange, setLastLoadedRange] = useState<{ prevMonth: number; prevYear: number; nextMonth: number; nextYear: number } | null>(null);

    // Cache of loaded ranges to avoid refetching
    const cacheRef = useRef<Map<string, CachedRange>>(new Map());

    // Generate cache key for a range
    const cacheKey = useCallback((prevMonth: number, prevYear: number, nextMonth: number, nextYear: number) =>
        `${prevYear}-${prevMonth}_${nextYear}-${nextMonth}`, []);

    // Check if range is already cached
    const isRangeCached = useCallback((prevMonth: number, prevYear: number, nextMonth: number, nextYear: number): boolean => {
        return cacheRef.current.has(cacheKey(prevMonth, prevYear, nextMonth, nextYear));
    }, [cacheKey]);

    // Load events from API
    const loadEvents = useCallback(async (prevMonth: number, prevYear: number, nextMonth: number, nextYear: number) => {
        // Check cache first
        const key = cacheKey(prevMonth, prevYear, nextMonth, nextYear);
        const cached = cacheRef.current.get(key);

        if (cached) {
            setEvents(cached.events);
            setLastLoadedRange({ prevMonth, prevYear, nextMonth, nextYear });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await calendarApi.getByDateRange(prevMonth, prevYear, nextMonth, nextYear);
            const fetchedEvents = response.events || [];

            // Store in cache
            cacheRef.current.set(key, {
                prevMonth, prevYear, nextMonth, nextYear,
                events: fetchedEvents,
            });

            setEvents(fetchedEvents);
            setLastLoadedRange({ prevMonth, prevYear, nextMonth, nextYear });
        } catch (err) {
            console.error('Failed to load calendar events:', err);
            setError('Failed to load events');
        } finally {
            setLoading(false);
        }
    }, [cacheKey]);

    // Preload adjacent month in background (no loading state shown)
    // Uses minimal fields mode to reduce payload by ~40%
    const preloadAdjacentMonth = useCallback(async (month: number, year: number) => {
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;

        const key = cacheKey(prevMonth, prevYear, nextMonth, nextYear);
        if (cacheRef.current.has(key)) return; // Already cached

        setPreloadLoading(true);

        try {
            // Use minimal mode for preload - smaller payload, faster
            const response = await calendarApi.getByDateRange(prevMonth, prevYear, nextMonth, nextYear, true);
            cacheRef.current.set(key, {
                prevMonth, prevYear, nextMonth, nextYear,
                events: response.events || [],
            });
        } catch (err) {
            console.warn('Preload failed (non-critical):', err);
        } finally {
            setPreloadLoading(false);
        }
    }, [cacheKey]);

    // Add new event
    const addEvent = useCallback((event: CalendarEvent) => {
        setEvents(prev => {
            const updated = [...prev, event];
            // Update cache too
            if (lastLoadedRange) {
                const key = `${lastLoadedRange.prevYear}-${lastLoadedRange.prevMonth}_${lastLoadedRange.nextYear}-${lastLoadedRange.nextMonth}`;
                const cached = cacheRef.current.get(key);
                if (cached) {
                    cacheRef.current.set(key, { ...cached, events: updated });
                }
            }
            return updated;
        });
    }, [lastLoadedRange]);

    // Update existing event
    const updateEvent = useCallback((event: CalendarEvent) => {
        setEvents(prev => {
            const updated = prev.map(e => e.id === event.id ? event : e);
            // Update cache too
            if (lastLoadedRange) {
                const key = `${lastLoadedRange.prevYear}-${lastLoadedRange.prevMonth}_${lastLoadedRange.nextYear}-${lastLoadedRange.nextMonth}`;
                const cached = cacheRef.current.get(key);
                if (cached) {
                    cacheRef.current.set(key, { ...cached, events: updated });
                }
            }
            return updated;
        });
    }, [lastLoadedRange]);

    // Delete event
    const deleteEvent = useCallback((eventId: string) => {
        setEvents(prev => {
            const updated = prev.filter(e => e.id !== eventId);
            // Update cache too
            if (lastLoadedRange) {
                const key = `${lastLoadedRange.prevYear}-${lastLoadedRange.prevMonth}_${lastLoadedRange.nextYear}-${lastLoadedRange.nextMonth}`;
                const cached = cacheRef.current.get(key);
                if (cached) {
                    cacheRef.current.set(key, { ...cached, events: updated });
                }
            }
            return updated;
        });
    }, [lastLoadedRange]);

    // Refresh events
    const refreshEvents = useCallback(async () => {
        if (lastLoadedRange) {
            // Invalidate cache for current range
            const key = cacheKey(lastLoadedRange.prevMonth, lastLoadedRange.prevYear, lastLoadedRange.nextMonth, lastLoadedRange.nextYear);
            cacheRef.current.delete(key);
            await loadEvents(
                lastLoadedRange.prevMonth,
                lastLoadedRange.prevYear,
                lastLoadedRange.nextMonth,
                lastLoadedRange.nextYear
            );
        }
    }, [lastLoadedRange, loadEvents, cacheKey]);

    // Precalculated events map - grouped by month and day
    // This is the key optimization: O(1) lookup instead of O(n) filter
    const eventsMap = useMemo<MonthEventsMap>(() => {
        const map: MonthEventsMap = {};

        for (const event of events) {
            const monthKey = `${event.year}-${event.month}`;

            if (!map[monthKey]) {
                map[monthKey] = {};
            }

            if (!map[monthKey][event.date]) {
                map[monthKey][event.date] = [];
            }

            map[monthKey][event.date].push(event);
        }

        return map;
    }, [events]);

    // Get events for a specific day - O(1) lookup
    const getEventsForDay = useCallback((day: number, month: number, year: number) => {
        const monthKey = `${year}-${month}`;
        return eventsMap[monthKey]?.[day] || [];
    }, [eventsMap]);

    // Current month events count
    const currentMonthEventsCount = useMemo(() => {
        const monthKey = `${currentYear}-${currentMonth}`;
        let count = 0;
        const monthData = eventsMap[monthKey];
        if (monthData) {
            for (const day in monthData) {
                count += monthData[day].length;
            }
        }
        return count;
    }, [eventsMap, currentMonth, currentYear]);

    return {
        state: {
            events,
            loading,
            preloadLoading,
            error,
            eventsMap,
            currentMonthEventsCount,
        },
        actions: {
            loadEvents,
            addEvent,
            updateEvent,
            deleteEvent,
            refreshEvents,
            getEventsForDay,
            preloadAdjacentMonth,
            isRangeCached,
        },
    };
}

export default useCalendarEventsState;
