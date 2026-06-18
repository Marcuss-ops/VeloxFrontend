/**
 * useDebouncedValue Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue, useDebouncedCallback } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    );

    expect(result.current).toBe('first');

    // Update value
    rerender({ value: 'second' });
    
    // Should still be first value (not debounced yet)
    expect(result.current).toBe('first');

    // Advance timer partially
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // Still first
    expect(result.current).toBe('first');

    // Complete debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('second');
  });

  it('should reset debounce on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } }
    );

    // Rapid updates
    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'c' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should still be 'a' because debounce reset
    expect(result.current).toBe('a');

    // Complete debounce from 'c'
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('c');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });
    
    act(() => {
      vi.advanceTimersByTime(299);
    });
    
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe('second');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call multiple times rapidly
    result.current('a');
    result.current('b');
    result.current('c');

    // Should not have executed yet
    expect(callback).not.toHaveBeenCalled();

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should execute only once with last value
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });

  it('should cleanup on unmount', () => {
    const callback = vi.fn();
    const { unmount, result } = renderHook(() => useDebouncedCallback(callback, 300));

    result.current('test');
    
    // Unmount before debounce completes
    unmount();

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not execute after unmount
    expect(callback).not.toHaveBeenCalled();
  });
});
