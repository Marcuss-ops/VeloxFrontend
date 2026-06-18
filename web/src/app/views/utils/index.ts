export type { JobEvent, JobDetailData } from './jobDetail';
export {
    statusConfig,
    formatTime,
    formatDuration,
    asString,
    isValidTimestamp,
    normalizeTimestamp,
    parseClockToSeconds,
    computeDurationFromTimestamps,
    mapJobEventsToLogs,
    mapHistoryToLogs,
    mapShowlogToEvents,
    dedupeLogs,
} from './jobDetail';
