/**
 * Calendar View State - Separated State Store
 * 
 * Manages view-specific state (current month, year, UI state)
 * Completely isolated from events and modal state
 */

import { useState, useCallback, useMemo } from 'react';

export interface CalendarViewState {
    currentDate: Date;
    loading: boolean;
    error: string | null;
}

export interface CalendarViewActions {
    goToPrevMonth: () => void;
    goToNextMonth: () => void;
    goToToday: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function useCalendarViewState() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const goToPrevMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    const goToNextMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }, []);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // Precalculated month data - computed once
    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();
        
        // Days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Month key for caching
        const monthKey = `${year}-${month}`;
        
        // Month name
        const monthName = MONTHS[month];
        
        // Today info
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
        const todayDate = today.getDate();

        return {
            year,
            month,
            daysInMonth,
            monthKey,
            monthName,
            isCurrentMonth,
            todayDate,
            todayMonth: today.getMonth(),
            todayYear: today.getFullYear(),
        };
    }, [currentDate]);

    return {
        state: {
            currentDate,
            loading,
            error,
            ...monthData,
        },
        actions: {
            goToPrevMonth,
            goToNextMonth,
            goToToday,
            setLoading,
            setError,
        },
    };
}

export default useCalendarViewState;