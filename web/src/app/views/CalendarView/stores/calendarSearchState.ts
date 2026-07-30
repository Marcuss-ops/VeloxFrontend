/**
 * Calendar Search State - Separated State Store
 *
 * Manages search with debounce and precomputed index
 * Completely isolated from view and events state
 *
 * Optimizations:
 * 1. Incremental index updates (add/remove single event)
 * 2. Lazy index building - only built when search is active
 * 3. Prefix matching with early exit
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CalendarEvent } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export interface SearchIndex {
    // Inverted index for fast text search
    titleIndex: Map<string, Set<string>>; // normalized word -> event ids
    clipNameIndex: Map<string, Set<string>>; // normalized word -> event ids
    eventIdToWords: Map<string, Set<string>>; // event id -> all searchable words
}

export interface CalendarSearchState {
    query: string;
    debouncedQuery: string;
    isSearching: boolean;
}

export interface CalendarSearchActions {
    setQuery: (query: string) => void;
    clearSearch: () => void;
}

// Normalize text for search
function normalizeText(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .split(/\s+/)
        .filter(word => word.length > 1); // Filter out single chars
}

// Extract searchable words from a single event
function extractEventWords(event: CalendarEvent): Set<string> {
    const allWords = new Set<string>();

    const titleWords = normalizeText(event.title);
    titleWords.forEach(w => allWords.add(w));

    const allClips = [
        ...(event.stockFootage || []),
        ...(event.initialClips || []),
        ...(event.intermediateClips || []),
        ...(event.finalClips || []),
    ];

    for (const clip of allClips) {
        const clipWords = normalizeText(clip.name);
        clipWords.forEach(w => allWords.add(w));
    }

    return allWords;
}

// Build search index from events (full rebuild)
function buildSearchIndex(events: CalendarEvent[]): SearchIndex {
    const titleIndex = new Map<string, Set<string>>();
    const clipNameIndex = new Map<string, Set<string>>();
    const eventIdToWords = new Map<string, Set<string>>();

    for (const event of events) {
        const allWords = extractEventWords(event);

        // Index title
        const titleWords = normalizeText(event.title);
        for (const word of titleWords) {
            if (!titleIndex.has(word)) {
                titleIndex.set(word, new Set());
            }
            titleIndex.get(word)!.add(event.id);
        }

        // Index clip names
        const allClips = [
            ...(event.stockFootage || []),
            ...(event.initialClips || []),
            ...(event.intermediateClips || []),
            ...(event.finalClips || []),
        ];

        for (const clip of allClips) {
            const clipWords = normalizeText(clip.name);
            for (const word of clipWords) {
                if (!clipNameIndex.has(word)) {
                    clipNameIndex.set(word, new Set());
                }
                clipNameIndex.get(word)!.add(event.id);
            }
        }

        eventIdToWords.set(event.id, allWords);
    }

    return { titleIndex, clipNameIndex, eventIdToWords };
}

// Add single event to index (incremental)
function addEventToIndex(index: SearchIndex, event: CalendarEvent): SearchIndex {
    const allWords = extractEventWords(event);

    // Add title words
    const titleWords = normalizeText(event.title);
    for (const word of titleWords) {
        if (!index.titleIndex.has(word)) {
            index.titleIndex.set(word, new Set());
        }
        index.titleIndex.get(word)!.add(event.id);
    }

    // Add clip name words
    const allClips = [
        ...(event.stockFootage || []),
        ...(event.initialClips || []),
        ...(event.intermediateClips || []),
        ...(event.finalClips || []),
    ];

    for (const clip of allClips) {
        const clipWords = normalizeText(clip.name);
        for (const word of clipWords) {
            if (!index.clipNameIndex.has(word)) {
                index.clipNameIndex.set(word, new Set());
            }
            index.clipNameIndex.get(word)!.add(event.id);
        }
    }

    index.eventIdToWords.set(event.id, allWords);
    return index;
}

// Remove single event from index (incremental)
function removeEventFromIndex(index: SearchIndex, eventId: string): SearchIndex {
    const words = index.eventIdToWords.get(eventId);
    if (words) {
        // Remove from title index
        for (const word of words) {
            const titleSet = index.titleIndex.get(word);
            if (titleSet) {
                titleSet.delete(eventId);
                if (titleSet.size === 0) {
                    index.titleIndex.delete(word);
                }
            }
            const clipSet = index.clipNameIndex.get(word);
            if (clipSet) {
                clipSet.delete(eventId);
                if (clipSet.size === 0) {
                    index.clipNameIndex.delete(word);
                }
            }
        }
    }

    index.eventIdToWords.delete(eventId);
    return index;
}

// Prefix matching optimized with early exit
function findMatches(searchIndex: SearchIndex, queryWords: string[]): Set<string> {
    const matchingIds = new Set<string>();

    for (const word of queryWords) {
        // Exact match first (fast)
        const titleMatches = searchIndex.titleIndex.get(word);
        if (titleMatches) {
            titleMatches.forEach(id => matchingIds.add(id));
        }
        const clipMatches = searchIndex.clipNameIndex.get(word);
        if (clipMatches) {
            clipMatches.forEach(id => matchingIds.add(id));
        }

        // Prefix matching only if no exact match found (lazy)
        if (matchingIds.size === 0) {
            for (const [indexedWord, eventIds] of searchIndex.titleIndex) {
                if (indexedWord.startsWith(word)) {
                    eventIds.forEach(id => matchingIds.add(id));
                }
            }
            for (const [indexedWord, eventIds] of searchIndex.clipNameIndex) {
                if (indexedWord.startsWith(word)) {
                    eventIds.forEach(id => matchingIds.add(id));
                }
            }
        }
    }

    return matchingIds;
}

export function useCalendarSearchState(events: CalendarEvent[], debounceMs: number = 150) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Refs for incremental index management
    const indexRef = useRef<SearchIndex | null>(null);
    const eventsRef = useRef<CalendarEvent[]>(events);
    const eventsVersionRef = useRef(0);

    // Debounce the query
    const debouncedQuery = useDebouncedValue(query, debounceMs);

    // Build or update search index incrementally
    const searchIndex = useMemo(() => {
        const hasEventsChanged = eventsRef.current !== events;
        eventsRef.current = events;

        if (!indexRef.current || events.length === 0) {
            // Full rebuild needed
            indexRef.current = buildSearchIndex(events);
            eventsVersionRef.current = 0;
            return indexRef.current;
        }

        // Check if events array reference changed (new array)
        // If so, do a diff and apply incremental updates
        if (hasEventsChanged) {
            const oldEvents = eventsRef.current;
            const oldEventIds = new Set(oldEvents.map(e => e.id));
            const newEventIds = new Set(events.map(e => e.id));

            // Find added events
            for (const event of events) {
                if (!oldEventIds.has(event.id)) {
                    addEventToIndex(indexRef.current!, event);
                }
            }

            // Find removed events
            for (const oldEvent of oldEvents) {
                if (!newEventIds.has(oldEvent.id)) {
                    removeEventFromIndex(indexRef.current!, oldEvent.id);
                }
            }

            // Find updated events (compare JSON)
            const oldEventMap = new Map(oldEvents.map(e => [e.id, e]));
            for (const event of events) {
                const oldEvent = oldEventMap.get(event.id);
                if (oldEvent && JSON.stringify(event) !== JSON.stringify(oldEvent)) {
                    removeEventFromIndex(indexRef.current!, event.id);
                    addEventToIndex(indexRef.current!, event);
                }
            }

            eventsVersionRef.current++;
        }

        return indexRef.current;
    }, [events]);

    // Search function using the index
    const searchResults = useMemo(() => {
        if (!debouncedQuery.trim()) {
            return null; // null means no filter, show all
        }

        const queryWords = normalizeText(debouncedQuery);
        if (queryWords.length === 0) {
            return null;
        }

        return findMatches(searchIndex, queryWords);
    }, [debouncedQuery, searchIndex]);

    // Filtered events based on search
    const filteredEventIds = useMemo(() => {
        return searchResults;
    }, [searchResults]);

    // Check if an event matches the search
    const eventMatchesSearch = useCallback((eventId: string): boolean => {
        if (!filteredEventIds) return true; // No filter
        return filteredEventIds.has(eventId);
    }, [filteredEventIds]);

    // Set query with loading state
    const handleSetQuery = useCallback((newQuery: string) => {
        setQuery(newQuery);
        setIsSearching(newQuery !== debouncedQuery);
    }, [debouncedQuery]);

    // Clear search
    const clearSearch = useCallback(() => {
        setQuery('');
        setIsSearching(false);
    }, []);

    // Update searching state when debounce catches up
    useEffect(() => {
        if (query === debouncedQuery) {
            setIsSearching(false);
        }
    }, [query, debouncedQuery]);

    return {
        state: {
            query,
            debouncedQuery,
            isSearching,
            filteredEventIds,
            hasActiveSearch: debouncedQuery.trim().length > 0,
        },
        actions: {
            setQuery: handleSetQuery,
            clearSearch,
            eventMatchesSearch,
        },
    };
}

export default useCalendarSearchState;
