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

  it('shares one in-flight exchange per project but keeps projects independent', async () => {
    // Exchange calls hang until released; resolvers are collected in order
    // (the exchange URL carries no project id — it is sent in the body).
    const pendingExchanges: Array<(value: Response) => void> = [];
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const raw = String(url);
      if (raw.endsWith('/editor/launch')) {
        // Mint resolves immediately so the exchange it feeds can start.
        return Promise.resolve(new Response(JSON.stringify({ launch_token: 'fresh-launch' }), { status: 201 }));
      }
      return new Promise<Response>((resolve) => {
        pendingExchanges.push(resolve);
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.replaceState({}, '', '/instaeditor/editor/ve_a');
    const first = ensureEditorSessionToken();
    // Same project while the exchange is in flight → no second network round.
    const secondSame = ensureEditorSessionToken();

    // A DIFFERENT project in flight must NOT share project A's promise.
    window.history.replaceState({}, '', '/instaeditor/editor/ve_b');
    const differentProject = ensureEditorSessionToken();

    // Let both mints + both exchanges fire (mints resolve in a microtask
    // and each exchange awaits its mint, so flush a few turns).
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    expect(fetchMock.mock.calls.length).toBe(4); // A mint, B mint, A exchange, B exchange
    expect(pendingExchanges).toHaveLength(2); // one exchange per project

    // Release A's exchange; B's must NOT resolve from it.
    pendingExchanges[0](new Response(JSON.stringify({ launch_token: 'editor-session', expires_at: Math.floor(Date.now() / 1000) + 300 }), { status: 201 }));
    await expect(first).resolves.toBe('editor-session');
    await expect(secondSame).resolves.toBe('editor-session');

    // B exchanges independently with its own token.
    pendingExchanges[1](new Response(JSON.stringify({ launch_token: 'editor-session-b', expires_at: Math.floor(Date.now() / 1000) + 300 }), { status: 201 }));
    await expect(differentProject).resolves.toBe('editor-session-b');
  });

  it('does not reuse an expired token — re-mints instead of returning the dead bearer', async () => {
    window.history.replaceState({}, '', '/instaeditor/editor/ve_expiry');

    // Token valid for 60s: fresh for the immediate second call (60s > 30s
    // grace) but expired once the clock advances 120s.
    const now = Date.now();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ launch_token: 'fresh-launch', expires_at: Math.floor(now / 1000) + 60 }), { status: 201 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(ensureEditorSessionToken()).resolves.toBe('fresh-launch');
    expect(fetchMock.mock.calls.length).toBe(2); // mint + exchange

    // Second call while fresh → served from the in-memory cache, zero network.
    await expect(ensureEditorSessionToken()).resolves.toBe('fresh-launch');
    expect(fetchMock.mock.calls.length).toBe(2);

    // Advance past expiry + grace: the cached (memory AND storage) token is
    // dead, so the next call re-mints instead of reusing the expired bearer.
    vi.useFakeTimers();
    vi.setSystemTime(now + 120_000);
    try {
      const fetchMock2 = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ launch_token: 'fresh-launch', expires_at: Math.floor((now + 120_000) / 1000) + 300 }), { status: 201 }),
        ),
      );
      vi.stubGlobal('fetch', fetchMock2);
      await expect(ensureEditorSessionToken()).resolves.toBe('fresh-launch');
      // The stale token was NOT reused: a full mint + exchange happened.
      expect(fetchMock2.mock.calls.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
