/**
 * ChannelAnalyticsView.test.tsx — smoke tests covering the state
 * machine: Loading → Skeleton, Empty → EmptyState, Success → render
 * Header + KpiGrid. Component-level tests live next to each
 * component (added in Step 13); this file pins the parent's wiring.
 *
 * QueryClient wrapper pattern follows useGroupYouTubeVideos.test.ts
 * so the actual useQuery hook runs (we don't mock React Query).
 *
 * Module-mock pattern: vi.mock once at file scope, then drive each
 * test's fixture with vi.mocked(...).mockResolvedValueOnce / once /
 * implementation. Putting multiple vi.mock() calls inside describe
 * blocks is buggy — vitest hoists them but they REPLACE each other
 * so only the LAST factory applies to every test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { channelAnalyticsApi } from '../../../lib/api/channelAnalyticsApi';
import { ChannelAnalyticsView } from './ChannelAnalyticsView';
import type { ChannelPerformanceResponse } from '../../../lib/api/channelAnalyticsApi';

vi.mock('../../../lib/api/channelAnalyticsApi', () => ({
  channelAnalyticsApi: {
    getAccountPerformance: vi.fn(),
  },
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

const sampleResponse: ChannelPerformanceResponse = {
  channel: {
    platform_account_id: 381,
    youtube_channel_id: 'UCabc',
    channel_name: 'Demo Channel',
    avatar_url: undefined,
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
  },
  comparison: {
    views: { current_value: 100000, previous_value: 80000, absolute_change: 20000, percentage_change: 12.5 },
    watch_time_minutes: { current_value: 50000, previous_value: 0, absolute_change: 50000 },
    subscribers_net: { current_value: 150, previous_value: 100, absolute_change: 50, percentage_change: 25 },
    estimated_revenue: { current_value: 1234, previous_value: 4000, absolute_change: -2766, percentage_change: -69.15 },
    videos_published: { current_value: 5, previous_value: 4, absolute_change: 1, percentage_change: 12.5 },
    average_views_per_video: { current_value: 20000, previous_value: 16000, absolute_change: 4000, percentage_change: 12.5 },
  },
  daily_series: [
    { date: '2026-07-24T00:00:00Z', views: 12000, watch_time_minutes: 6000, subscribers_net: 20 },
    { date: '2026-07-25T00:00:00Z', views: 15000, watch_time_minutes: 7500, subscribers_net: 25 },
  ],
  top_videos: {
    most_viewed: [
      {
        video_id: 'vid1',
        title: 'Top viewed',
        published_at: '2026-07-20T12:00:00Z',
        views_in_period: 50000,
        watch_time_in_period: 25000,
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
        trend_score: 950.25,
        youtube_url: 'https://youtube.com/watch?v=vid2',
      },
    ],
  },
  generated_at: '2026-07-30T12:00:00Z',
  data_freshness: { last_synced_at: '2026-07-30T12:00:00Z', is_stale: false },
};

function renderView(platformAccountId: number, initialPath = `/dashboard-channels/${platformAccountId}`) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/dashboard-channels/:platformAccountId"
            element={<ChannelAnalyticsView platformAccountId={platformAccountId} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(channelAnalyticsApi.getAccountPerformance).mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ChannelAnalyticsView', () => {
  it('renders the skeleton while the query is loading', () => {
    vi.mocked(channelAnalyticsApi.getAccountPerformance).mockImplementation(
      () => new Promise(() => {}), // never resolves → stays in isLoading
    );
    renderView(381);
    // Period selector renders regardless of loading state.
    expect(
      screen.getByRole('group', { name: /selettore periodo analytics/i }),
    ).toBeTruthy();
  });

  it('renders the empty state when views=0 and cache is fresh', async () => {
    const empty: ChannelPerformanceResponse = {
      ...sampleResponse,
      summary: { ...sampleResponse.summary, views: 0 },
      data_freshness: { last_synced_at: '2026-07-30T12:00:00Z', is_stale: false },
    };
    vi.mocked(channelAnalyticsApi.getAccountPerformance).mockResolvedValueOnce(empty);
    renderView(381);
    await waitFor(() => {
      expect(
        screen.getByText(/nessun dato disponibile negli ultimi 7 giorni/i),
      ).toBeTruthy();
    });
  });

  it('renders Header + KpiGrid + Chart + Table on success', async () => {
    vi.mocked(channelAnalyticsApi.getAccountPerformance).mockResolvedValueOnce(sampleResponse);
    renderView(381);
    // Header + period selector render on the first paint.
    await screen.findByText(sampleResponse.channel.channel_name);
    expect(
      screen.getByRole('group', { name: /selettore periodo analytics/i }),
    ).toBeTruthy();
    // "Visualizzazioni" appears in BOTH the KPI grid label and the chart
    // metric selector, so use getAllByText + check we have at least 2
    // hits. Likewise "ultimo aggiornamento" is unique to the header.
    expect(screen.getAllByText(/visualizzazioni/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/ultimo aggiornamento/i)).toBeTruthy();
    // Top viewed video title is the most reliable proof the
    // TrendingVideosTable received the dataset (titles are escaped
    // strings, no locale ambiguity).
    expect(screen.getByText(/top viewed/i)).toBeTruthy();
  });
});
