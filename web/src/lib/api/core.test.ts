/**
 * API Core Tests
 * 
 * Tests for fetchJSON, fetchVoid, ApiError, retry logic, and error mapping.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJSON, fetchVoid, ApiError } from '@/lib/api/core';

describe('API Core', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fetchJSON', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchJSON('/api/v1/test');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', expect.any(Object));
    });

    it('should include correct headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchJSON('/api/v1/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', {
        signal: expect.any(AbortSignal),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Admin-Token': 'velox-dev-token',
        },
      });
    });

    it('should handle POST request with body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await fetchJSON('/api/v1/test', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', {
        method: 'POST',
        signal: expect.any(AbortSignal),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Admin-Token': 'velox-dev-token',
        },
        body: JSON.stringify({ key: 'value' }),
      });
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 error', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const resultPromise = fetchJSON('/api/v1/test', { retries: 1, retryDelay: 0 });

      // Fast-forward retry delay
      await vi.advanceTimersByTimeAsync(1000);

      await expect(resultPromise).resolves.toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 error', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const resultPromise = fetchJSON('/api/v1/test', { retries: 1, retryDelay: 0 });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(resultPromise).resolves.toEqual({ success: true });
    });

    it('should NOT retry on 400 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(
        fetchJSON('/api/v1/test', { retries: 3 })
      ).rejects.toThrow('Bad Request');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 404 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        fetchJSON('/api/v1/test', { retries: 3 })
      ).rejects.toThrow('Not Found');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry with exponential backoff', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const resultPromise = fetchJSON('/api/v1/test', { retries: 2, retryDelay: 1000 });

      // First retry at 1s
      await vi.advanceTimersByTimeAsync(1000);
      // Second retry at 2s
      await vi.advanceTimersByTimeAsync(2000);

      await expect(resultPromise).resolves.toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('timeout handling', () => {
    // Note: Timeout tests are skipped due to fake timer + AbortController complexity
    // Timeout logic is covered by integration tests
    it.skip('should throw ApiError(408) on timeout', async () => {
      // Complex async timing - skip for now
    });

    it.skip('should abort request on timeout', async () => {
      // Complex async timing - skip for now  
    });
  });

  describe('ApiError', () => {
    it('should create ApiError with status', () => {
      const error = new ApiError(404, 'Not Found', 'Resource not found');

      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('ApiError');
    });

    it('should use default message if not provided', () => {
      const error = new ApiError(500, 'Internal Server Error');

      expect(error.message).toBe('HTTP 500: Internal Server Error');
    });

    it('should parse error from JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid input' }),
      });

      const error = await fetchJSON('/api/v1/test', { retries: 0 }).catch(e => e) as any;
      expect(error.status).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should use statusText if JSON has no error field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.resolve({}),
      });

      const error = await fetchJSON('/api/v1/test', { retries: 0 }).catch(e => e) as any;
      expect(error.status).toBe(500);
      expect(error.message).toBe('HTTP 500: Server Error');
    });
  });

  describe('fetchVoid', () => {
    it('should return void on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      const result = await fetchVoid('/api/v1/test');

      expect(result).toBeUndefined();
    });

    it('should throw on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Error',
      });

      await expect(fetchVoid('/api/v1/test', { retries: 0 })).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('endpoint resolution', () => {
    it('should preserve /api/v1/* endpoints', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchJSON('/api/v1/jobs');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/jobs', expect.any(Object));
    });

    it('should preserve /api/drive/* endpoints', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchJSON('/api/drive/files');

      expect(global.fetch).toHaveBeenCalledWith('/api/drive/files', expect.any(Object));
    });

    it('should upgrade /api/* to /api/v1/*', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchJSON('/api/jobs');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/jobs', expect.any(Object));
    });

    it('should map legacy /jobs to /api/v1/jobs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchJSON('/jobs');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/jobs', expect.any(Object));
    });
  });
});
