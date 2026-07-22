import { API_BASE_URL, getCookie } from './client';

const API_V1 = '/api/v1';

const LEGACY_ENDPOINT_MAP: Record<string, string> = {
  '/jobs': `${API_V1}/jobs`,
  '/workers': `${API_V1}/workers`,
  '/workers_status': `${API_V1}/workers/status`,
  '/api/workers_status': `${API_V1}/workers/status`,
  '/api/v1/workers_status': `${API_V1}/workers/status`,
  '/cleanup_queue': `${API_V1}/jobs/queue/cleanup`,
  '/cleanup_processing': `${API_V1}/jobs/processing/cleanup`,
  '/cleanup_processing/': `${API_V1}/jobs/processing/cleanup/`,
};

const NON_V1_ENDPOINTS = [
  '/api/drive/',
  '/api/bundle/',
  '/api/server/',
  '/api/master/',
  '/install_worker/',
];

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function resolveEndpoint(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  if (endpoint.startsWith(API_V1)) {
    return API_BASE_URL + endpoint;
  }

  for (const nonV1 of NON_V1_ENDPOINTS) {
    if (endpoint.startsWith(nonV1)) {
      return API_BASE_URL + endpoint;
    }
  }

  for (const [legacy, mapped] of Object.entries(LEGACY_ENDPOINT_MAP)) {
    if (endpoint === legacy || endpoint.startsWith(legacy)) {
      return API_BASE_URL + endpoint.replace(legacy, mapped);
    }
    const apiLegacy = `/api${legacy}`;
    if (endpoint === apiLegacy || endpoint.startsWith(apiLegacy)) {
      return API_BASE_URL + endpoint.replace(apiLegacy, mapped);
    }
  }

  if (endpoint.startsWith('/api/')) {
    return API_BASE_URL + endpoint.replace('/api/', `${API_V1}/`);
  }

  return API_BASE_URL + `${API_V1}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const RETRY_MULTIPLIER = 2;

function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 429 || error.status === 408;
  }
  return error instanceof Error && error.name !== 'AbortError';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildHeaders(
  method: string,
  customHeaders?: HeadersInit,
  defaults: Record<string, string> = {}
): Record<string, string> {
  const headers = { ...defaults };

  if (MUTATION_METHODS.has(method)) {
    const csrf = getCookie('csrf_token');
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  if (customHeaders) {
    const extra = customHeaders instanceof Headers
      ? Object.fromEntries(customHeaders.entries())
      : (customHeaders as Record<string, string>);
    Object.assign(headers, extra);
  }

  return headers;
}

interface RetryOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

async function executeWithRetry<T>(
  endpoint: string,
  retryOptions: RetryOptions,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const { timeout = 30000, retries = DEFAULT_RETRIES, retryDelay = DEFAULT_RETRY_DELAY } = retryOptions;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fn(controller.signal);
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === retries) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(408, 'Request Timeout', `Request timed out after ${timeout}ms`);
        }
        throw error;
      }

      const delay = retryDelay * Math.pow(RETRY_MULTIPLIER, attempt);
      console.warn(`[API] Retrying ${endpoint} in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError(500, 'Unknown Error');
}

export async function fetchJSON<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout, retries, retryDelay, ...fetchOptions } = options;
  const url = resolveEndpoint(endpoint);
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const headers = buildHeaders(method, fetchOptions.headers, {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  return executeWithRetry(
    endpoint,
    { timeout, retries, retryDelay },
    async (signal) => {
      const response = await fetch(url, {
        ...fetchOptions,
        signal,
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        let message: string | undefined;
        try {
          const body = (await response.json()) as { error?: string; reason?: string };
          if (body?.error && typeof body.error === 'string') message = body.error;
          else if (body?.reason && typeof body.reason === 'string') message = body.reason;
        } catch {
          // non-JSON or empty body
        }
        throw new ApiError(response.status, response.statusText, message);
      }

      return response.json();
    }
  );
}

export async function fetchVoid(endpoint: string, options: RequestOptions = {}): Promise<void> {
  const { timeout, retries, retryDelay, ...fetchOptions } = options;
  const url = resolveEndpoint(endpoint);
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const headers = buildHeaders(method, fetchOptions.headers);

  return executeWithRetry(
    endpoint,
    { timeout, retries, retryDelay },
    async (signal) => {
      const response = await fetch(url, {
        ...fetchOptions,
        signal,
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }
    }
  );
}
