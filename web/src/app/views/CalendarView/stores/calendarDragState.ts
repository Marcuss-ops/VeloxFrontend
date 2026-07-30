/**
 * Calendar Drag State - Separated State Store
 *
 * Manages drag and drop with ghost overlay
 * The grid stays static during drag - only the ghost moves
 *
 * Optimized with requestAnimationFrame for smooth 60fps ghost movement
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarEvent } from '@/lib/api';

export interface DragPosition {
    x: number;
    y: number;
}

export interface CalendarDragState {
    isDragging: boolean;
    draggedEvent: CalendarEvent | null;
    ghostPosition: DragPosition | null;
    sourceDay: number | null;
    sourceMonth: number | null;
    sourceYear: number | null;
}

export interface CalendarDragActions {
    startDrag: (event: CalendarEvent, e: React.DragEvent, day: number, month: number, year: number) => void;
    updateGhostPosition: (x: number, y: number) => void;
    endDrag: () => void;
    getDropTarget: (day: number, month: number, year: number) => { valid: boolean; event: CalendarEvent | null };
}

export function useCalendarDragState() {
    const [isDragging, setIsDragging] = useState(false);
    const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
    const [ghostPosition, setGhostPosition] = useState<DragPosition | null>(null);
    const [sourceDay, setSourceDay] = useState<number | null>(null);
    const [sourceMonth, setSourceMonth] = useState<number | null>(null);
    const [sourceYear, setSourceYear] = useState<number | null>(null);

    // Refs for animation frame management
    const rafIdRef = useRef<number | null>(null);
    const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

    // Start drag - creates ghost overlay
    const startDrag = useCallback((event: CalendarEvent, e: React.DragEvent, day: number, month: number, year: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', event.id); // Fallback

        // Set drag image to empty (we use custom ghost)
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);

        setDraggedEvent(event);
        setSourceDay(day);
        setSourceMonth(month);
        setSourceYear(year);
        setGhostPosition({ x: e.clientX, y: e.clientY });
        setIsDragging(true);
    }, []);

    // Update ghost position during drag with requestAnimationFrame
    // This batches updates to 60fps instead of every mousemove event
    const updateGhostPosition = useCallback((x: number, y: number) => {
        pendingPosRef.current = { x, y };

        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                if (pendingPosRef.current) {
                    setGhostPosition(pendingPosRef.current);
                    pendingPosRef.current = null;
                }
            });
        }
    }, []);

    // End drag
    const endDrag = useCallback(() => {
        // Cancel any pending animation frame
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        pendingPosRef.current = null;

        setIsDragging(false);
        setDraggedEvent(null);
        setGhostPosition(null);
        setSourceDay(null);
        setSourceMonth(null);
        setSourceYear(null);
    }, []);

    // Get drop target info
    const getDropTarget = useCallback((_day: number, _month: number, _year: number) => {
        const valid = isDragging && draggedEvent !== null;
        return {
            valid,
            event: valid ? draggedEvent : null,
        };
    }, [isDragging, draggedEvent]);

    // Handle global mouse move for ghost position
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            updateGhostPosition(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            endDrag();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            // Cleanup animation frame
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [isDragging, updateGhostPosition, endDrag]);

    return {
        state: {
            isDragging,
            draggedEvent,
            ghostPosition,
            sourceDay,
            sourceMonth,
            sourceYear,
        },
        actions: {
            startDrag,
            updateGhostPosition,
            endDrag,
            getDropTarget,
        },
    };
}

export default useCalendarDragState;