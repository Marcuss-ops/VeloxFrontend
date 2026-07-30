/**
 * Calendar View - Reduced Version
 *
 * Composes extracted hook, CalendarHeader and CalendarGrid components.
 * Split from the original monolithic CalendarView.tsx (424 lines).
 */

import React, { Suspense, lazy } from 'react';
import { useCalendarView } from './hooks';
import { CalendarHeader } from './components/CalendarHeader';
import { CalendarGrid } from './components/CalendarGrid';

// Lazy load the heavy modal component
const CalendarModal = lazy(() => import('../CalendarModal').then(m => ({ default: m.CalendarModal })));

export const CalendarView: React.FC = () => {
    const {
        currentDate,
        loading,
        error,
        events,
        selectedEvent,
        selectedDay,
        showModal,
        dayRange,
        visibleDays,
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
    } = useCalendarView();

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f]">
            <CalendarHeader
                currentDate={currentDate}
                loading={loading}
                error={error}
                eventsCount={events.length}
                dayRange={dayRange}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onSetDayRange={setDayRange}
            />

            <CalendarGrid
                visibleDays={visibleDays}
                getEventsForDay={getEventsForDay}
                isToday={isToday}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            />

            {/* Modal with Suspense for lazy loading */}
            {showModal && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <span className="material-symbols-outlined text-white animate-spin text-4xl">sync</span>
                    </div>
                }>
                    <CalendarModal
                        event={selectedEvent}
                        selectedDay={selectedDay}
                        selectedMonth={currentDate.getMonth()}
                        selectedYear={currentDate.getFullYear()}
                        onClose={closeModal}
                        onSave={handleSaveEvent}
                        onDelete={selectedEvent ? handleDeleteEvent : undefined}
                    />
                </Suspense>
            )}
        </div>
    );
};

CalendarView.displayName = 'CalendarView';

export default CalendarView;