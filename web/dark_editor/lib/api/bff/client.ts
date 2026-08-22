// Shared BFF HTTP infrastructure for the InstaEditor: the CSRF-aware JSON
// fetch, the cookie reader, upload-presign hashing and the short-poll timing
// constants. Extracted from lib/api/bff/types.ts so that module can stay a
// pure type-only leaf with zero outbound imports.
//
//   types.ts  ← pure wire-type contract (no runtime code)
//   client.ts ← this file (runtime helpers imported by the domain modules)
//   auth / youtube / projects / upload / socialDestinations / broadcast

import { editorAuthorizationHeaders } from '../../editor-session';
import { editorRuntimePath } from '../../editor-runtime';

/** Same-origin; production deployments should host the editor under the BFF domain. */
export const BFF_BASE = '';

/** Read a cookie by name. Returns '' outside the DOM (Node / Vitest). */
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

/** CSRF-aware JSON fetch. Honours same-origin session cookie + CSRF double-submit. */
export async function bffFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
    if (!headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const rawEndpoint = `${BFF_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  // Node-side callers (tests and server utilities) exercise the public API
  // contract without the reverse-proxy compatibility prefix. Browser calls
  // retain the deployed /instaeditor boundary.
  const url = typeof window === 'undefined' ? rawEndpoint : editorRuntimePath(rawEndpoint);
  const projectMatch = endpoint.match(/\/by-project\/([^/?]+)/);
  const projectId = projectMatch ? decodeURIComponent(projectMatch[1]) : undefined;
  // Group catalogs and media previews do not contain a `by-project` segment,
  // but they still run inside the same editor launch session. Resolve the
  // current project from the editor URL when no explicit project id exists;
  // otherwise anonymous editor tabs receive a 401 for video/cover previews.
  const authorization = typeof window === 'undefined'
    ? {}
    : await editorAuthorizationHeaders(projectId);
  const response = await fetch(url, {
    ...options,
    method,
    headers: { ...headers, ...authorization },
    credentials: 'include',
  });

  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string; reason?: string };
      if (body?.error && typeof body.error === 'string') message = body.error;
      else if (body?.reason && typeof body.reason === 'string') message = body.reason;
    } catch {
      // ignore
    }
    throw new Error(message ?? response.statusText ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

/** POST helper. Thin wrapper that picks up CSRF + Content-Type from bffFetch. */
export function bffPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return bffFetch<T>(endpoint, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** SHA-256 hash of a Blob as lowercase hex (used by upload-presign). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 5-second cadence for the post-publish short-poll loop. */
export const POLL_INTERVAL_MS = 5_000;

/** 6 × 5s = 30-second total cap on the drift-reconciler wait. */
export const POLL_MAX_ATTEMPTS = 6;
