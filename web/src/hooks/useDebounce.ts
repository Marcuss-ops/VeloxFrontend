/**
 * useDebounce Hook
 * 
 * Debounces a value by a specified delay.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for debouncing a value with a specified delay.
 * 
 * Returns a debounced version of the value that only updates after the
 * specified delay has passed without the value changing. Useful for
 * delaying expensive operations like API calls until the user stops typing.
 * 
 * @template T - The type of the value to debounce
 * @param {T} value - The value to debounce
 * @param {number} delay - The delay in milliseconds before updating
 * @returns {T} The debounced value
 * 
 * @example
 * ```typescript
 * // Debounce search input
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * // Use debounced value for API calls
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchAPI(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * 
 * // Debounce form validation
 * const debouncedEmail = useDebounce(email, 500);
 * useEffect(() => {
 *   validateEmail(debouncedEmail);
 * }, [debouncedEmail]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback Hook
 * 
 * Debounces a callback function.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

