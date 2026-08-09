// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureEditorSessionToken, resetEditorSessionToken } from '@/lib/editor-session';

describe('editor session bootstrap', () => {
  beforeEach(() => {
    resetEditorSessionToken();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/instaeditor/editor/ve_test');
    vi.restoreAllMocks();
  });

  it('re-mints through the authenticated BFF when the launch fragment is missing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ launch_token: 'fresh-launch' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ launch_token: 'editor-session', expires_at: Math.floor(Date.now() / 1000) + 300 }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(ensureEditorSessionToken()).resolves.toBe('editor-session');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/instaeditor/api/v1/editor/launch',
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
});
