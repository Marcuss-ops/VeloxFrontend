/**
 * Calendar State Stores - Index
 * 
 * Separated state management for optimal performance:
 * - calendarViewState: UI state (current month, loading, error)
 * - calendarEventsState: Events data and CRUD operations
 * - calendarSearchState: Search with debounce and precomputed index
 * - calendarDragState: Drag and drop with ghost overlay
 * - calendarModalState: Modal visibility and selected event
 */

export { useCalendarViewState } from './calendarViewState';
export type { CalendarViewState, CalendarViewActions } from './calendarViewState';

export { useCalendarEventsState } from './calendarEventsState';
export type { CalendarEventsState, CalendarEventsActions, MonthEventsMap } from './calendarEventsState';

export { useCalendarSearchState } from './calendarSearchState';
export type { CalendarSearchState, CalendarSearchActions, SearchIndex } from './calendarSearchState';

export { useCalendarDragState } from './calendarDragState';
export type { CalendarDragState, CalendarDragActions, DragPosition } from './calendarDragState';

export { useCalendarModalState } from './calendarModalState';
export type { CalendarModalState, CalendarModalActions } from './calendarModalState';