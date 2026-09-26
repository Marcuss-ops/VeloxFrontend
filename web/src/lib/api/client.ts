/**
 * Session-aware API client for the InstaEdit BFF — the single request
 * engine for every API module. This module folded in the former core.ts
 * (retry engine, legacy URL mapping, fetchJSON/fetchVoid) so there is
 * exactly one transport path and one ApiError identity.
 *
 * Transport contract:
 *   1. credentials: 'include' on every request so the HttpOnly session
 *      cookie is sent cross-origin to api.instaedit.org.
 *   2. X-CSRF-Token header automatically attached to every mutation
 *      (POST/PUT/PATCH/DELETE) from the csrf_token cookie set by the
 *      BFF. The cookie is NOT HttpOnly so JS can read it; the server
 *      verifies header === cookie.
 *   3. Idempotent requests are retried with exponential backoff + jitter
 *      honoring Retry-After; mutations are never auto-retried unless the
 *      caller marks them idempotent.
 *   4. A 401 triggers exactly one session-refresh + replay before the
 *      retry engine sees the response (withSessionRefresh).
 *
 * NO hardcoded tokens. The browser must never carry VELOX_API_TOKEN,
 * OAuth tokens, or any administrative secret. Authentication is
 * exclusively via the session cookie + CSRF double-submit pattern.
 *
 * Base URL resolution:
 *   - VITE_API_BASE_URL env var (production: https://api.instaedit.org)
 *   - Defaults to '' (same-origin) in dev where the Vite proxy
 *     forwards /api/* to the InstaEdit BFF on localhost:8080.
 *   - Legacy endpoint shapes (/jobs, /cleanup_queue, /api/drive/...)
 *     are mapped to their canonical /api/v1 equivalents by
 *     resolveUrl, preserving the pre-migration call sites.
 */

import { withSessionRefresh } from '../session-refresh';

/** Base URL prefix for all API calls. Empty string = same-origin. */
export const API_BASE_URL: string =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');

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

/**
 * Read a cookie value by name. Returns '' when the cookie is absent.
 * Used to extract the csrf_token cookie for the X-CSRF-Token header.
 */
export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = name + '=';
  const entries = document.cookie.split(';');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return '';
}

/** HTTP methods that require CSRF protection (double-submit cookie). */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Methods considered safe to auto-retry. */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const RETRY_MULTIPLIER = 2;
const JITTER_FACTOR = 0.25;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_RETRY_AFTER_MS = 300000; // 5 minutes

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

/**
 * Resolve an endpoint against API_BASE_URL, applying legacy URL mapping.
 * Absolute URLs (http:// / https://) pass through untouched.
 */
export function resolveUrl(endpoint: string): string {
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

/**
 * Unified request options. The retry fields come from the folded-in
 * core.ts engine; `headers` keeps the HeadersInit shape client.ts
 * callers already use; `csrfToken` overrides the cookie lookup
 * (testing only). `body` may be a function, re-invoked per attempt so
 * streamable bodies can be reconstructed between retries.
 */
export interface ClientOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: HeadersInit;
  /** Override the CSRF token (skip cookie lookup). Testing only. */
  csrfToken?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  /**
   * When true, the request is retried even for non-idempotent methods.
   * When false, retries are disabled entirely.
   */
  idempotent?: boolean;
  body?: BodyInit | null | (() => BodyInit | null);
}

/**
 * Build the full request headers. For mutations, the X-CSRF-Token
 * header is populated from the csrf_token cookie. Callers can
 * override any header via the headers option.
 */
function buildHeaders(
  method: string,
  extra?: HeadersInit,
  csrfToken?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const isMutation = MUTATION_METHODS.has(method.toUpperCase());
  if (isMutation) {
    const token = csrfToken ?? getCookie('csrf_token');
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  if (extra) {
    const merged = extra instanceof Headers
      ? Object.fromEntries(extra.entries())
      : extra as Record<string, string>;
    Object.assign(headers, merged);
  }
  return headers;
}

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
  fn: (signal: AbortSignal, attempt: number) => Promise<T>,
  callerSignal?: AbortSignal
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
      return await fn(controller.signal, attempt);
    } catch (error) {
      // Consumer cancellation (React Query unmount / period switch) is
      // NOT transient: rethrow the raw AbortError immediately, never
      // retried and never converted to a 408. Only the engine's own
      // timeout abort (which surfaces as an ApiError(408) below) is
      // retry-eligible.
      if (
        error instanceof Error &&
        error.name === 'AbortError' &&
        callerSignal && callerSignal.aborted
      ) {
        throw error;
      }

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

/** Extract a human-readable message from an error response body. */
async function extractErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: string; reason?: string };
    if (body?.error && typeof body.error === 'string') return body.error;
    if (body?.reason && typeof body.reason === 'string') return body.reason;
  } catch {
    // non-JSON or empty body
  }
  return undefined;
}

/**
 * Perform a JSON fetch with session credentials, CSRF, legacy URL
 * resolution, and the retry engine. This is the canonical request
 * path shared by the apiGet/apiPost/... verbs and the fetchJSON/
 * fetchVoid legacy signatures (now merged — there is one engine).
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ClientOptions = {}
): Promise<T> {
  const { csrfToken, headers, timeout, retries, retryDelay, idempotent, ...fetchOpts } = options;
  const url = resolveUrl(endpoint);
  const method = (fetchOpts.method ?? 'GET').toUpperCase();
  const finalHeaders = buildHeaders(method, headers, csrfToken);

  // Set Content-Type for requests with a body unless the caller set one
  // (FormData bodies must keep their auto-generated multipart boundary).
  const hasBody = fetchOpts.body !== undefined && fetchOpts.body !== null;
  if (hasBody && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  // RequestInit['signal'] is `AbortSignal | null | undefined`; normalize null
  // so the engine's `AbortSignal | undefined` contract holds.
  const callerSignal = fetchOpts.signal ?? undefined;

  return executeWithRetry(
    endpoint,
    method,
    { timeout, retries, retryDelay, idempotent },
    async (signal, attempt) => {
      const { body: rawBody, signal: _consumerSignal, ...rest } = fetchOpts;
      const resolvedBody = typeof rawBody === 'function'
        ? (rawBody as () => BodyInit | null)()
        : rawBody;
      // Clone only for retries: attempt 0 can consume the caller's body
      // directly (FormData/Blob/ArrayBuffer inputs are re-readable by
      // fetch), so large uploads no longer pay a full multipart copy on
      // the happy path. undefined → null keeps the historical wire shape.
      const body = attempt === 0 ? (resolvedBody ?? null) : cloneBody(resolvedBody);

      // Caller-provided signal wins: when the consumer passes one (React
      // Query cancellation), forward it EXACTLY to fetch — cancellation
      // must abort the caller's signal object identity and rethrow the
      // raw AbortError with no retry (see executeWithRetry). The engine's
      // timeout signal is used only when the caller did not supply one.
      const wireSignal = callerSignal ?? signal;

      // Wrap with session-refresh: on 401, rotate the refresh cookie and
      // retry the request exactly once before falling through to retry logic.
      const doFetch = () => fetch(url, {
        ...rest,
        signal: wireSignal,
        body,
        method,
        credentials: 'include',
        headers: finalHeaders,
      });
      const response = await withSessionRefresh(doFetch);

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        const retryAfter = parseRetryAfter(response.headers?.get?.('Retry-After'));
        // Mirror core.ts exactly: statusText verbatim (fetchJSON's historical
        // shape). Callers matching on `HTTP <status>` messages rely on the
        // default-message form, not this path.
        throw new ApiError(response.status, response.statusText, message, retryAfter);
      }

      // 204 No Content — nothing to parse.
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    },
    callerSignal
  );
}

/**
 * fetchJSON — retained signature from the folded-in core.ts. Now a thin
 * alias over the single apiFetch engine (legacy URL mapping and JSON
 * parsing included).
 */
export async function fetchJSON<T>(endpoint: string, options: ClientOptions = {}): Promise<T> {
  return apiFetch<T>(endpoint, options);
}

/**
 * fetchVoid — retained signature from the folded-in core.ts. Identical
 * transport contract but tolerant of empty response bodies.
 */
export async function fetchVoid(endpoint: string, options: ClientOptions = {}): Promise<void> {
  const { csrfToken, headers, timeout, retries, retryDelay, idempotent, ...fetchOpts } = options;
  const url = resolveUrl(endpoint);
  const method = (fetchOpts.method ?? 'GET').toUpperCase();
  const finalHeaders = buildHeaders(method, headers, csrfToken);

  const hasBody = fetchOpts.body !== undefined && fetchOpts.body !== null;
  if (hasBody && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  // RequestInit['signal'] is `AbortSignal | null | undefined`; normalize null
  // so the engine's `AbortSignal | undefined` contract holds.
  const callerSignal = fetchOpts.signal ?? undefined;

  return executeWithRetry(
    endpoint,
    method,
    { timeout, retries, retryDelay, idempotent },
    async (signal, attempt) => {
      const { body: rawBody, signal: _consumerSignal, ...rest } = fetchOpts;
      const resolvedBody = typeof rawBody === 'function'
        ? (rawBody as () => BodyInit | null)()
        : rawBody;
      // Same clone-only-on-retry rule as apiFetch (see comment there).
      const body = attempt === 0 ? (resolvedBody ?? null) : cloneBody(resolvedBody);

      // Same caller-signal rule as apiFetch: forward the consumer's signal
      // object exactly; no retry on consumer cancellation.
      const wireSignal = callerSignal ?? signal;

      const doFetch = () => fetch(url, {
        ...rest,
        body,
        signal: wireSignal,
        method,
        credentials: 'include',
        headers: finalHeaders,
      });
      const response = await withSessionRefresh(doFetch);

      if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers?.get?.('Retry-After'));
        throw new ApiError(response.status, response.statusText, undefined, retryAfter);
      }
    },
    callerSignal
  );
}

// --- Convenience verbs --------------------------------------------------

export function apiGet<T>(endpoint: string, options?: ClientOptions): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'GET' });
}

export function apiPost<T>(
  endpoint: string,
  body?: unknown,
  options?: ClientOptions
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(
  endpoint: string,
  body?: unknown,
  options?: ClientOptions
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(
  endpoint: string,
  body?: unknown,
  options?: ClientOptions
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(
  endpoint: string,
  options?: ClientOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'DELETE' });
}
