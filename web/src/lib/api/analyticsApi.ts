import { fetchJSON } from './core';

export const analyticsApi = {
  realtime: () => fetchJSON('/api/v1/analytics/realtime'),
  topVideos: (range = '7d') => fetchJSON(`/api/v1/analytics/top-videos?range=${range}`),
  summary: () => fetchJSON('/api/v1/analytics/summary'),
  dashboardSummary: () => fetchJSON('/api/v1/dashboard/summary'),
  dashboardFinance: (period = '30') => fetchJSON(`/api/v1/dashboard/finance?period=${period}`),
  dashboardChannels: (period = '30d') => fetchJSON(`/api/v1/dashboard/channels?period=${period}`),
  dashboardGroups: () => fetchJSON('/api/v1/dashboard/groups'),
  dashboardTimeline: (days = 30) => fetchJSON(`/api/v1/dashboard/timeline?days=${days}`),
};
