import { editorRuntimePath } from './editor-runtime';

let sessionToken: string | null = null;
let exchangePromise: Promise<string> | null = null;

function launchTokenFromFragment(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('launch_token')?.trim() ?? '';
}

function clearLaunchFragment(): void {
  if (typeof window === 'undefined' || !window.location.hash) return;
  window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`);
}

/** Exchange the one-time fragment token for an in-memory editor session token. */
export function ensureEditorSessionToken(): Promise<string> {
  if (sessionToken) return Promise.resolve(sessionToken);
  if (exchangePromise) return exchangePromise;

  const launchToken = launchTokenFromFragment();
  const projectId = typeof window === 'undefined' ? '' : window.location.pathname.split('/').filter(Boolean).pop() ?? '';
  if (!launchToken || !projectId) {
    return Promise.reject(new Error('Editor unavailable / misconfigured'));
  }

  exchangePromise = fetch(editorRuntimePath('api/v1/editor/launch/exchange'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ launch_token: launchToken, project_id: projectId }),
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({})) as { launch_token?: string; error?: string };
    if (!response.ok || !payload.launch_token) {
      throw new Error(payload.error || 'Editor unavailable / misconfigured');
    }
    sessionToken = payload.launch_token;
    clearLaunchFragment();
    return sessionToken;
  }).finally(() => {
    exchangePromise = null;
  });

  return exchangePromise;
}

/** Return the in-memory session bearer, exchanging the launch fragment if needed. */
export async function editorAuthorizationHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await ensureEditorSessionToken()}` };
}

/** Test/reset seam; the token is never persisted to storage. */
export function resetEditorSessionToken(): void {
  sessionToken = null;
  exchangePromise = null;
}
