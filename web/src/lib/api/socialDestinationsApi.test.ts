import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  socialDestinationsApi,
  listSocialDestinations,
  getSocialDestination,
  createSocialDestination,
  updateSocialDestination,
  deleteSocialDestination,
  SocialDestination,
} from './socialDestinationsApi';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response);
}

function lastFetchCall() {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit | undefined][];
  return calls[calls.length - 1];
}

describe('socialDestinationsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.cookie = 'csrf_token=test-csrf-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleDestination: SocialDestination = {
    external_destination_id: 'extdst_01JABC',
    label: 'My YouTube Channel',
    provider: 'youtube',
    status: 'active',
    platform_account_id: 42,
    workspace_id: 7,
    source_system: 'velox',
    defaults: { privacy_status: 'private', language: 'en' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  };

  it('lists destinations for a workspace', async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ destinations: [sampleDestination] }),
    });

    const result = await socialDestinationsApi.list(7);

    expect(result.destinations).toEqual([sampleDestination]);
    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations?workspace_id=7');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('encodes the workspace id in the query string', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ destinations: [] }) });

    await socialDestinationsApi.list(999);

    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations?workspace_id=999');
  });

  it('gets a destination by opaque id', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve(sampleDestination) });

    const result = await socialDestinationsApi.get('extdst_01JABC');

    expect(result).toEqual(sampleDestination);
    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations/extdst_01JABC');
  });

  it('encodes opaque destination ids in GET paths', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve(sampleDestination) });

    await socialDestinationsApi.get('ext dst#1');

    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations/ext%20dst%231');
  });

  it('encodes opaque destination ids in PATCH paths', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve(sampleDestination) });

    await socialDestinationsApi.update('ext dst#1', { defaults: {} });

    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations/ext%20dst%231');
  });

  it('encodes opaque destination ids in DELETE paths', async () => {
    mockFetch({ ok: true, status: 204 });

    await socialDestinationsApi.delete('ext dst#1');

    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations/ext%20dst%231');
  });

  it('creates a destination and returns the opaque id', async () => {
    mockFetch({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ external_destination_id: 'extdst_01JDEF', status: 'active' }),
    });

    const result = await socialDestinationsApi.create({
      workspace_id: 7,
      platform_account_id: 42,
      defaults: { privacy_status: 'public' },
    });

    expect(result).toEqual({ external_destination_id: 'extdst_01JDEF', status: 'active' });
    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Token': 'test-csrf-token',
        'Content-Type': 'application/json',
      }),
    });
    expect(JSON.parse((lastFetchCall()[1] as RequestInit).body as string)).toEqual({
      workspace_id: 7,
      platform_account_id: 42,
      defaults: { privacy_status: 'public' },
    });
  });

  it('updates a destination with PATCH and CSRF', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ ...sampleDestination, defaults: { language: 'it' } }) });

    await socialDestinationsApi.update('extdst_01JABC', { defaults: { language: 'it' } });

    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations/extdst_01JABC');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Token': 'test-csrf-token',
        'Content-Type': 'application/json',
      }),
    });
  });

  it('deletes a destination with DELETE and CSRF', async () => {
    mockFetch({ ok: true, status: 204 });

    await socialDestinationsApi.delete('extdst_01JABC');

    expect(lastFetchCall()[0]).toBe('/api/v1/integrations/velox/destinations/extdst_01JABC');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'DELETE',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Token': 'test-csrf-token',
      }),
    });
  });

  it('exports both named functions and the object API', () => {
    expect(typeof listSocialDestinations).toBe('function');
    expect(typeof getSocialDestination).toBe('function');
    expect(typeof createSocialDestination).toBe('function');
    expect(typeof updateSocialDestination).toBe('function');
    expect(typeof deleteSocialDestination).toBe('function');
    expect(typeof socialDestinationsApi.list).toBe('function');
    expect(typeof socialDestinationsApi.get).toBe('function');
    expect(typeof socialDestinationsApi.create).toBe('function');
    expect(typeof socialDestinationsApi.update).toBe('function');
    expect(typeof socialDestinationsApi.delete).toBe('function');
  });
});
