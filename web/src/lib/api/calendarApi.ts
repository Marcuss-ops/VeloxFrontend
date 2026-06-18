/**
 * Calendar API Client
 * 
 * Video Production Calendar - CRUD operations for calendar events
 */

import { fetchJSON, fetchVoid } from './core';

// Project status types
export type ProjectStatus = 'draft' | 'in_progress' | 'in_review' | 'complete' | 'published';

export interface StatusConfig {
  label: string;
  labelIt: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PROJECT_STATUSES: Record<ProjectStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    labelIt: 'Bozza',
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/50',
  },
  in_progress: {
    label: 'In Progress',
    labelIt: 'In Lavorazione',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
  },
  in_review: {
    label: 'In Review',
    labelIt: 'In Revisione',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
  },
  complete: {
    label: 'Complete',
    labelIt: 'Completo',
    color: 'text-green-300',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
  },
  published: {
    label: 'Published',
    labelIt: 'Pubblicato',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
  },
};

// Types matching backend store.CalendarEvent
export interface VideoClip {
  id: string;
  name: string;
  driveId: string;
  path?: string;
  url?: string;
  webViewLink?: string;
  thumbnail?: string;
  duration?: number;
  type: 'stock' | 'initial' | 'intermediate' | 'final';
}

export interface CalendarEvent {
  id: string;
  externalId?: string;
  source?: string;
  title: string;
  date: number;
  month: number;
  year: number;
  status?: ProjectStatus;
  youtubeGroup?: string;
  stockFootage: VideoClip[];
  initialClips: VideoClip[];
  intermediateClips: VideoClip[];
  finalClips: VideoClip[];
  voiceoverPaths?: string[];
  titles?: string[];
  scriptText?: string;
  youtubeLinks?: string[];
  category?: string;
  jobId?: string;
  jobStatus?: string;
  queuedAt?: string;
  queueError?: string;
  outputVideoPath?: string;
  outputVideoUrl?: string;
  publishStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEventFilter {
  search?: string;
  month?: number;
  year?: number;
  hasClips?: boolean;
  limit?: number;
  offset?: number;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  count: number;
}

/**
 * Calendar API namespace
 */
export const calendarApi = {
  /**
   * List calendar events with optional filtering
   */
  list: (filter?: CalendarEventFilter) => {
    const params = new URLSearchParams();
    if (filter?.search) params.set('search', filter.search);
    if (filter?.month !== undefined) params.set('month', String(filter.month));
    if (filter?.year !== undefined) params.set('year', String(filter.year));
    if (filter?.hasClips) params.set('has_clips', 'true');
    if (filter?.limit) params.set('limit', String(filter.limit));
    if (filter?.offset) params.set('offset', String(filter.offset));
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJSON<CalendarEventsResponse>(`/api/v1/calendar/events${query}`);
  },

  /**
   * Get a single calendar event by ID
   */
  get: (id: string) => 
    fetchJSON<CalendarEvent>(`/api/v1/calendar/events/${encodeURIComponent(id)}`),

  /**
   * Create a new calendar event
   */
  create: (event: CalendarEvent) =>
    fetchJSON<CalendarEvent>('/api/v1/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  /**
   * Update an existing calendar event
   */
  update: (id: string, event: CalendarEvent) =>
    fetchJSON<CalendarEvent>(`/api/v1/calendar/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    }),

  /**
   * Delete a calendar event
   */
  delete: (id: string) =>
    fetchVoid(`/api/v1/calendar/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  /**
   * Create or update an event (upsert)
   */
  upsert: (event: CalendarEvent) =>
    fetchJSON<CalendarEvent>('/api/v1/calendar/events/upsert', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  /**
   * Force enqueue an existing calendar event
   */
  enqueue: (id: string) =>
    fetchJSON<CalendarEvent>(`/api/v1/calendar/events/${encodeURIComponent(id)}/enqueue`, {
      method: 'POST',
    }),

  /**
   * Get events by date range
   * Use fields=minimal for preload/caching (smaller payload)
   */
  getByDateRange: (startMonth: number, startYear: number, endMonth: number, endYear: number, minimal = false) =>
    fetchJSON<CalendarEventsResponse>(
      `/api/v1/calendar/events/range?start_month=${startMonth}&start_year=${startYear}&end_month=${endMonth}&end_year=${endYear}${minimal ? '&fields=minimal' : ''}`
    ),
};

export default calendarApi;
