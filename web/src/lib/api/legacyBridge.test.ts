/**
 * Legacy Bridge React Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  normalizeError,
  LoadingManager,
  LegacyApiProvider,
  useLegacyApi,
  useLegacyToast,
} from './legacyBridge';

describe('normalizeError', () => {
  it('should normalize network errors', () => {
    const error = new TypeError('fetch failed');
    const normalized = normalizeError(error);

    expect(normalized.type).toBe('network');
    expect(normalized.status).toBe(0);
    expect(normalized.message).toContain('connessione');
  });

  it('should normalize timeout errors', () => {
    const error = new Error('Timeout');
    error.name = 'AbortError';
    const normalized = normalizeError(error);

    expect(normalized.type).toBe('timeout');
    expect(normalized.status).toBe(408);
  });

  it('should normalize generic errors', () => {
    const error = new Error('Something went wrong');
    const normalized = normalizeError(error);

    expect(normalized.type).toBe('unknown');
    expect(normalized.message).toBe('Something went wrong');
  });
});

describe('LoadingManager', () => {
  let loadingManager: LoadingManager;

  beforeEach(() => {
    loadingManager = new LoadingManager();
  });

  it('should track loading state', () => {
    expect(loadingManager.getState().isLoading).toBe(false);

    loadingManager.start('test-operation');
    expect(loadingManager.getState().isLoading).toBe(true);
    expect(loadingManager.getState().operation).toBe('test-operation');

    loadingManager.stop();
    expect(loadingManager.getState().isLoading).toBe(false);
  });

  it('should notify listeners on state change', () => {
    const listener = vi.fn();
    const unsubscribe = loadingManager.subscribe(listener);

    loadingManager.start('test');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isLoading: true }));

    loadingManager.stop();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isLoading: false }));

    unsubscribe();
  });

  it('should handle nested loading operations', () => {
    loadingManager.start('op1');
    loadingManager.start('op2');
    expect(loadingManager.getState().isLoading).toBe(true);

    loadingManager.stop();
    expect(loadingManager.getState().isLoading).toBe(true); // Still loading

    loadingManager.stop();
    expect(loadingManager.getState().isLoading).toBe(false);
  });
});

describe('LegacyApiProvider', () => {
  it('provides api adapter', () => {
    const { result } = renderHook(() => useLegacyApi(), {
      wrapper: ({ children }) => LegacyApiProvider({ children }),
    });

    expect(result.current).toBeDefined();
    expect(result.current.jobs.list).toBeInstanceOf(Function);
    expect(result.current.loading.getState).toBeInstanceOf(Function);
  });

  it('invokes registered toast handler', () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useLegacyToast(), {
      wrapper: ({ children }) => LegacyApiProvider({ children }),
    });

    result.current.setHandler(handler);
    result.current.show({ message: 'Test message', type: 'success', detail: 'Test detail' });

    expect(handler).toHaveBeenCalledWith({
      message: 'Test message',
      type: 'success',
      detail: 'Test detail',
    });
  });

  it('falls back to console when no toast handler', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useLegacyToast(), {
      wrapper: ({ children }) => LegacyApiProvider({ children }),
    });

    result.current.setHandler(null);
    result.current.show({ message: 'Test message', type: 'error' });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
