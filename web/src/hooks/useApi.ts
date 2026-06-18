/**
 * useApi Hook
 * 
 * Generic hook for API calls with loading, error, and data states.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchJSON, ApiError } from '@/lib/api/core';

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  retryCount?: number;
  retryDelay?: number;
  abortable?: boolean;
}

interface UseApiReturn<T, P extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: P) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
  abort: () => void;
}

export function useApi<T, P extends unknown[] = []>(
  fetcher: (signal: AbortSignal | undefined, ...args: P) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T, P> {
  const { immediate = false, onSuccess, onError, retryCount = 0, retryDelay = 1000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      // Cancel any pending request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      let lastError: ApiError | null = null;
      const maxAttempts = retryCount + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await fetcher(abortControllerRef.current?.signal, ...args);
          
          if (mountedRef.current) {
            setData(result);
            setLoading(false);
            onSuccess?.(result);
          }
          
          return result;
        } catch (err) {
          // Ignore aborted requests
          if (err instanceof Error && err.name === 'AbortError') {
            return null;
          }
          
          lastError = err instanceof ApiError 
            ? err 
            : new ApiError(500, 'Unknown Error', String(err));

          // Don't retry on client errors (4xx)
          if (lastError.status >= 400 && lastError.status < 500) {
            break;
          }

          // Wait before retry
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          }
        }
      }

      if (mountedRef.current) {
        setError(lastError);
        setLoading(false);
        onError?.(lastError!);
      }

      return null;
    },
    [fetcher, onSuccess, onError, retryCount, retryDelay]
  );

  // Abort function to cancel pending requests
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as P));
    }
  }, [immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, execute, reset, setData, abort };
}

/**
 * Simplified hook for GET requests with automatic data fetching.
 * 
 * Provides a convenient wrapper around useApi for simple GET requests.
 * Automatically handles loading states, errors, and provides a refetch
 * function for manual refreshes.
 * 
 * @template T - The type of data returned by the API
 * @param {string} endpoint - The API endpoint to fetch from
 * @param {UseApiOptions<T>} options - Configuration options for the hook
 * @returns {UseApiReturn<T, []>} Object containing data, loading state, error, and refetch function
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const { data: jobs, loading, error, refetch } = useFetch<Job[]>('/api/v1/jobs');
 * 
 * // With options
 * const { data: analytics } = useFetch('/api/v1/analytics', {
 *   onSuccess: (data) => console.log('Loaded:', data),
 *   onError: (err) => console.error('Failed:', err)
 * });
 * 
 * // Conditional fetching
 * const { data } = useFetch(enabled ? '/api/v1/data' : '');
 * ```
 */
export function useFetch<T>(
  endpoint: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T, []> {
  return useApi<T, []>(
    (signal) => {
      return fetchJSON<T>(endpoint, {
        signal,
      });
    },
    options
  );
}

/**
 * Hook for mutation operations (POST, PUT, DELETE, PATCH) with abort support.
 * 
 * Provides a convenient way to perform write operations to the API with
 * automatic error handling, loading states, and request cancellation.
 * 
 * @template T - The type of data returned by the API
 * @template V - The type of the request body
 * @param {string} endpoint - The API endpoint to send requests to
 * @param {'POST' | 'PUT' | 'DELETE' | 'PATCH'} method - The HTTP method to use
 * @param {UseApiOptions<T>} options - Configuration options for the hook
 * @returns {UseApiReturn<T, [V]>} Object containing data, loading state, error, and execute function
 * 
 * @example
 * ```typescript
 * // Create a new job
 * const { execute: createJob, loading } = useMutation<Job, CreateJobRequest>('/api/v1/jobs', 'POST');
 * 
 * // Usage in component
 * const handleSubmit = async (data: CreateJobRequest) => {
 *   const result = await createJob(data);
 *   if (result) {
 *     console.log('Job created:', result);
 *   }
 * };
 * 
 * // Update a job
 * const { execute: updateJob } = useMutation<Job, Partial<Job>>('/api/v1/jobs/123', 'PUT');
 * 
 * // Delete a job
 * const { execute: deleteJob } = useMutation<void, void>('/api/v1/jobs/123', 'DELETE');
 * ```
 */
export function useMutation<T, V = unknown>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
  options: UseApiOptions<T> = {}
): UseApiReturn<T, [V]> {
  return useApi<T, [V]>(
    (signal, body: V) => {
      return fetchJSON<T>(endpoint, {
        method,
        body: JSON.stringify(body),
        signal,
      });
    },
    options
  );
}
