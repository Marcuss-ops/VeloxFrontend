// HTTP infrastructure for the InstaEditor API clients.
//
// Centralises the runtime base URL, the JWT/session authorization headers,
// CSRF + cookie handling, JSON encoding and the typed request helpers.
// The AbortController-backed RequestManager (cancel-able `removeBackground`)
// lives in lib/api/requestManager.ts and is re-exported here for back-compat.
//
// Clients (media / project / drive / folder / preset / translation)
// import from here rather than redefining the same helpers — this is the
// leaf layer of the lib/api/ tree. The barrel in lib/api.ts keeps the
// existing `@/lib/api` call sites untouched via re-exports.

import { editorAuthorizationHeaders } from '@/lib/editor-session';
import { editorBffPath, editorRuntimePath } from '@/lib/editor-runtime';
import { isImageProxyHost } from '@/lib/image-proxy-allowlist';
import { buildAuthHeaders } from './authHeaders';

// ------------------------------------------------------------------
// Base URLs
// ------------------------------------------------------------------

/** Root of the InstaEditor runtime. All API endpoints are nested under it. */
export const API_BASE = editorRuntimePath('');

/** Virtual base for the /api/folders family of endpoints. */
export const FOLDERS_API_BASE = `${API_BASE}/api/folders`;

// ------------------------------------------------------------------
// URL helpers
// ------------------------------------------------------------------

/** Prefix a path with API_BASE unless it is already absolute or already
 *  prefixed. Lets clients pass "/api/..." strings that stay stable if
 *  API_BASE ever changes. */
export function buildUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith(API_BASE)) return path;
  return `${API_BASE}${path.replace(/^\/+/, '')}`;
}

// ------------------------------------------------------------------
// Cookie + CSRF helpers live in lib/api/authHeaders.ts; re-exported here
// so the legacy `./httpClient` and `@/lib/api` surfaces stay intact.
// ------------------------------------------------------------------

export { getCookie, getCSRFHeaders } from './authHeaders';

// ------------------------------------------------------------------
// Core fetch — JWT/session authorization + CSRF + credentials
// ------------------------------------------------------------------

/**
 * Fetch against the InstaEditor runtime, decorating the request with the
 * editor session authorization header, CSRF double-submit and cookies.
 * Does NOT throw on !ok — callers decide how to surface the failure.
 */
export async function editorFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const authorization = await editorAuthorizationHeaders();
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: buildAuthHeaders(authorization, init.headers),
  });
}

/**
 * Fetch against the project-scoped InstaEditor BFF (used by ve_* sessions
 * where the document lives in the InstaEdit backend, not the local
 * project catalog).
 */
export async function editorProjectFetch(projectId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const authorization = await editorAuthorizationHeaders(projectId);
  return fetch(editorBffPath(path), {
    ...init,
    credentials: 'include',
    headers: buildAuthHeaders(authorization, init.headers),
  });
}

/** Resolve URLs returned by the editor API to browser-loadable asset URLs. */
export function resolveEditorAssetUrl(value: string | undefined): string {
  if (!value) return '';
  if (/^https?:/i.test(value)) return editorImageProxyUrl(value);
  if (/^(data:|blob:)/i.test(value)) return value;
  if (value.startsWith(`${API_BASE}/`)) return value;
  if (value.startsWith('/')) return value;
  // The editor upload APIs return temp/<filename>; the runtime helper resolves
  // it against the current deployment boundary.
  if (value.startsWith('temp/')) return `${API_BASE}/api/${value}`;
  return `${API_BASE}/${value.replace(/^\/+/, '')}`;
}

/**
 * YouTube's thumbnail CDN does not expose CORS headers. Route those images
 * through the editor origin before Konva draws them, otherwise the canvas is
 * tainted and both preview/export and filters fail.
 */
export function editorImageProxyUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    // Mirrors the server-side allowlist (lib/image-proxy-allowlist.ts):
    // only hosts the proxy route accepts are wrapped, so a proxy-wrapped
    // URL can never be 403'd by the server.
    if (!isImageProxyHost(hostname)) {
      return value;
    }
    return editorRuntimePath(`api/image-proxy?url=${encodeURIComponent(parsed.toString())}`);
  } catch {
    return value;
  }
}

// ------------------------------------------------------------------
// Typed request helpers (JSON in/out + error unwrapping) built on top
// of editorFetch. Used by the domain clients.
// ------------------------------------------------------------------

async function unwrapError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data = await response.json();
    message = data?.error || fallback;
  } catch {
    message = response.statusText || fallback;
  }
  throw new Error(message);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await editorFetch(buildUrl(path), options);
  if (!response.ok) await unwrapError(response, 'Request failed');
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
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}

/** POST with a FormData body (no Content-Type — the browser sets the boundary). */
export async function apiUpload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'POST', body: formData });
}

// ------------------------------------------------------------------
// RequestManager — AbortController pool for cancel-able requests
// (mediaClient.removeBackground). Extracted to lib/api/requestManager.ts;
// re-exported here so the existing `./httpClient` and `@/lib/api`
// import surfaces stay intact.
// ------------------------------------------------------------------

export { RequestManager, requestManager } from './requestManager';
