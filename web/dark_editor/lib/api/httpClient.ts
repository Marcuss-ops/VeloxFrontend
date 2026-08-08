// HTTP infrastructure for the InstaEditor BFF clients.
//
// Centralises the base URL, CSRF + cookie handling, JSON encoding,
// and the AbortController-backed RequestManager that backs the
// cancel-able `removeBackground` call.
//
// Clients (media / project / preset / folder / drive) import from
// here rather than redefining the same helpers — this is the leaf
// layer of the lib/api/ tree. The barrel in lib/api.ts keeps the
// existing call sites untouched via re-exports.

// ------------------------------------------------------------------
// Base URLs
// ------------------------------------------------------------------

/** Root of the InstaEditor BFF. All endpoints are nested under this. */
export const API_BASE = '/api/v1/editor';

/** Virtual base for the /api/folders family of endpoints. */
export const FOLDERS_API_BASE = `${API_BASE}/api/folders`;

// ------------------------------------------------------------------
// URL helpers
// ------------------------------------------------------------------

/** Prefix a path with API_BASE unless it is already absolute or
 *  already prefixed. Lets clients pass "/api/..." strings that stay
 *  stable if API_BASE ever changes. */
export function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return path.startsWith(API_BASE) ? path : `${API_BASE}${path}`;
}

// ------------------------------------------------------------------
// Cookie helper — shared by the InstaEdit CSRF double-submit scheme.
// Returns '' when running in a non-DOM environment (Vitest/Node).
// ------------------------------------------------------------------

/** Read a cookie by name. */
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

// ------------------------------------------------------------------
// Core fetch with CSRF + JSON error unwrapping
// ------------------------------------------------------------------

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const csrfHeaders: Record<string, string> = {};
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCookie('csrf_token');
    if (csrf) csrfHeaders['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    method,
    headers: {
      ...csrfHeaders,
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json();
}

export async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}

export async function apiUpload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'POST', body: formData });
}

// ------------------------------------------------------------------
// RequestManager — AbortController pool indexed by a caller-supplied
// key. Used by mediaClient.removeBackground to cancel in-flight jobs
// when a new request for the same filename arrives.
// ------------------------------------------------------------------

// Request Manager to handle AbortControllers for concurrent requests
export class RequestManager {
  private controllers = new Map<string, AbortController>();

  getSignal(key: string): AbortSignal {
    if (this.controllers.has(key)) {
      this.controllers.get(key)!.abort();
    }
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  clear(key: string) {
    this.controllers.delete(key);
  }
}

// Singleton — kept stable across module boundaries so the
// AbortController state of in-flight background-removal tasks
// survives HMR + module reload.
export const requestManager = new RequestManager();
