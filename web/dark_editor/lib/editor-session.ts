import { editorRuntimePath, INSTAEDIT_API_URL } from './editor-runtime';

let sessionToken: string | null = null;
let sessionProjectId: string | null = null;
let exchangePromise: Promise<string> | null = null;

const SESSION_STORAGE_PREFIX = 'instaeditor:session:';

type StoredSession = {
  token: string;
  expiresAt?: number;
};

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
    if (!stored.token || (stored.expiresAt && stored.expiresAt <= Date.now() + 30_000)) {
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
  if (sessionToken && sessionProjectId === projectId) return Promise.resolve(sessionToken);
  if (sessionToken && sessionProjectId !== projectId) {
    sessionToken = null;
    sessionProjectId = null;
  }
  if (exchangePromise) return exchangePromise;

  const stored = readStoredSession(projectId);
  if (stored) {
    sessionToken = stored.token;
    sessionProjectId = projectId;
    return Promise.resolve(stored.token);
  }

  // Normal navigation supplies a one-time fragment. If the user refreshes
  // the editor or opens its URL directly, re-mint through the authenticated
  // BFF instead of failing with the misleading "misconfigured" message.
  exchangePromise = (async () => {
    const launchToken = launchTokenFromFragment() || await mintLaunchToken(projectId);
    const response = await fetch(editorRuntimePath('api/v1/editor/launch/exchange'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ launch_token: launchToken, project_id: projectId }),
    });
    const payload = await response.json().catch(() => ({})) as { launch_token?: string; expires_at?: number; error?: string };
    if (!response.ok || !payload.launch_token) {
      throw new Error(payload.error || 'Editor sessione non disponibile. Riapri il progetto da InstaEdit.');
    }
    sessionToken = payload.launch_token;
    sessionProjectId = projectId;
    storeSession(projectId, payload.launch_token, payload.expires_at ? payload.expires_at * 1000 : undefined);
    clearLaunchFragment();
    return payload.launch_token;
  })().finally(() => {
    exchangePromise = null;
  });

  return exchangePromise;
}

/** Return the in-memory session bearer, exchanging the launch fragment if needed. */
export async function editorAuthorizationHeaders(projectIdOverride?: string): Promise<Record<string, string>> {
  const token = await ensureEditorSessionToken(projectIdOverride);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Test/reset seam; the token is never persisted to storage. */
export function resetEditorSessionToken(): void {
  sessionToken = null;
  sessionProjectId = null;
  exchangePromise = null;
}
