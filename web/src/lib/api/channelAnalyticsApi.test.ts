import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from './client';
import {
  channelAnalyticsApi,
  getAccountPerformance,
  type ChannelPerformanceResponse,
} from './channelAnalyticsApi';

/**
 * Canonical fixture mirroring the Go DTO contract from
 * InstaeditLogin/internal/analytics/contract.go. Snapshots the wire
 * shape we depend on; if the backend drops a field the typecheck on
 * the import will scream at compile time, but this fixture also
 * pins the JSON-level content (e.g. snake_case keys) so a future
 * snake→camel drift surfaces here, not in production.
 */
const sampleResponse: ChannelPerformanceResponse = {
  channel: {
    platform_account_id: 381,
    youtube_channel_id: 'UCabc',
    channel_name: 'Demo Channel',
    avatar_url: 'https://example.test/a.png',
    status: 'active',
  },
  period: {
    days: 7,
    start_date: '2026-07-24T00:00:00Z',
    end_date: '2026-07-30T00:00:00Z',
    previous_start_date: '2026-07-17T00:00:00Z',
    previous_end_date: '2026-07-23T00:00:00Z',
    timezone: 'UTC',
  },
  summary: {
    views: 100000,
    watch_time_minutes: 50000,
    subscribers_gained: 200,
    subscribers_lost: 50,
    subscribers_net: 150,
    estimated_revenue_cents: 1234,
    videos_published: 5,
    average_views_per_video: 20000,
    ctr: 0.045,
  },
  comparison: {
    views: {
      current_value: 100000,
      previous_value: 80000,
      absolute_change: 20000,
      percentage_change: 12.5,
    },
    watch_time_minutes: {
      current_value: 50000,
      previous_value: 0,
      absolute_change: 50000,
      // percentage_change is OMITTED (not 0) when previous_value === 0.
    },
    subscribers_net: {
      current_value: 150,
      previous_value: 100,
      absolute_change: 50,
      percentage_change: 25,
    },
    estimated_revenue: {
      current_value: 1234,
      previous_value: 4000,
      absolute_change: -2766,
      percentage_change: -69.15,
    },
    videos_published: {
      current_value: 5,
      previous_value: 4,
      absolute_change: 1,
      percentage_change: 12.5,
    },
    average_views_per_video: {
      current_value: 20000,
      previous_value: 16000,
      absolute_change: 4000,
      percentage_change: 12.5,
    },
  },
  daily_series: [
    {
      date: '2026-07-24T00:00:00Z',
      views: 12000,
      watch_time_minutes: 6000,
      subscribers_net: 20,
    },
    {
      date: '2026-07-25T00:00:00Z',
      views: 15000,
      watch_time_minutes: 7500,
      subscribers_net: 25,
      estimated_revenue_cents: 5000,
    },
    // Gap-fill: missing day still present with zeros so the chart
    // never has gaps (backend invariant).
    {
      date: '2026-07-26T00:00:00Z',
      views: 0,
      watch_time_minutes: 0,
      subscribers_net: 0,
    },
  ],
  top_videos: {
    most_viewed: [
      {
        video_id: 'vid1',
        title: 'Top viewed',
        thumbnail_url: 'https://example.test/t1.jpg',
        published_at: '2026-07-20T12:00:00Z',
        views_in_period: 50000,
        watch_time_in_period: 25000,
        revenue_cents_in_period: 5000,
        views_per_day: 7142,
        growth_percentage: 12.5,
        trend_score: 500.5,
        youtube_url: 'https://youtube.com/watch?v=vid1',
      },
    ],
    growing: [
      {
        video_id: 'vid2',
        title: 'Growing fast',
        published_at: '2026-07-28T08:00:00Z',
        views_in_period: 20000,
        watch_time_in_period: 10000,
        views_per_day: 10000,
        // growth_percentage omitted — recent video with no prior period.
        trend_score: 950.25,
        youtube_url: 'https://youtube.com/watch?v=vid2',
      },
    ],
  },
  generated_at: '2026-07-30T12:00:00Z',
  data_freshness: {
    last_synced_at: '2026-07-30T12:00:00Z',
    is_stale: false,
  },
};

type FetchCall = [string, RequestInit | undefined];

function mockJsonResponse(
  body: unknown,
  status: number = 200,
  statusText: string = 'OK',
): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
  };
}

/**
 * Install a global.fetch mock that rejects with `abortErr` either
 * immediately (when the signal is already aborted on entry, per the
 * DOM-spec gotcha where addEventListener after abort does NOT fire)
 * or via an 'abort' listener when the signal aborts mid-flight.
 *
 * Both paths are required: React Query uses the mid-flight path on
 * unmount / period change, while useChannelAnalytics' stale-cache
 * detection uses the pre-aborted path when the consumer cancels
 * before the fetcher attaches the listener.
 */
function mockFetchRejectsOnAbort(abortErr: Error): void {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(abortErr);
          return;
        }
        init?.signal?.addEventListener('abort', () => reject(abortErr));
      }),
  );
}

/** Mimic the DOM exception fetch() throws when its signal aborts. */
function makeAbortError(): Error {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

function lastFetchCall(): FetchCall {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as FetchCall[];
  return calls[calls.length - 1];
}

describe('channelAnalyticsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // CSRF cookie set to a known value so dev-mode warnings in
    // client.ts do not pollute test output.
    document.cookie = 'csrf_token=test-csrf; path=/';
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = '';
  });

  it('fetches performance for days=7 with session credentials', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(sampleResponse),
    );

    const result = await channelAnalyticsApi.getAccountPerformance(381, 7);

    expect(result).toEqual(sampleResponse);
    expect(lastFetchCall()[0]).toBe('/api/v1/accounts/381/performance?days=7');
    expect(lastFetchCall()[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('serialises days=14 and days=28 with the same path template', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(sampleResponse),
    );

    await channelAnalyticsApi.getAccountPerformance(381, 14);
    expect(lastFetchCall()[0]).toBe('/api/v1/accounts/381/performance?days=14');

    await channelAnalyticsApi.getAccountPerformance(381, 28);
    expect(lastFetchCall()[0]).toBe('/api/v1/accounts/381/performance?days=28');
  });

  it('forwards AbortSignal to fetch so React Query can cancel on period change', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(sampleResponse),
    );
    const ac = new AbortController();

    await channelAnalyticsApi.getAccountPerformance(381, 7, { signal: ac.signal });

    expect(lastFetchCall()[1]?.signal).toBe(ac.signal);
  });

  // The AbortError has TWO distinct timing paths. Per DOM spec,
  // subscribing AFTER abort does NOT fire the listener; the mock
  // therefore handles both paths explicitly. Splitting the two
  // cases into separate `it()` blocks makes vitest point at the
  // exact scenario if a regression lands in only one of them.
  it('propagates AbortError when the signal is ALREADY aborted (pre-flight)', async () => {
    const abortErr = makeAbortError();
    const ac = new AbortController();
    ac.abort(); // abort BEFORE getAccountPerformance registers the fetch listener
    mockFetchRejectsOnAbort(abortErr);

    await expect(
      channelAnalyticsApi.getAccountPerformance(381, 7, { signal: ac.signal }),
    ).rejects.toBe(abortErr);
  });

  it('propagates AbortError when the signal aborts mid-flight', async () => {
    // React Query uses this path on unmount / period change: the
    // request is already in flight when the consumer signals cancel.
    const abortErr = makeAbortError();
    const ac = new AbortController();
    mockFetchRejectsOnAbort(abortErr);
    const pending = channelAnalyticsApi.getAccountPerformance(381, 7, { signal: ac.signal });
    // Yield one microtask to ensure the fetch mock executor has run
    // and registered the listener. In practice `apiGet` registers
    // synchronously inside its async wrapper, so this is defensive
    // cover for JSDOM quirks.
    await Promise.resolve();
    ac.abort();
    await expect(pending).rejects.toBe(abortErr);
  });

  it('rejects with RangeError for a non-positive platformAccountId', async () => {
    // getAccountPerformance is `async`, so any thrown RangeError is
    // surfaced as a Promise rejection. This is what callers see in
    // production, so the test MUST mirror that — NOT the
    // synchronous throw form, which would silently mask bugs where
    // an async wrapper is removed by a refactor.
    await expect(channelAnalyticsApi.getAccountPerformance(0, 7)).rejects.toThrow(
      RangeError,
    );
    await expect(channelAnalyticsApi.getAccountPerformance(-1, 7)).rejects.toThrow(
      RangeError,
    );
    await expect(channelAnalyticsApi.getAccountPerformance(1.5, 7)).rejects.toThrow(
      RangeError,
    );
    await expect(channelAnalyticsApi.getAccountPerformance(Number.NaN, 7)).rejects.toThrow(
      RangeError,
    );
    // The validation rejects BEFORE any request is built, so a
    // misclicked render burns zero request budget. Verify by
    // asserting global.fetch was never called.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects with ApiError(status=400) on invalid period from backend', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse({ error: 'invalid period: days=8' }, 400, 'Bad Request'),
    );
    await expect(channelAnalyticsApi.getAccountPerformance(381, 7)).rejects.toThrow(
      ApiError,
    );
    try {
      await channelAnalyticsApi.getAccountPerformance(381, 7);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toContain('invalid period');
    }
  });

  it('rejects with ApiError(status=404) on channel not accessible', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse({ error: 'channel not found' }, 404, 'Not Found'),
    );
    try {
      await channelAnalyticsApi.getAccountPerformance(381, 7);
      throw new Error('unexpected resolution');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it('rejects with ApiError(status=500) on backend failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(
        { error: 'metric history store not configured' },
        500,
        'Internal Server Error',
      ),
    );
    try {
      await channelAnalyticsApi.getAccountPerformance(381, 7);
      throw new Error('unexpected resolution');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
    }
  });

  it('treats absent optional fields as undefined (NOT coerced to 0)', async () => {
    // Build a fresh fixture object literal with explicit
    // `field: undefined` rather than deleting typed properties
    // (which TypeScript strict mode rejects on optional fields).
    const noOptional: ChannelPerformanceResponse = {
      ...sampleResponse,
      summary: {
        ...sampleResponse.summary,
        estimated_revenue_cents: undefined,
        impressions: undefined,
        ctr: undefined,
      },
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(noOptional),
    );

    const result = await channelAnalyticsApi.getAccountPerformance(381, 7);
    expect(result.summary.estimated_revenue_cents).toBeUndefined();
    expect(result.summary.impressions).toBeUndefined();
    expect(result.summary.ctr).toBeUndefined();
    // Optional comparison fields stay undefined when omitted.
    expect(result.comparison.watch_time_minutes.percentage_change).toBeUndefined();
    expect(result.top_videos.growing[0].growth_percentage).toBeUndefined();
  });

  it('preserves the negative delta with percentage_change present (NOT flattened)', async () => {
    // Pin the contract rule "percentage_change is omitted only when
    // previous_value === 0" — negative deltas with non-zero
    // previous MUST round-trip the signed percentage.
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(sampleResponse),
    );
    const result = await channelAnalyticsApi.getAccountPerformance(381, 7);
    expect(result.comparison.estimated_revenue.percentage_change).toBe(-69.15);
  });

  it('exposes both named function and object API surface', () => {
    expect(typeof getAccountPerformance).toBe('function');
    expect(typeof channelAnalyticsApi.getAccountPerformance).toBe('function');
    expect(channelAnalyticsApi.getAccountPerformance).toBe(getAccountPerformance);
  });
});
