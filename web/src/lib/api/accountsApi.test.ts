import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { accountsApi, listAccounts, PlatformAccount } from './accountsApi';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response);
}

function lastFetchCall() {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit | undefined][];
  return calls[calls.length - 1];
}

describe('accountsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.cookie = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists all platform accounts', async () => {
    const accounts: PlatformAccount[] = [
      { id: 1, platform: 'youtube', username: 'channel-one', status: 'active' },
      { id: 2, platform: 'instagram', username: 'gram-two', status: 'active' },
    ];
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ accounts }) });

    const result = await accountsApi.listAccounts();

    expect(result.accounts).toEqual(accounts);
    expect(lastFetchCall()[0]).toBe('/api/v1/accounts');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('filters accounts by platform', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ accounts: [] }) });

    await accountsApi.listAccounts('youtube');

    expect(lastFetchCall()[0]).toBe('/api/v1/accounts?platform=youtube');
  });

  it('encodes platform query parameters', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ accounts: [] }) });

    await accountsApi.listAccounts('you tube');

    expect(lastFetchCall()[0]).toBe('/api/v1/accounts?platform=you%20tube');
  });

  it('exports the named function and object API', () => {
    expect(typeof listAccounts).toBe('function');
    expect(typeof accountsApi.listAccounts).toBe('function');
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'database unavailable' }),
    });

    await expect(accountsApi.listAccounts()).rejects.toThrow('database unavailable');
  });
});
