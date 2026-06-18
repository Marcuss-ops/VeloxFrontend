/**
 * useJobDetailPolling Hook Tests
 * 
 * Tests for:
 * - Cleanup on unmount
 * - Stop polling when job is terminal
 * - No double interval on rerender
 * - No race if jobId changes
 * - Transient error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJobDetailPolling } from '@/job-detail/hooks/useJobDetailPolling';
import type { JobDetailData, JobStatus } from '@/job-detail/types';

describe('useJobDetailPolling', () => {
  // Use fake timers for precise control
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const mockJob: JobDetailData = {
    job_id: 'job1',
    status: 'PROCESSING' as JobStatus,
    created_at: Math.floor(Date.now() / 1000) - 60,
    updated_at: Math.floor(Date.now() / 1000),
  };

  describe('cleanup on unmount', () => {
    it('should cancel timer on unmount', () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const { unmount } = renderHook(() =>
        useJobDetailPolling({
          job: mockJob,
          onRefresh,
          autoRefresh: true,
          refreshInterval: 1000,
        })
      );

      // Mount poll happens immediately
      expect(onRefresh).toHaveBeenCalledTimes(1);

      // Unmount should clear intervals
      unmount();

      // Advance timers - onRefresh should NOT be called again
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop polling when job is terminal', () => {
    const terminalStatuses: JobStatus[] = ['COMPLETED', 'FAILED', 'ERROR', 'CANCELED'];

    terminalStatuses.forEach((status) => {
      it(`should stop polling when status is ${status}`, () => {
        const onRefresh = vi.fn().mockResolvedValue(undefined);
        const terminalJob: JobDetailData = { ...mockJob, status };

        renderHook(() =>
          useJobDetailPolling({
            job: terminalJob,
            onRefresh,
            autoRefresh: true,
            refreshInterval: 1000,
          })
        );

        // Advance timers
        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(onRefresh).not.toHaveBeenCalled();
      });
    });

    it('should start polling when job transitions to PROCESSING', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      
      const { rerender } = renderHook(
        ({ job }) =>
          useJobDetailPolling({
            job,
            onRefresh,
            autoRefresh: true,
            refreshInterval: 1000,
          }),
        { initialProps: { job: { ...mockJob, status: 'QUEUED' as JobStatus } } }
      );

      // Should not poll for QUEUED
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onRefresh).not.toHaveBeenCalled();

      // Update to PROCESSING
      rerender({ job: { ...mockJob, status: 'PROCESSING' as JobStatus } });

      // Should now poll
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('no double interval on rerender', () => {
    it('should not create multiple intervals on rerender', () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const spyClearInterval = vi.spyOn(window, 'clearInterval');
      const spySetInterval = vi.spyOn(window, 'setInterval');

      const { rerender } = renderHook(
        ({ job }) =>
          useJobDetailPolling({
            job,
            onRefresh,
            autoRefresh: true,
            refreshInterval: 1000,
          }),
        { initialProps: { job: mockJob } }
      );

      // First render creates interval
      expect(spySetInterval).toHaveBeenCalledTimes(1);

      // Rerender should not recreate interval if dependencies didn't change
      rerender({ job: mockJob });

      expect(spyClearInterval).not.toHaveBeenCalled();
      expect(spySetInterval).toHaveBeenCalledTimes(1);

      spyClearInterval.mockRestore();
      spySetInterval.mockRestore();
    });
  });

  describe('jobId changes', () => {
    it('should reset polling when job changes', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ job }) =>
          useJobDetailPolling({
            job,
            onRefresh,
            autoRefresh: true,
            refreshInterval: 1000,
          }),
        { initialProps: { job: mockJob } }
      );

      // Wait for first poll
      await Promise.resolve();
      const firstCallCount = onRefresh.mock.calls.length;

      // Change job inside act to trigger the status effect correctly
      await act(async () => {
        rerender({ job: { ...mockJob, job_id: 'job2' } });
      });

      // Wait for the new poll
      await Promise.resolve();

      expect(onRefresh.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe('error handling', () => {
    it('should not duplicate requests on transient error', async () => {
      const onRefresh = vi.fn().mockRejectedValue(new Error('Network error'));

      renderHook(() =>
        useJobDetailPolling({
          job: mockJob,
          onRefresh,
          autoRefresh: true,
          refreshInterval: 1000,
        })
      );

      // Flush mount microtasks so the timeout gets scheduled at T=0
      await Promise.resolve();

      expect(onRefresh).toHaveBeenCalledTimes(1);

      // Advance by 1000ms - should not poll again yet (since backoff is 2000ms)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onRefresh).toHaveBeenCalledTimes(1);

      // Advance by another 1000ms (2000ms total) - triggers second poll
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      // Flush microtasks of the second poll
      await Promise.resolve();
      expect(onRefresh).toHaveBeenCalledTimes(2);

      // Advance by 2000ms - should not poll again due to backoff (4000ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onRefresh).toHaveBeenCalledTimes(2);

      // Advance by another 2000ms (4000ms total since second poll) - triggers third poll
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // Flush microtasks of the third poll
      await Promise.resolve();
      expect(onRefresh).toHaveBeenCalledTimes(3);
    });

    it('should continue polling after transient error', async () => {
      const onRefresh = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);

      renderHook(() =>
        useJobDetailPolling({
          job: mockJob,
          onRefresh,
          autoRefresh: true,
          refreshInterval: 1000,
        })
      );

      // Mount poll fails immediately - flush microtasks to schedule next poll
      await Promise.resolve();
      expect(onRefresh).toHaveBeenCalledTimes(1);

      // Second poll (succeeds) - requires 2000ms backoff delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // Flush microtasks
      await Promise.resolve();
      expect(onRefresh).toHaveBeenCalledTimes(2);

      // Third poll (succeeds) - backoff reset to 1000ms on success
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      // Flush microtasks
      await Promise.resolve();
      expect(onRefresh).toHaveBeenCalledTimes(3);
    });
  });

  describe('elapsed time calculation', () => {
    it('should calculate elapsed time for PROCESSING job', () => {
      const createdTime = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
      const job = { ...mockJob, created_at: createdTime, status: 'PROCESSING' as JobStatus };

      const { result } = renderHook(() =>
        useJobDetailPolling({
          job,
          onRefresh: vi.fn(),
          autoRefresh: true,
        })
      );

      expect(result.current.elapsedTime).toBe('02:00');
    });

    it('should use completed_at for COMPLETED job', () => {
      const createdTime = Math.floor(Date.now() / 1000) - 300;
      const completedTime = Math.floor(Date.now() / 1000) - 60;
      const job = {
        ...mockJob,
        created_at: createdTime,
        completed_at: completedTime,
        status: 'COMPLETED' as JobStatus,
      };

      const { result } = renderHook(() =>
        useJobDetailPolling({
          job,
          onRefresh: vi.fn(),
          autoRefresh: false,
        })
      );

      // Elapsed should be from created to completed (4 minutes)
      expect(result.current.elapsedTime).toBe('04:00');
    });
  });

  describe('autoRefresh disabled', () => {
    it('should not poll when autoRefresh is false', () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);

      renderHook(() =>
        useJobDetailPolling({
          job: mockJob,
          onRefresh,
          autoRefresh: false,
          refreshInterval: 1000,
        })
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });
  });
});
