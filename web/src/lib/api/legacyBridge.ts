/**
 * Legacy Bridge Compatibility Layer
 * 
 * AGENT 13B - Bridge Compatibility Layer
 * 
 * Questo modulo fornisce un adapter API unico che può essere usato sia da React
 * che dal codice legacy JS (sections/st/modules/*.js).
 * 
 * Obiettivi:
 * 1. Definire adapter API unico (client shared) usato sia da React che da legacy JS
 * 2. Introdurre contract payload minimali per tab legacy critici
 * 3. Normalizzare gestione errori/loading (evitare divergenze lato UX e parsing)
 * 
 * Usage (Legacy JS):
 *   // In dashboard.js o altri moduli legacy
 *   const api = window.veloxAPI;
 *   const jobs = await api.jobs.list();
 *   const result = await api.jobs.retry(jobId);
 * 
 * Usage (React TSX):
 *   import { jobsApi } from '@/lib/api';
 *   const jobs = await jobsApi.list();
 */

import { fetchJSON, fetchVoid, ApiError } from './core';

// ============================================================================
// PAYLOAD CONTRACTS - Tipi per tab legacy critici
// ============================================================================

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  detail?: string;
  reason?: string;
}

/**
 * Job Status enum - normalizzato tra backend e frontend
 */
export type JobStatus = 'PENDING' | 'ASSIGNED' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'FAILED' | 'CANCELLED';

/**
 * Job payload contract - minimale per legacy tabs
 */
export interface JobPayload {
  job_id: string;
  video_name?: string;
  status: JobStatus;
  created_at?: string;
  updated_at?: string;
  processing_at?: string;
  completed_at?: string;
  assigned_to?: string;
  worker_id?: string;
  assigned_worker_ip?: string;
  assigned_worker_name?: string;
  error_message?: string;
  error?: string;
  result_path?: string;
  master_video_path?: string;
  slot_data?: {
    video_name?: string;
    result_path?: string;
    youtube_url?: string;
  };
  last_upload_result?: {
    success?: boolean;
    error?: string;
    message?: string;
    detail?: string;
    youtube_video_id?: string;
    video_id?: string;
    url?: string;
    link?: string;
  };
  last_drive_upload_result?: {
    success?: boolean;
    link?: string;
  };
}

/**
 * Jobs list response contract
 */
export interface JobsListResponse {
  jobs: JobPayload[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Worker payload contract
 */
export interface WorkerPayload {
  worker_id: string;
  worker_name?: string;
  display_name?: string;
  ip?: string;
  ip_address?: string;
  host?: string;
  name?: string;
  status: 'online' | 'offline' | 'busy' | 'error' | 'unknown';
  last_heartbeat?: string;
  lastHeartbeat?: string;
  current_job?: string;
  jobs_completed?: number;
  jobs_failed?: number;
}

/**
 * YouTube Channel payload contract
 */
export interface YouTubeChannelPayload {
  id: string;
  title?: string;
  url: string;
  thumbnail?: string;
  notes?: string;
  added_at?: string;
  history?: Array<{
    ts: string;
    views?: number;
    subs?: number;
  }>;
}

/**
 * YouTube Group payload contract
 */
export interface YouTubeGroupPayload {
  name: string;
  channels: YouTubeChannelPayload[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Analytics submission payload
 */
export interface SubmissionPayload {
  job_id?: string;
  project_name?: string;
  youtube_group?: string;
  video_name?: string;
  video_style?: string;
  client_ip?: string;
  created_at?: string;
  voiceovers_urls_count?: number;
  start_clips_urls_count?: number;
  stock_clips_urls_count?: number;
}

/**
 * YouTube channels summary for API tab
 */
export interface YouTubeChannelsSummary {
  total_channels?: number;
  channels_ok?: number;
  channels_token_present?: number;
  channels_reauth?: number;
  channels_no_token?: number;
  channels_error?: number;
}

// ============================================================================
// LOADING STATE MANAGER - Normalizza stati di loading
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  startTime?: number;
}

type LoadingListener = (state: LoadingState) => void;

class LoadingManager {
  private state: LoadingState = { isLoading: false };
  private listeners: Set<LoadingListener> = new Set();
  private loadingCount: number = 0;

  start(operation: string): void {
    this.loadingCount++;
    this.state = {
      isLoading: true,
      operation,
      startTime: Date.now()
    };
    this.notify();
  }

  stop(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.state = { isLoading: false };
    }
    this.notify();
  }

  getState(): LoadingState {
    return { ...this.state };
  }

  subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const loadingManager = new LoadingManager();

// ============================================================================
// ERROR NORMALIZER - Normalizza errori da backend diversi
// ============================================================================

export interface NormalizedError {
  type: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
  status: number;
  message: string;
  detail?: string;
  originalError?: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  // ApiError from core.ts
  if (error instanceof ApiError) {
    return {
      type: error.status >= 500 ? 'server' : error.status >= 400 ? 'client' : 'unknown',
      status: error.status,
      message: error.message,
      detail: error.statusText,
      originalError: error
    };
  }

  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      status: 0,
      message: 'Errore di connessione. Verifica la rete.',
      originalError: error
    };
  }

  // Generic Error
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        status: 408,
        message: 'Richiesta scaduta (timeout)',
        originalError: error
      };
    }
    return {
      type: 'unknown',
      status: 0,
      message: error.message || 'Errore sconosciuto',
      originalError: error
    };
  }

  // Fallback
  return {
    type: 'unknown',
    status: 0,
    message: 'Errore sconosciuto',
    originalError: error
  };
}

// ============================================================================
// TOAST NOTIFICATION INTERFACE - Normalizza notifiche UI
// ============================================================================

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
  detail?: string;
}

type ToastHandler = (options: ToastOptions) => void;

let globalToastHandler: ToastHandler | null = null;

export function setToastHandler(handler: ToastHandler): void {
  globalToastHandler = handler;
}

export function showToast(message: string, type: ToastType = 'info', detail?: string): void {
  if (globalToastHandler) {
    globalToastHandler({ message, type, detail });
  } else {
    // Fallback to console
    console.warn(`[${type.toUpperCase()}] ${message}${detail ? `: ${detail}` : ''}`);
  }
}

// ============================================================================
// LEGACY API ADAPTER - Esposto come window.veloxAPI
// ============================================================================

/**
 * Legacy API Adapter
 * 
 * Fornisce metodi compatibili con il codice legacy ma usando
 * il client API unificato con gestione errori/loading normalizzata.
 */
export const legacyApiAdapter = {
  // ------------------------------------------------------------------
  // JOBS API - Per dashboard.js (tabs: coda, esecuzione, completati, errori)
  // ------------------------------------------------------------------
  jobs: {
    /**
     * Lista tutti i job (usato in tutti i tab dashboard)
     */
    async list(options?: { status?: JobStatus[]; limit?: number }): Promise<JobsListResponse> {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      const query = params.toString() ? `?${params.toString()}` : '';
      return fetchJSON<JobsListResponse>(`/api/jobs${query}`);
    },

    /**
     * Ottieni dettaglio job
     */
    async get(jobId: string): Promise<JobPayload> {
      return fetchJSON<JobPayload>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
    },

    /**
     * Riprova job fallito
     */
    async retry(jobId: string): Promise<ApiResponse> {
      return fetchJSON<ApiResponse>(`/api/v1/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST'
      });
    },

    /**
     * Elimina job dalla coda
     */
    async delete(jobId: string): Promise<void> {
      return fetchVoid(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE'
      });
    },

    /**
     * Cleanup coda (elimina tutti i pending)
     */
    async cleanupQueue(): Promise<ApiResponse> {
      return fetchJSON<ApiResponse>('/cleanup_queue', { method: 'POST' });
    },

    /**
     * Cleanup processing (elimina tutti i job in esecuzione)
     */
    async cleanupProcessing(): Promise<ApiResponse> {
      return fetchJSON<ApiResponse>('/cleanup_processing', { method: 'POST' });
    },

    /**
     * Cleanup singolo job in processing
     */
    async cleanupProcessingJob(jobId: string): Promise<ApiResponse> {
      return fetchJSON<ApiResponse>(`/cleanup_processing/${encodeURIComponent(jobId)}`, {
        method: 'POST'
      });
    }
  },

  // ------------------------------------------------------------------
  // WORKERS API - Per dashboard.js (tab: worker-logs)
  // ------------------------------------------------------------------
  workers: {
    /**
     * Lista tutti i worker
     */
    async list(): Promise<WorkerPayload[]> {
      const result = await fetchJSON<WorkerPayload[] | { workers: WorkerPayload[] }>('/api/workers');
      // Handle both array and object response
      return Array.isArray(result) ? result : (result as { workers: WorkerPayload[] }).workers || [];
    },

    /**
     * Ottieni log di un worker
     */
    async logs(workerId: string, lines: number = 200): Promise<{ ok: boolean; logs?: string[]; error?: string }> {
      return fetchJSON(`/api/v1/workers/${encodeURIComponent(workerId)}/logs?tail=${lines}`);
    },

    /**
     * Ottieni stato worker
     */
    async status(): Promise<Record<string, WorkerPayload>> {
      return fetchJSON('/api/v1/workers/status');
    }
  },

  // ------------------------------------------------------------------
  // ANALYTICS API - Per dashboard.js (tab: api)
  // ------------------------------------------------------------------
  analytics: {
    /**
     * Submissions recenti (API standalone)
     */
    async submissions(limit: number = 200): Promise<{ items: SubmissionPayload[] }> {
      return fetchJSON(`/api/v1/submissions?limit=${limit}`);
    },

    /**
     * YouTube channels summary (fast, cached)
     */
    async youtubeChannels(validate: boolean = false): Promise<{ summary: YouTubeChannelsSummary }> {
      return fetchJSON(`/api/v1/youtube/channels?validate_tokens=${validate}`);
    }
  },

  // ------------------------------------------------------------------
  // YOUTUBE MANAGER API - Per youtube_manager.js
  // ------------------------------------------------------------------
  youtubeManager: {
    /**
     * Ottieni tutti i gruppi con canali
     */
    async getGroups(): Promise<{ ok: boolean; groups: Record<string, YouTubeGroupPayload> }> {
      return fetchJSON('/api/youtube/manager/groups');
    },

    /**
     * Crea nuovo gruppo
     */
    async createGroup(name: string): Promise<ApiResponse> {
      return fetchJSON('/api/youtube/manager/groups', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
    },

    /**
     * Elimina gruppo
     */
    async deleteGroup(name: string): Promise<ApiResponse> {
      return fetchJSON(`/api/youtube/manager/groups/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
    },

    /**
     * Aggiungi canale a gruppo
     */
    async addChannel(groupName: string, channel: { url: string; title?: string; notes?: string }): Promise<ApiResponse> {
      return fetchJSON(`/api/youtube/manager/groups/${encodeURIComponent(groupName)}/channels`, {
        method: 'POST',
        body: JSON.stringify(channel)
      });
    },

    /**
     * Rimuovi canale da gruppo
     */
    async removeChannel(groupName: string, channelId: string): Promise<ApiResponse> {
      return fetchJSON(`/api/youtube/manager/groups/${encodeURIComponent(groupName)}/channels/${encodeURIComponent(channelId)}`, {
        method: 'DELETE'
      });
    },

    /**
     * Feed video per gruppo
     */
    async getFeed(groupName: string, timeRange: string = 'week'): Promise<{ videos: unknown[] }> {
      return fetchJSON(`/api/youtube/manager/feed?sort_by=date&time_range=${timeRange}&group_name=${encodeURIComponent(groupName)}`);
    },

    /**
     * Discovery/search video
     */
    async discovery(query: string, days: number = 30): Promise<{ videos: unknown[]; results?: unknown[] }> {
      return fetchJSON(`/api/youtube/manager/discovery?query=${encodeURIComponent(query)}&days=${days}`);
    },

    /**
     * Similar channels
     */
    async similarChannels(url: string): Promise<{ results?: unknown[]; channels?: unknown[] }> {
      return fetchJSON('/api/youtube/manager/tools/similar', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
    },

    /**
     * Trends/News
     */
    async trends(query: string): Promise<{ trends: unknown[] }> {
      return fetchJSON(`/api/youtube/manager/trends?query=${encodeURIComponent(query)}`);
    }
  },

  // ------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // ------------------------------------------------------------------
  utils: {
    /**
     * Fetch generico con caching (compatibile con fetchJSON legacy di dashboard.js)
     */
    async fetchJSON<T = unknown>(url: string, _cacheMs?: number): Promise<T> {
      // Per ora usiamo fetch diretto con caching semplice
      // In futuro possiamo integrare con react-query o simile
      // _cacheMs is kept for API compatibility but not yet used
      return fetchJSON<T>(url);
    },

    /**
     * POST generico
     */
    async post<T = unknown>(url: string, body: unknown): Promise<T> {
      return fetchJSON<T>(url, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    /**
     * DELETE generico
     */
    async delete<T = unknown>(url: string): Promise<T> {
      return fetchJSON<T>(url, { method: 'DELETE' });
    }
  },

  // ------------------------------------------------------------------
  // ERROR HANDLING
  // ------------------------------------------------------------------
  errors: {
    normalize: normalizeError,
    ApiError
  },

  // ------------------------------------------------------------------
  // LOADING STATE
  // ------------------------------------------------------------------
  loading: {
    start: (operation: string) => loadingManager.start(operation),
    stop: () => loadingManager.stop(),
    getState: () => loadingManager.getState(),
    subscribe: (listener: LoadingListener) => loadingManager.subscribe(listener)
  },

  // ------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ------------------------------------------------------------------
  toast: {
    show: showToast,
    setHandler: setToastHandler
  }
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LegacyApiAdapter = typeof legacyApiAdapter;

// ============================================================================
// GLOBAL WINDOW INTERFACE - Per legacy JS
// ============================================================================

declare global {
  interface Window {
    veloxAPI?: LegacyApiAdapter;
    veloxAPIReady?: boolean;
  }
}

// Esponi globalmente per legacy JS
if (typeof window !== 'undefined') {
  window.veloxAPI = legacyApiAdapter;
  window.veloxAPIReady = true;
}

export default legacyApiAdapter;
