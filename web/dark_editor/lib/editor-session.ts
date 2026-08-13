import { editorRuntimePath, INSTAEDIT_API_URL } from './editor-runtime';

/**
 * Thrown when the InstaEdit session cannot authenticate the editor
 * (launch mint or exchange returned 401). The session gate maps this
 * to its 'unauthorized' state so the editor hands the user back to the
 * Copertine hub instead of showing a dead-end error screen.
 */
export class EditorUnauthorizedError extends Error {
  constructor(message = 'Sessione InstaEdit scaduta. Riapri il progetto da InstaEdit.') {
    super(message);
    this.name = 'EditorUnauthorizedError';
  }
}

// In-memory session cache, keyed by project id. Unlike the module-global
// singletons this replaces, the cache (a) keeps the token's expiry so a
// bearer is never reused after it dies, and (b) allows concurrent editor
// opens for DIFFERENT projects without one exchange clobbering the other.
//
// Note: the token IS persisted to sessionStorage (storeSession) so a refresh
// of the editor tab can resume without re-minting; the in-memory cache is
// only a faster path on top of that storage.
const sessionCache = new Map<string, StoredSession>();

// In-flight launch/exchange promises, keyed by project id. Two concurrent
// requests for the SAME project share one exchange; requests for different
// projects run independently instead of one hijacking the other's promise.
const inFlightExchanges = new Map<string, Promise<string>>();

const SESSION_STORAGE_PREFIX = 'instaeditor:session:';

// Grace window (30s) applied before the declared expiry: a token closer to
// its deadline than this is treated as stale so the next request re-mints
// instead of racing an expiring bearer through the wire.
const EXPIRY_GRACE_MS = 30_000;

type StoredSession = {
  token: string;
  expiresAt?: number;
};

/** True when the session is still usable for the next request. */
function isSessionFresh(session: StoredSession): boolean {
  return Boolean(session.token) && (!session.expiresAt || session.expiresAt > Date.now() + EXPIRY_GRACE_MS);
}

function launchTokenFromFragment(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('launch_token')?.trim() ?? '';
}

function clearLaunchFragment(): void {
  if (typeof window === 'undefined' || !window.location.hash) return;
  window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`);
}

function projectIdFromPath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.split('/').filter(Boolean).pop() ?? '';
}

function readStoredSession(projectId: string): StoredSession | null {
  if (typeof window === 'undefined' || !window.sessionStorage || !projectId) return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${projectId}`);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSession;
    if (!isSessionFresh(stored)) {
      window.sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${projectId}`);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

function storeSession(projectId: string, token: string, expiresAt?: number): void {
  if (typeof window === 'undefined' || !window.sessionStorage || !projectId) return;
  try {
    window.sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${projectId}`, JSON.stringify({ token, expiresAt } satisfies StoredSession));
  } catch {
    // Private browsing/storage quotas must not prevent the editor from opening.
  }
}

async function mintLaunchToken(projectId: string): Promise<string> {
  const csrfToken = typeof document !== 'undefined'
    ? document.cookie.split('; ').find((cookie) => cookie.startsWith('csrf_token='))?.slice('csrf_token='.length)
    : undefined;
  const response = await fetch(`${INSTAEDIT_API_URL}/api/v1/editor/launch`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': decodeURIComponent(csrfToken) } : {}),
    },
    body: JSON.stringify({ project_id: projectId }),
  });
  const payload = await response.json().catch(() => ({})) as { launch_token?: string; error?: string };
  if (!response.ok || !payload.launch_token) {
    if (response.status === 401) throw new EditorUnauthorizedError();
    throw new Error(payload.error || 'Editor launch non disponibile. Apri il progetto da InstaEdit.');
  }
  return payload.launch_token;
}

/** Exchange the one-time fragment token for an in-memory editor session token. */
export function ensureEditorSessionToken(projectIdOverride?: string): Promise<string> {
  const pathProjectId = projectIdFromPath();
  const projectId = pathProjectId || projectIdOverride || '';
  if (!projectId) {
    return Promise.reject(new Error('Editor project non disponibile.'));
  }
  // API helpers and unit-level consumers may provide an explicit project
  // id outside the editor route. The real editor always has a project id in
  // its pathname, so this branch avoids trying to mint a second launch token
  // for a non-editor page while preserving the request's cookie auth.
  if (!pathProjectId && projectIdOverride) return Promise.resolve('');

  // Fresh in-memory token for this project → reuse it (expiry-aware).
  const cached = sessionCache.get(projectId);
  if (cached && isSessionFresh(cached)) return Promise.resolve(cached.token);
  if (cached) sessionCache.delete(projectId);

  // Another request for the SAME project is already exchanging → share it.
  // (Different projects exchange independently — no more cross-project
  // hijacking of a single module-global promise.)
  const inFlight = inFlightExchanges.get(projectId);
  if (inFlight) return inFlight;

  const stored = readStoredSession(projectId);
  if (stored) {
    sessionCache.set(projectId, stored);
    return Promise.resolve(stored.token);
  }

  // Normal navigation supplies a one-time fragment. If the user refreshes
  // the editor or opens its URL directly, re-mint through the authenticated
  // BFF instead of failing with the misleading "misconfigured" message.
  const exchange = (async () => {
    const launchToken = launchTokenFromFragment() || await mintLaunchToken(projectId);
    const response = await fetch(editorRuntimePath('api/v1/editor/launch/exchange'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ launch_token: launchToken, project_id: projectId }),
    });
    const payload = await response.json().catch(() => ({})) as { launch_token?: string; expires_at?: number; error?: string };
    if (!response.ok || !payload.launch_token) {
      if (response.status === 401) throw new EditorUnauthorizedError();
      throw new Error(payload.error || 'Editor sessione non disponibile. Riapri il progetto da InstaEdit.');
    }
    const session: StoredSession = {
      token: payload.launch_token,
      expiresAt: payload.expires_at ? payload.expires_at * 1000 : undefined,
    };
    sessionCache.set(projectId, session);
    storeSession(projectId, session.token, session.expiresAt);
    clearLaunchFragment();
    return session.token;
  })().finally(() => {
    inFlightExchanges.delete(projectId);
  });

  inFlightExchanges.set(projectId, exchange);
  return exchange;
}

/** Return the in-memory session bearer, exchanging the launch fragment if needed. */
export async function editorAuthorizationHeaders(projectIdOverride?: string): Promise<Record<string, string>> {
  const token = await ensureEditorSessionToken(projectIdOverride);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Test/reset seam. Clears the in-memory cache and any in-flight exchanges;
 * sessionStorage entries (the persisted copy) are left untouched — call
 * clearEditorSession to wipe those too.
 */
export function resetEditorSessionToken(): void {
  sessionCache.clear();
  inFlightExchanges.clear();
}

/**
 * Wipes the stored editor session (in-memory + sessionStorage) after a
 * 401 so a stale bearer never gets reused by a later open in the same
 * tab. With no projectId, every `instaeditor:session:*` entry is cleared.
 */
export function clearEditorSession(projectId?: string): void {
  resetEditorSessionToken();
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  if (projectId) {
    window.sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${projectId}`);
    return;
  }
  const keys: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(SESSION_STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) window.sessionStorage.removeItem(key);
}
