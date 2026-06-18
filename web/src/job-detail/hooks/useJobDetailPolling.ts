/**
 * useJobDetailPolling Hook (Enhanced)
 * 
 * Enhanced version with:
 * - Tab visibility pause (stops polling when tab is hidden)
 * - Exponential backoff on errors
 * - Request overlap prevention (no concurrent requests)
 * - Proper cleanup on unmount
 * - Terminal state detection
 * 
 * @see useTabVisibility - for tab visibility tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { JobDetailData, JobStatus } from '../types';
import { formatDuration } from '../utils';
import { useTabVisibility } from '@/hooks/useTabVisibility';

interface UseJobDetailPollingOptions {
  job: JobDetailData | null;
  onRefresh: () => Promise<void>;
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxRetries?: number;  // Max retries before stopping
}

interface UseJobDetailPollingReturn {
  now: Date;
  elapsedTime: string;
  isPolling: boolean;
  errorCount: number;
  currentBackoff: number;
}

// Terminal job statuses that should stop polling
const TERMINAL_STATUSES = new Set<JobStatus>(['COMPLETED', 'FAILED', 'ERROR', 'CANCELED']);

// Maximum backoff delay (5 minutes)
const MAX_BACKOFF_MS = 5 * 60 * 1000;

// Backoff multiplier
const BACKOFF_MULTIPLIER = 2;

export const useJobDetailPolling = ({
  job,
  onRefresh,
  autoRefresh = true,
  refreshInterval = 5000,
  maxRetries = 5,
}: UseJobDetailPollingOptions): UseJobDetailPollingReturn => {
  const [now, setNow] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [currentBackoff, setCurrentBackoff] = useState(refreshInterval);
  const currentBackoffRef = useRef(refreshInterval);

  const updateBackoff = useCallback((value: number) => {
    setCurrentBackoff(value);
    currentBackoffRef.current = value;
  }, []);
  
  const timeoutRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const isRequestInProgressRef = useRef(false);
  
  // Track tab visibility
  const isTabVisible = useTabVisibility();

  // Keep onRefresh ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Clock effect - updates every second (only when polling)
  useEffect(() => {
    if (!isPolling) return;
    
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    
    return () => window.clearInterval(timer);
  }, [isPolling]);

  // Polling effect with recursive setTimeout (cleaner for dynamic backoff)
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check if we should poll
    const shouldPoll =
      autoRefresh &&
      job?.status === 'PROCESSING' &&
      isTabVisible &&
      errorCount < maxRetries;

    if (shouldPoll && !isRequestInProgressRef.current) {
      setIsPolling(true);

      // Recursive poll function - schedules next poll after each attempt
      const poll = async () => {
        if (isRequestInProgressRef.current) return;
        
        isRequestInProgressRef.current = true;

        try {
          await onRefreshRef.current();
          // Reset error count and backoff on success
          setErrorCount(0);
          updateBackoff(refreshInterval);
        } catch (_error) {
          // Increment error count
          const newErrorCount = errorCount + 1;
          setErrorCount(newErrorCount);

          // Calculate exponential backoff
          const nextBackoff = Math.min(
            currentBackoffRef.current * BACKOFF_MULTIPLIER,
            MAX_BACKOFF_MS
          );
          updateBackoff(nextBackoff);

          // Stop polling if max retries reached
          if (newErrorCount >= maxRetries) {
            setIsPolling(false);
            isRequestInProgressRef.current = false;
            return;
          }
        } finally {
          isRequestInProgressRef.current = false;
        }

        // Schedule next poll with correct backoff
        timeoutRef.current = window.setTimeout(poll, currentBackoffRef.current);
      };

      // Start first poll immediately, then schedule next
      poll();
    } else if (!shouldPoll) {
      setIsPolling(false);
      // Reset error state when not polling
      if (job?.status !== 'PROCESSING') {
        setErrorCount(0);
        updateBackoff(refreshInterval);
      }
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [job?.job_id, job?.status, autoRefresh, isTabVisible, refreshInterval, errorCount, maxRetries, updateBackoff]);

  // Reset errors when job changes
  useEffect(() => {
    if (!job) return;
    setErrorCount(0);
    updateBackoff(refreshInterval);
  }, [job?.job_id, refreshInterval, updateBackoff]);

  // Calculate elapsed time
  const calculateElapsedTime = useCallback((): string => {
    if (!job?.created_at) return '--';
    const createdTs = typeof job.created_at === 'number' ? job.created_at * 1000 : new Date(job.created_at).getTime();
    if (Number.isNaN(createdTs)) return '--';

    let endTs: number;
    if (TERMINAL_STATUSES.has(job.status)) {
      const end = job.completed_at || job.updated_at;
      endTs = typeof end === 'number' ? end * 1000 : new Date(end || 0).getTime();
      if (Number.isNaN(endTs) || endTs === 0) {
        endTs = now.getTime();
      }
    } else {
      endTs = now.getTime();
    }

    const elapsedSeconds = Math.floor((endTs - createdTs) / 1000);
    return formatDuration(Math.max(0, elapsedSeconds));
  }, [job, now]);

  return {
    now,
    elapsedTime: calculateElapsedTime(),
    isPolling,
    errorCount,
    currentBackoff,
  };
};

export default useJobDetailPolling;
