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

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const JITTER_FACTOR = 0.25;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_RETRY_AFTER_MS = 300000; // 5 minutes

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
  retryAfter?: number;

  constructor(status: number, statusText: string, message?: string, retryAfter?: number) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.retryAfter = retryAfter;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  /**
   * When true, the request will be retried even if the HTTP method is not
   * considered idempotent by default. When false, retries are disabled.
   */
  idempotent?: boolean;
  /**
   * Request body. If a function is provided, it is called before each
   * attempt so the body can be reconstructed between retries.
   */
  body?: BodyInit | null | (() => BodyInit | null);
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const RETRY_MULTIPLIER = 2;

function isIdempotentMethod(method: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase());
}

function isRetryableError(error: unknown, allowRetry: boolean): boolean {
  if (!allowRetry) {
    return false;
  }
  if (error instanceof ApiError) {
    return RETRYABLE_STATUSES.has(error.status);
  }
  // Non-Abort network errors are retried only for idempotent requests.
  return error instanceof Error && error.name !== 'AbortError';
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();

  // Retry-After can be a delay in seconds (e.g. "120").
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }

  // Retry-After can also be an HTTP date (e.g. "Wed, 21 Oct 2025 07:28:00 GMT").
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const seconds = Math.ceil((dateMs - Date.now()) / 1000);
    return seconds >= 0 ? seconds : 0;
  }

  return undefined;
}

function addJitter(delay: number, cap?: number): number {
  // Add +/- JITTER_FACTOR * delay jitter so retries don't thunder herd.
  const jitter = (Math.random() - 0.5) * 2 * JITTER_FACTOR * delay;
  const value = Math.max(0, delay + jitter);
  return cap !== undefined ? Math.min(cap, value) : value;
}

function calculateDelay(attempt: number, baseDelay: number, retryAfter?: number): number {
  if (retryAfter !== undefined) {
    // Honor the server's Retry-After (capped to avoid blocking the UI forever).
    const delay = Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS);
    return addJitter(delay, MAX_RETRY_AFTER_MS);
  }
  // Exponential backoff, capped to avoid unbounded waits.
  const delay = baseDelay * Math.pow(RETRY_MULTIPLIER, attempt);
  return addJitter(delay, MAX_RETRY_DELAY_MS);
}

function cloneBody(body: BodyInit | null | undefined): BodyInit | null {
  if (body === null || body === undefined) {
    return null;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof FormData) {
    const clone = new FormData();
    for (const [key, value] of body.entries()) {
      clone.append(key, value);
    }
    return clone;
  }
  if (body instanceof URLSearchParams) {
    return new URLSearchParams(body);
  }
  if (body instanceof Blob) {
    return body.slice();
  }
  if (body instanceof ArrayBuffer) {
    return body.slice(0);
  }
  if (ArrayBuffer.isView(body)) {
    if (body instanceof DataView) {
      return new DataView(body.buffer.slice(0));
    }
    return (body as Uint8Array).slice();
  }
  return body;
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
  idempotent?: boolean;
}

async function executeWithRetry<T>(
  endpoint: string,
  method: string,
  retryOptions: RetryOptions,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const {
    timeout = 30000,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    idempotent,
  } = retryOptions;
  const allowRetry = idempotent ?? isIdempotentMethod(method);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fn(controller.signal);
    } catch (error) {
      lastError = error;

      let currentError: unknown = error;
      if (currentError instanceof Error && currentError.name === 'AbortError') {
        currentError = new ApiError(408, 'Request Timeout', `Request timed out after ${timeout}ms`);
      }
      lastError = currentError;

      if (!isRetryableError(currentError, allowRetry) || attempt === retries) {
        throw currentError instanceof Error ? currentError : new ApiError(500, 'Unknown Error');
      }

      const retryAfter = currentError instanceof ApiError ? currentError.retryAfter : undefined;
      const delay = calculateDelay(attempt, retryDelay, retryAfter);
      console.warn(`[API] Retrying ${endpoint} in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError(500, 'Unknown Error');
}

export async function fetchJSON<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout, retries, retryDelay, idempotent, ...fetchOptions } = options;
  const url = resolveEndpoint(endpoint);
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const headers = buildHeaders(method, fetchOptions.headers, {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  return executeWithRetry(
    endpoint,
    method,
    { timeout, retries, retryDelay, idempotent },
    async (signal) => {
      const { body: rawBody, ...rest } = fetchOptions;
      const resolvedBody = typeof rawBody === 'function'
        ? (rawBody as () => BodyInit | null)()
        : rawBody;
      const body = cloneBody(resolvedBody);
      const response = await fetch(url, {
        ...rest,
        body,
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
        const retryAfter = parseRetryAfter(response.headers?.get?.('Retry-After'));
        throw new ApiError(response.status, response.statusText, message, retryAfter);
      }

      return response.json();
    }
  );
}

export async function fetchVoid(endpoint: string, options: RequestOptions = {}): Promise<void> {
  const { timeout, retries, retryDelay, idempotent, ...fetchOptions } = options;
  const url = resolveEndpoint(endpoint);
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const headers = buildHeaders(method, fetchOptions.headers);

  return executeWithRetry(
    endpoint,
    method,
    { timeout, retries, retryDelay, idempotent },
    async (signal) => {
      const { body: rawBody, ...rest } = fetchOptions;
      const resolvedBody = typeof rawBody === 'function'
        ? (rawBody as () => BodyInit | null)()
        : rawBody;
      const body = cloneBody(resolvedBody);
      const response = await fetch(url, {
        ...rest,
        body,
        signal,
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers?.get?.('Retry-After'));
        throw new ApiError(response.status, response.statusText, undefined, retryAfter);
      }
    }
  );
}
