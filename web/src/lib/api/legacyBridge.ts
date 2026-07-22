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
 * Usage (React/TS):
 *   import { legacyApiAdapter, useVeloxAPI } from '@/lib/api';
 *   // via context: const api = useVeloxAPI();
 *   // via import:  const api = legacyApiAdapter;
 *   const jobs = await api.jobs.list();
 *   const result = await api.jobs.retry(jobId);
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

// ============================================================================
// LOADING STATE MANAGER - Normalizza stati di loading
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  startTime?: number;
}

type LoadingListener = (state: LoadingState) => void;

export class LoadingManager {
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

const internalLoadingManager = new LoadingManager();

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
// LEGACY API ADAPTER
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
    start: (operation: string) => internalLoadingManager.start(operation),
    stop: () => internalLoadingManager.stop(),
    getState: () => internalLoadingManager.getState(),
    subscribe: (listener: LoadingListener) => internalLoadingManager.subscribe(listener)
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

export default legacyApiAdapter;
