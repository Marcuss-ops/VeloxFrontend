/**
 * Session-aware API client for the InstaEdit BFF.
 *
 * This is the base layer for all new API modules (authApi, socialApi,
 * veloxApi, projectsApi, deliveriesApi). It differs from the legacy
 * core.ts in two key ways:
 *
 *   1. credentials: 'include' on every request so the HttpOnly
 *      session cookie is sent cross-origin to api.instaedit.org.
 *   2. X-CSRF-Token header automatically attached to every
 *      mutation (POST/PUT/PATCH/DELETE) by reading the csrf_token
 *      cookie set by the BFF. The cookie is NOT HttpOnly so JS
 *      can read it; the server verifies header === cookie.
 *
 * NO hardcoded tokens. The browser must never carry VELOX_API_TOKEN,
 * OAuth tokens, or any administrative secret. Authentication is
 * exclusively via the session cookie + CSRF double-submit pattern.
 *
 * Base URL resolution:
 *   - VITE_API_BASE_URL env var (production: https://api.instaedit.org)
 *   - Defaults to '' (same-origin) in dev where the Vite proxy
 *     forwards /api/* to the InstaEdit BFF on localhost:8080.
 */

/** Base URL prefix for all API calls. Empty string = same-origin. */
export const API_BASE_URL: string =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');

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

/**
 * Build the full request headers. For mutations, the X-CSRF-Token
 * header is populated from the csrf_token cookie. Callers can
 * override any header via the headers option.
 */
function buildHeaders(
  method: string,
  extra?: HeadersInit
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (MUTATION_METHODS.has(method.toUpperCase())) {
    const token = getCookie('csrf_token');
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

/**
 * Resolve an endpoint path against API_BASE_URL. Absolute URLs
 * (starting with http:// or https://) are returned as-is. Relative
 * paths are prefixed with API_BASE_URL.
 */
function resolveUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return API_BASE_URL + path;
}

/** Options shared by all client functions. */
export interface ClientOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
  /** Override the CSRF token (skip cookie lookup). Testing only. */
  csrfToken?: string;
}

/**
 * Perform a JSON fetch with session credentials and CSRF.
 *
 * Unlike the legacy fetchJSON, this function does NOT retry —
 * retry policy belongs in the caller (React Query, useApi hook)
 * so mutations are never silently retried.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ClientOptions = {}
): Promise<T> {
  const { csrfToken, headers, ...fetchOpts } = options;
  const method = (fetchOpts.method ?? 'GET').toUpperCase();

  const finalHeaders = buildHeaders(method, headers);
  if (csrfToken !== undefined) {
    finalHeaders['X-CSRF-Token'] = csrfToken;
  }

  // CSRF double-submit: if the cookie is missing for a mutation, we still send
  // the request so the BFF can return a canonical 401/403 that the AuthProvider
  // can turn into a login redirect. We only warn in development to avoid
  // leaking endpoint information in production consoles.
  if (import.meta.env.DEV && MUTATION_METHODS.has(method) && !finalHeaders['X-CSRF-Token']) {
    // eslint-disable-next-line no-console
    console.warn(`[API] Missing csrf_token cookie for ${method} ${endpoint}`);
  }
  // Set Content-Type for requests with a body
  if (fetchOpts.body && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(resolveUrl(endpoint), {
    ...fetchOpts,
    method,
    headers: finalHeaders,
    credentials: 'include',
  });

  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = await response.json() as { error?: string; reason?: string };
      if (body?.error && typeof body.error === 'string') message = body.error;
      else if (body?.reason && typeof body.reason === 'string') message = body.reason;
    } catch {
      // non-JSON or empty body
    }
    const statusText = response.statusText || `HTTP ${response.status}`;
    throw new ApiError(response.status, statusText, message ?? statusText);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * API error class with HTTP status. Mirrors the legacy core.ts
 * ApiError so callers can use instanceof ApiError uniformly.
 */
export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message ?? `HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
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
