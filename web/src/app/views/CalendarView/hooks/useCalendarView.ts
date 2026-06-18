/**
 * useCalendarView Hook
 *
 * State management, event handlers, and navigation logic
 * extracted from the original monolithic CalendarView.tsx.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { calendarApi, CalendarEvent } from '@/lib/api';

// --- Constants ---
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Cache for API responses
const eventsCache = new Map<string, { events: CalendarEvent[], timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export interface CalendarViewHook {
    // State
    currentDate: Date;
    events: CalendarEvent[];
    selectedEvent: CalendarEvent | null;
    selectedDay: number;
    showModal: boolean;
    draggedEvent: CalendarEvent | null;
    loading: boolean;
    error: string | null;
    dayRange: number | null;
    daysInMonth: number;
    visibleDays: number[];
    eventsByDay: Map<number, CalendarEvent[]>;

    // Derived
    monthName: string;
    year: number;
    month: number;

    // Actions
    prevMonth: () => void;
    nextMonth: () => void;
    getEventsForDay: (day: number) => CalendarEvent[];
    handleDayClick: (day: number) => void;
    handleEventClick: (event: CalendarEvent) => void;
    handleSaveEvent: (event: CalendarEvent) => Promise<void>;
    handleDeleteEvent: (eventId: string) => Promise<void>;
    handleDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, newDay: number) => Promise<void>;
    closeModal: () => void;
    isToday: (day: number | null) => boolean;
    setDayRange: (range: number | null) => void;
}

export function useCalendarView(): CalendarViewHook {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [showModal, setShowModal] = useState(false);
    const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dayRange, setDayRange] = useState<number | null>(null);

    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const monthName = MONTHS[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Load events from API on mount and when month changes (with caching)
    useEffect(() => {
        const loadEvents = async () => {
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const cacheKey = `${currentYear}-${currentMonth}`;

            // Check cache first
            const cached = eventsCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                setEvents(cached.events);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await calendarApi.getByDateRange(currentMonth, currentYear, currentMonth, currentYear);
                const eventsData = response.events || [];

                // Update cache
                eventsCache.set(cacheKey, { events: eventsData, timestamp: Date.now() });
                setEvents(eventsData);
            } catch (err) {
                console.error('Failed to load calendar events:', err);
                setError('Failed to load events');
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [currentDate]);

    // Generate simple day grid - all days of the month
    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }, [currentDate]);

    // Filter days based on dayRange (from today onwards)
    const visibleDays = useMemo(() => {
        const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        if (dayRange === null) {
            return allDays;
        }

        const now = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        if (currentMonth === now.getMonth() && currentYear === now.getFullYear()) {
            const todayDay = now.getDate();
            const endDay = Math.min(todayDay + dayRange - 1, daysInMonth);
            return allDays.filter(day => day >= todayDay && day <= endDay);
        }

        return allDays;
    }, [daysInMonth, dayRange, currentDate]);

    // Group events by day
    const eventsByDay = useMemo(() => {
        const map = new Map<number, CalendarEvent[]>();
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        for (const event of events) {
            if (event.month !== month || event.year !== year) continue;
            const list = map.get(event.date);
            if (list) {
                list.push(event);
            } else {
                map.set(event.date, [event]);
            }
        }
        return map;
    }, [events, currentDate]);

    const getEventsForDay = useCallback((day: number) => {
        return eventsByDay.get(day) || [];
    }, [eventsByDay]);

    const handleDayClick = useCallback((day: number) => {
        setSelectedDay(day);
        setSelectedEvent(null);
        setShowModal(true);
    }, []);

    const handleEventClick = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setSelectedDay(event.date);
        setShowModal(true);
    }, []);

    const handleSaveEvent = useCallback(async (event: CalendarEvent) => {
        try {
            const savedEvent = await calendarApi.upsert(event);

            setEvents(prev => {
                const existing = prev.findIndex(e => e.id === savedEvent.id);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = savedEvent;
                    return updated;
                }
                return [...prev, savedEvent];
            });

            // Invalidate cache for current month
            const cacheKey = `${event.year}-${event.month}`;
            eventsCache.delete(cacheKey);
        } catch (err) {
            console.error('Failed to save event:', err);
            setEvents(prev => {
                const existing = prev.findIndex(e => e.id === event.id);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = event;
                    return updated;
                }
                return [...prev, event];
            });
        }
    }, []);

    const handleDeleteEvent = useCallback(async (eventId: string) => {
        try {
            await calendarApi.delete(eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
        } catch (err) {
            console.error('Failed to delete event:', err);
        }
    }, []);

    const handleDragStart = useCallback((e: React.DragEvent, event: CalendarEvent) => {
        setDraggedEvent(event);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, newDay: number) => {
        e.preventDefault();
        if (draggedEvent) {
            const updatedEvent = {
                ...draggedEvent,
                date: newDay,
                month: currentDate.getMonth(),
                year: currentDate.getFullYear()
            };

            try {
                await calendarApi.update(draggedEvent.id, updatedEvent);
            } catch (err) {
                console.error('Failed to move event:', err);
            }

            setEvents(prev => prev.map(ev =>
                ev.id === draggedEvent.id ? updatedEvent : ev
            ));
            setDraggedEvent(null);
        }
    }, [draggedEvent, currentDate]);

    const prevMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    const nextMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }, []);

    const closeModal = useCallback(() => {
        setShowModal(false);
        setSelectedEvent(null);
    }, []);

    const isToday = useCallback((day: number | null) => {
        if (!day) return false;
        return day === todayDate &&
               currentDate.getMonth() === todayMonth &&
               currentDate.getFullYear() === todayYear;
    }, [todayDate, todayMonth, todayYear, currentDate]);

    return {
        currentDate,
        events,
        selectedEvent,
        selectedDay,
        showModal,
        draggedEvent,
        loading,
        error,
        dayRange,
        daysInMonth,
        visibleDays,
        eventsByDay,
        monthName,
        year,
        month,
        prevMonth,
        nextMonth,
        getEventsForDay,
        handleDayClick,
        handleEventClick,
        handleSaveEvent,
        handleDeleteEvent,
        handleDragStart,
        handleDragOver,
        handleDrop,
        closeModal,
        isToday,
        setDayRange,
    };
}

export default useCalendarView;