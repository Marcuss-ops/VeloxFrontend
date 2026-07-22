import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deliveriesApi,
  listDeliveriesForJob,
  getDeliveryForDestination,
  isDeliveryPublished,
  isDeliveryFailed,
  Delivery,
} from './deliveriesApi';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response);
}

function lastFetchCall() {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit | undefined][];
  return calls[calls.length - 1];
}

describe('deliveriesApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.cookie = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const deliveries: Delivery[] = [
    {
      id: 'sdel_01JABC',
      status: 'published',
      externalDestinationId: 'extdst_01JABC',
      socialDeliveryId: 'sdel_01JABC',
      platformMediaId: 'yt-123',
      platformUrl: 'https://youtube.com/watch?v=yt-123',
      publishedAt: '2025-07-20T12:00:00Z',
      createdAt: '2025-07-20T11:00:00Z',
      updatedAt: '2025-07-20T12:00:00Z',
    },
    {
      id: 'sdel_01JDEF',
      status: 'publishing',
      externalDestinationId: 'extdst_01JDEF',
      socialDeliveryId: 'sdel_01JDEF',
      createdAt: '2025-07-20T11:00:00Z',
      updatedAt: '2025-07-20T11:05:00Z',
    },
  ];

  it('lists deliveries for a job', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ deliveries }) });

    const result = await deliveriesApi.listDeliveriesForJob('job_123');

    expect(result.deliveries).toEqual(deliveries);
    expect(lastFetchCall()[0]).toBe('/api/v1/velox/jobs/job_123/deliveries');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('encodes the job id in the URL', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ deliveries: [] }) });

    await listDeliveriesForJob('job/with spaces');

    expect(lastFetchCall()[0]).toBe('/api/v1/velox/jobs/job%2Fwith%20spaces/deliveries');
  });

  it('returns the matching delivery for a destination', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ deliveries }) });

    const result = await getDeliveryForDestination('job_123', 'extdst_01JDEF');

    expect(result).toEqual(deliveries[1]);
  });

  it('returns undefined when no delivery matches the destination', async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve({ deliveries }) });

    const result = await getDeliveryForDestination('job_123', 'extdst_missing');

    expect(result).toBeUndefined();
  });

  it('identifies published status', () => {
    expect(isDeliveryPublished('published')).toBe(true);
    expect(isDeliveryPublished('publishing')).toBe(false);
  });

  it('identifies failed terminal statuses', () => {
    expect(isDeliveryFailed('failed')).toBe(true);
    expect(isDeliveryFailed('blocked_auth')).toBe(true);
    expect(isDeliveryFailed('dead_letter')).toBe(true);
    expect(isDeliveryFailed('published')).toBe(false);
  });

  it('exports both the named functions and the object API', () => {
    expect(typeof listDeliveriesForJob).toBe('function');
    expect(typeof getDeliveryForDestination).toBe('function');
    expect(typeof isDeliveryPublished).toBe('function');
    expect(typeof isDeliveryFailed).toBe('function');
    expect(typeof deliveriesApi.listDeliveriesForJob).toBe('function');
    expect(typeof deliveriesApi.getDeliveryForDestination).toBe('function');
  });

  it('throws an ApiError on a non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ reason: 'workspace mismatch' }),
    });

    await expect(deliveriesApi.listDeliveriesForJob('job_123')).rejects.toThrow('workspace mismatch');
  });
});
