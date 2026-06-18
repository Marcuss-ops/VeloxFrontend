/**
 * Job Detail Helper Functions
 * Utility functions for working with job data and logs
 */

import { JobEvent, JobHistoryEntry } from './types';

// Format timestamp
export const formatTime = (ts: string | number | undefined): string => {
    if (!ts) return '--';
    const date = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

// Format duration
export const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const isValidTimestamp = (value: string | number | undefined): boolean => {
    if (!value) return false;
    const date = new Date(typeof value === 'number' ? value * 1000 : value);
    return !Number.isNaN(date.getTime());
};

export const normalizeTimestamp = (value: unknown): string => {
    const raw = asString(value).trim();
    if (!raw) return new Date().toISOString();
    const fixed = raw.replace(/Z+$/i, 'Z');
    return isValidTimestamp(fixed) ? fixed : new Date().toISOString();
};

const parseClockToSeconds = (value: unknown): number => {
    const raw = asString(value).trim();
    if (!raw) return 0;
    const parts = raw.split(':').map((p) => Number.parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
};

export const computeDurationFromTimestamps = (value: unknown): string | null => {
    if (!Array.isArray(value)) return null;
    let total = 0;
    for (const item of value) {
        const entry = (item || {}) as Record<string, unknown>;
        const start = parseClockToSeconds(entry.start);
        const end = parseClockToSeconds(entry.end);
        if (end > start) total += end - start;
    }
    return total > 0 ? formatDuration(total) : null;
};

export const mapJobEventsToLogs = (events: unknown): JobEvent[] => {
    if (!Array.isArray(events)) return [];
    return events
        .map((entry) => {
            const e = (entry || {}) as Record<string, unknown>;
            const event = asString(e.event_type || e.event || e.status || 'info').toLowerCase();
            const worker = asString(e.worker_id || '');
            const rawMessage = asString(e.message || '');
            const message = rawMessage || (
                event === 'created' ? 'Job created'
                : event === 'claimed' ? `Job assigned to worker ${worker || 'unknown'}`
                : event
            );
            return {
                timestamp: normalizeTimestamp(e.timestamp || e.time),
                event_type: event || 'info',
                message,
                worker_id: worker || undefined,
                details: e,
            } as JobEvent;
        })
        .filter((e) => e.message);
};

export const mapHistoryToLogs = (history: unknown): JobEvent[] => {
    if (!Array.isArray(history)) return [];
    return history
        .map((entry) => {
            const e = entry as JobHistoryEntry;
            return {
                timestamp: normalizeTimestamp(e.timestamp),
                event_type: asString(e.status || 'info').toLowerCase(),
                message: asString(e.message || e.status || ''),
                worker_id: asString(e.worker_id || ''),
            } as JobEvent;
        })
        .filter((e) => e.message);
};

export const mapShowlogToEvents = (lines: unknown): JobEvent[] => {
    if (!Array.isArray(lines)) return [];
    return lines
        .map((line) => {
            const raw = asString(line).trim();
            if (!raw) return null;
            const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
            if (!m) {
                return {
                    timestamp: new Date().toISOString(),
                    event_type: 'worker',
                    message: raw,
                } as JobEvent;
            }
            return {
                timestamp: isValidTimestamp(m[1]) ? m[1] : new Date().toISOString(),
                event_type: 'worker',
                message: m[2] || raw,
            } as JobEvent;
        })
        .filter((e): e is JobEvent => Boolean(e));
};

export const dedupeLogs = (events: JobEvent[]): JobEvent[] => {
    const seen = new Set<string>();
    return events.filter((e) => {
        const key = `${e.timestamp}|${e.event_type}|${e.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
