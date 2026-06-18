/**
 * Calendar Modal State - Separated State Store
 * 
 * Manages modal visibility and selected event
 * Completely isolated from view and events state
 */

import { useState, useCallback } from 'react';
import { CalendarEvent } from '@/lib/api';

export interface CalendarModalState {
    isOpen: boolean;
    selectedEvent: CalendarEvent | null;
    selectedDay: number;
    selectedMonth: number;
    selectedYear: number;
    mode: 'create' | 'edit';
}

export interface CalendarModalActions {
    openModal: (day: number, month: number, year: number, event?: CalendarEvent | null) => void;
    closeModal: () => void;
    setSelectedEvent: (event: CalendarEvent | null) => void;
}

export function useCalendarModalState() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDay, setSelectedDay] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Open modal for create or edit
    const openModal = useCallback((day: number, month: number, year: number, event?: CalendarEvent | null) => {
        setSelectedDay(day);
        setSelectedMonth(month);
        setSelectedYear(year);
        setSelectedEvent(event || null);
        setIsOpen(true);
    }, []);

    // Close modal
    const closeModal = useCallback(() => {
        setIsOpen(false);
        setSelectedEvent(null);
    }, []);

    return {
        state: {
            isOpen,
            selectedEvent,
            selectedDay,
            selectedMonth,
            selectedYear,
            mode: selectedEvent ? 'edit' : 'create' as 'create' | 'edit',
        },
        actions: {
            openModal,
            closeModal,
            setSelectedEvent,
        },
    };
}

export default useCalendarModalState;