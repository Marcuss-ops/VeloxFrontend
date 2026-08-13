/**
 * useCalendarSearchState - incremental index regression tests
 *
 * When the `events` array reference changes, the search index must be
 * updated incrementally (add / remove / update events). This guards the
 * snapshot bug where `eventsRef.current` was overwritten with the new array
 * before `oldEvents` was read, making the diff compare events against
 * themselves and never applying index updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CalendarEvent } from '@/lib/api';
import { useCalendarSearchState } from './calendarSearchState';

function makeEvent(id: string, title: string): CalendarEvent {
    return {
        id,
        title,
        date: 0,
        month: 1,
        year: 2026,
        stockFootage: [],
        initialClips: [],
        intermediateClips: [],
        finalClips: [],
    };
}

describe('useCalendarSearchState incremental index', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function searchFor(
        actions: ReturnType<typeof useCalendarSearchState>['actions'],
        query: string
    ) {
        act(() => actions.setQuery(query));
        act(() => {
            vi.advanceTimersByTime(1);
        });
    }

    it('applies added, removed and updated events when the events array changes', () => {
        const v1 = [makeEvent('a', 'Alpha'), makeEvent('b', 'Beta')];
        // 'a' removed, 'b' renamed, 'c' added
        const v2 = [makeEvent('b', 'Beta updated'), makeEvent('c', 'Charlie')];

        const { result, rerender } = renderHook(
            ({ events }) => useCalendarSearchState(events, 0),
            { initialProps: { events: v1 } }
        );

        rerender({ events: v2 });

        // Added event is searchable
        searchFor(result.current.actions, 'charlie');
        expect(result.current.actions.eventMatchesSearch('c')).toBe(true);

        // Removed event no longer matches
        searchFor(result.current.actions, 'alpha');
        expect(result.current.actions.eventMatchesSearch('a')).toBe(false);

        // Renamed event matches its new title
        searchFor(result.current.actions, 'updated');
        expect(result.current.actions.eventMatchesSearch('b')).toBe(true);
    });
});
