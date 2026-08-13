// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearEditorSession,
  EditorUnauthorizedError,
  ensureEditorSessionToken,
  resetEditorSessionToken,
} from '@/lib/editor-session';

describe('editor session bootstrap', () => {
  beforeEach(() => {
    resetEditorSessionToken();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/instaeditor/editor/ve_test');
    vi.restoreAllMocks();
  });

  it('re-mints through the authenticated InstaEdit API when the launch fragment is missing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ launch_token: 'fresh-launch' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ launch_token: 'editor-session', expires_at: Math.floor(Date.now() / 1000) + 300 }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(ensureEditorSessionToken()).resolves.toBe('editor-session');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.instaedit.org/api/v1/editor/launch',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/instaeditor/api/v1/editor/launch/exchange',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('restores the short-lived session after a reload without another network call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ launch_token: 'editor-session', expires_at: Math.floor(Date.now() / 1000) + 300 }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    window.history.replaceState({}, '', '/instaeditor/editor/ve_test#launch_token=initial');
    await expect(ensureEditorSessionToken()).resolves.toBe('editor-session');
    resetEditorSessionToken();
    window.history.replaceState({}, '', '/instaeditor/editor/ve_test');
    await expect(ensureEditorSessionToken()).resolves.toBe('editor-session');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps a 401 from the launch mint to EditorUnauthorizedError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'missing user identity' }), { status: 401 }),
      ),
    );
    await expect(ensureEditorSessionToken()).rejects.toBeInstanceOf(EditorUnauthorizedError);
  });

  it('maps a 401 from the exchange to EditorUnauthorizedError', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ launch_token: 'fresh-launch' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(ensureEditorSessionToken()).rejects.toBeInstanceOf(EditorUnauthorizedError);
  });

  it('clearEditorSession removes the in-memory token and the stored session', async () => {
    window.sessionStorage.setItem('instaeditor:session:ve_test', JSON.stringify({ token: 'stale-token', expiresAt: Date.now() + 60_000 }));
    clearEditorSession('ve_test');
    expect(window.sessionStorage.getItem('instaeditor:session:ve_test')).toBeNull();
    // In-memory state is gone too: the next call re-mints via the
    // network (mint + exchange) instead of returning the stale token
    // that would have short-circuited with zero fetches.
    // A factory (not a single shared Response) so each network call
    // gets a fresh, unconsumed body stream.
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ launch_token: 'fresh-launch' }), { status: 201 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(ensureEditorSessionToken()).resolves.toBe('fresh-launch');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
