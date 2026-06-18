/**
 * Unified API Client for Velox Frontend
 *
 * This is the single entry point for all API calls from the frontend.
 *
 * API Namespaces:
 * - /api/v1/*        Core API (jobs, workers, analytics) - DEFAULT
 * - /api/v1/admin/*  Admin-only API (ansible, etc.) - requires admin token
 * - /api/v2/*        Extended API (queue operations)
 * - /api/drive/*     Google Drive API
 * - /api/youtube/*   YouTube Manager API
 * - /api/bundle/*    Bundle management API
 * - /api/server/*    Server status API
 * - /api/master/*    Master server API
 *
 * Features:
 * - Automatic endpoint resolution and legacy mapping
 * - No hardcoded hosts/ports (same-origin only)
 * - Consistent error handling with ApiError class
 * - Full TypeScript type support
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 */

// API Version prefix - single source of truth
const API_V1 = '/api/v1';

// Legacy endpoint mapping - maps old endpoints to v1 namespace
// These are endpoints that existed before API versioning was introduced
const LEGACY_ENDPOINT_MAP: Record<string, string> = {
  '/jobs': `${API_V1}/jobs`,
  '/workers': `${API_V1}/workers`,
  '/workers_status': `${API_V1}/workers/status`,
  '/api/workers_status': `${API_V1}/workers/status`,
  '/api/v1/workers_status': `${API_V1}/workers/status`, // Canonicalize underscore to slash
  '/cleanup_queue': `${API_V1}/jobs/queue/cleanup`,
  '/cleanup_processing': `${API_V1}/jobs/processing/cleanup`,
  '/cleanup_processing/': `${API_V1}/jobs/processing/cleanup/`,
};

// Endpoints that are NOT under /api/v1/* - these have their own namespace
// and should be kept as-is (different API surface)
const NON_V1_ENDPOINTS = [
  '/api/drive/',         // Google Drive API
  '/api/youtube/',       // YouTube Manager API
  '/api/bundle/',        // Bundle management API
  '/api/server/',        // Server status API
  '/api/master/',        // Master server API
  '/install_worker/',    // Install worker endpoints
];

/**
 * Resolve endpoint URL, applying API versioning
 * 
 * Rules:
 * 1. Already /api/v1/* → keep as-is
 * 2. Non-v1 API endpoints (ansible, drive, youtube, bundle, etc.) → keep as-is
 * 3. Legacy endpoints (/jobs, /workers, etc.) → map to /api/v1/*
 * 4. Endpoints starting with /api/ but not v1 → upgrade to /api/v1/*
 * 5. Bare endpoints → prefix with /api/v1/
 */
function resolveEndpoint(endpoint: string): string {
  // Already versioned with v1
  if (endpoint.startsWith(API_V1)) {
    return endpoint;
  }

  // Non-v1 API endpoints - keep as-is (different API surface)
  for (const nonV1 of NON_V1_ENDPOINTS) {
    if (endpoint.startsWith(nonV1)) {
      return endpoint;
    }
  }

  // Check explicit legacy mapping first
  for (const [legacy, mapped] of Object.entries(LEGACY_ENDPOINT_MAP)) {
    if (endpoint === legacy || endpoint.startsWith(legacy)) {
      return endpoint.replace(legacy, mapped);
    }
    // Also check if endpoint with /api/ prefix matches legacy
    const apiLegacy = `/api${legacy}`;
    if (endpoint === apiLegacy || endpoint.startsWith(apiLegacy)) {
      return endpoint.replace(apiLegacy, mapped);
    }
  }

  // Endpoints with /api/ prefix but not v1 → upgrade to v1
  // e.g., /api/jobs → /api/v1/jobs
  if (endpoint.startsWith('/api/')) {
    return endpoint.replace('/api/', `${API_V1}/`);
  }

  // Bare endpoint → prefix with /api/v1/
  return `${API_V1}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

/**
 * API Error class with status code
 */
/**
 * Custom error class for API responses with HTTP status information.
 * Extends the native Error class to include status code and status text
 * for better error handling in API calls.
 * 
 * @class ApiError
 * @extends {Error}
 * 
 * @example
 * ```typescript
 * try {
 *   await fetchJSON('/api/endpoint');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API Error ${error.status}: ${error.statusText}`);
 *     if (error.status === 404) {
 *       // Handle not found
 *     } else if (error.status >= 500) {
 *       // Handle server error
 *     }
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code (e.g., 404, 500) */
  status: number;
  /** HTTP status text (e.g., "Not Found", "Internal Server Error") */
  statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Request options type
 */
export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Retry configuration
 */
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const RETRY_MULTIPLIER = 2; // Exponential backoff multiplier

/**
 * Check if error is retryable (network errors, 5xx, 429)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Retry on server errors and rate limiting
    return error.status >= 500 || error.status === 429 || error.status === 408;
  }
  // Retry on network errors
  return error instanceof Error && error.name !== 'AbortError';
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make a JSON fetch request with error handling and retry support.
 * 
 * This is the primary function for making API requests from the frontend.
 * It handles endpoint resolution, error handling, timeouts, and automatic
 * retry with exponential backoff for transient failures.
 * 
 * @template T - The expected response type
 * @param {string} endpoint - The API endpoint path (e.g., '/api/v1/jobs')
 * @param {RequestOptions} options - Fetch options with additional retry/timeout config
 * @returns {Promise<T>} The parsed JSON response
 * @throws {ApiError} When the response is not ok or request fails
 * 
 * @example
 * ```typescript
 * // Basic GET request
 * const jobs = await fetchJSON<Job[]>('/api/v1/jobs');
 * 
 * // POST request with body
 * const result = await fetchJSON('/api/v1/jobs', {
 *   method: 'POST',
 *   body: JSON.stringify({ video_name: 'test.mp4' })
 * });
 * 
 * // Request with custom timeout
 * const data = await fetchJSON('/api/v1/analytics', { timeout: 60000 });
 * ```
 */
export async function fetchJSON<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = 30000,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options;
  const url = resolveEndpoint(endpoint);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Admin-Token': 'velox-dev-token',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        let message: string | undefined = undefined;
        try {
          const body = await response.json() as { error?: string; reason?: string };
          if (body?.error && typeof body.error === 'string') message = body.error;
          else if (body?.reason && typeof body.reason === 'string') message = body.reason;
        } catch {
          // non-JSON or empty body
        }
        throw new ApiError(response.status, response.statusText, message);
      }

      return response.json();
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors or last attempt
      if (!isRetryableError(error) || attempt === retries) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(408, 'Request Timeout', `Request timed out after ${timeout}ms`);
        }
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(RETRY_MULTIPLIER, attempt);
      console.warn(`[API] Retrying ${endpoint} in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Should never reach here, but TypeScript needs a return
  throw lastError instanceof Error ? lastError : new ApiError(500, 'Unknown Error');
}

/**
 * Make a fetch request returning void with retry support
 */
export async function fetchVoid(
  endpoint: string,
  options: RequestOptions = {}
): Promise<void> {
  const {
    timeout = 30000,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options;
  const url = resolveEndpoint(endpoint);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }

      return;
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors or last attempt
      if (!isRetryableError(error) || attempt === retries) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(408, 'Request Timeout', `Request timed out after ${timeout}ms`);
        }
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(RETRY_MULTIPLIER, attempt);
      console.warn(`[API] Retrying ${endpoint} in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Should never reach here, but TypeScript needs a return
  throw lastError instanceof Error ? lastError : new ApiError(500, 'Unknown Error');
}
