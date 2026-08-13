// lib/api/authHeaders.ts — Cookie + CSRF double-submit + authorization
// header assembly shared by the InstaEditor API clients. Extracted from
// lib/api/httpClient.ts so the transport module stays focused on URL
// resolution and fetch orchestration.

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

/** Headers required for cookie-authenticated mutating API requests. */
export function getCSRFHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrf_token='))
    ?.slice('csrf_token='.length);
  return token ? { 'X-CSRF-Token': decodeURIComponent(token) } : {};
}

/**
 * Merge session authorization + CSRF double-submit + caller headers, with
 * caller headers winning on key collisions. `extra` mirrors RequestInit's
 * `headers` (plain object in practice), preserving the exact spread the
 * fetch functions used before this extraction.
 */
export function buildAuthHeaders(
  authorization: Record<string, string>,
  extra?: HeadersInit,
): Record<string, string> {
  return { ...authorization, ...getCSRFHeaders(), ...extra } as Record<string, string>;
}
