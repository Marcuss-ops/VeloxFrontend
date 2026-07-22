/**
 * Legacy Bridge React Adapter
 *
 * Typed React adapter that replaces the old global singleton and window.* hacks.
 * All state lives inside a React context and is consumed via hooks.
 *
 * Usage:
 *   import { LegacyApiProvider, useLegacyApi } from '@/lib/api/legacyBridge';
 *   // Provider (wrap the app once):
 *   <LegacyApiProvider>{...}</LegacyApiProvider>
 *   // Consumer:
 *   const api = useLegacyApi();
 *   const jobs = await api.jobs.list();
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { fetchJSON, fetchVoid, ApiError } from './core';

// ============================================================================
// PAYLOAD CONTRACTS
// ============================================================================

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  detail?: string;
  reason?: string;
}

export type JobStatus = 'PENDING' | 'ASSIGNED' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'FAILED' | 'CANCELLED';

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

export interface JobsListResponse {
  jobs: JobPayload[];
  total?: number;
  page?: number;
  limit?: number;
}

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
// LOADING STATE MANAGER
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
      startTime: Date.now(),
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
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

// ============================================================================
// ERROR NORMALIZER
// ============================================================================

export interface NormalizedError {
  type: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
  status: number;
  message: string;
  detail?: string;
  originalError?: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return {
      type: error.status >= 500 ? 'server' : error.status >= 400 ? 'client' : 'unknown',
      status: error.status,
      message: error.message,
      detail: error.statusText,
      originalError: error,
    };
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      status: 0,
      message: 'Errore di connessione. Verifica la rete.',
      originalError: error,
    };
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        status: 408,
        message: 'Richiesta scaduta (timeout)',
        originalError: error,
      };
    }
    return {
      type: 'unknown',
      status: 0,
      message: error.message || 'Errore sconosciuto',
      originalError: error,
    };
  }

  return {
    type: 'unknown',
    status: 0,
    message: 'Errore sconosciuto',
    originalError: error,
  };
}

// ============================================================================
// TOAST NOTIFICATION INTERFACE
// ============================================================================

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
  detail?: string;
}

export type ToastHandler = (options: ToastOptions) => void;

// ============================================================================
// LEGACY API ADAPTER INTERFACE
// ============================================================================

export interface LegacyApiAdapter {
  jobs: {
    list(options?: { status?: JobStatus[]; limit?: number }): Promise<JobsListResponse>;
    get(jobId: string): Promise<JobPayload>;
    retry(jobId: string): Promise<ApiResponse>;
    delete(jobId: string): Promise<void>;
    cleanupQueue(): Promise<ApiResponse>;
    cleanupProcessing(): Promise<ApiResponse>;
    cleanupProcessingJob(jobId: string): Promise<ApiResponse>;
  };
  workers: {
    list(): Promise<WorkerPayload[]>;
    logs(workerId: string, lines?: number): Promise<{ ok: boolean; logs?: string[]; error?: string }>;
    status(): Promise<Record<string, WorkerPayload>>;
  };
  analytics: {
    submissions(limit?: number): Promise<{ items: SubmissionPayload[] }>;
  };
  utils: {
    fetchJSON<T = unknown>(url: string, _cacheMs?: number): Promise<T>;
    post<T = unknown>(url: string, body: unknown): Promise<T>;
    delete<T = unknown>(url: string): Promise<T>;
  };
  errors: {
    normalize: typeof normalizeError;
    ApiError: typeof ApiError;
  };
  loading: {
    start: (operation: string) => void;
    stop: () => void;
    getState: () => LoadingState;
    subscribe: (listener: LoadingListener) => () => void;
  };
  toast: {
    show: ToastHandler;
  };
}

function createLegacyApiAdapter(
  loadingManager: LoadingManager,
  toastHandler: ToastHandler | null
): LegacyApiAdapter {
  const showToastOrFallback: ToastHandler = (options) => {
    if (toastHandler) {
      toastHandler(options);
    } else {
      console.warn(
        `[${options.type.toUpperCase()}] ${options.message}${options.detail ? `: ${options.detail}` : ''}`
      );
    }
  };

  return {
    jobs: {
      async list(options?: { status?: JobStatus[]; limit?: number }): Promise<JobsListResponse> {
        const params = new URLSearchParams();
        if (options?.limit) params.set('limit', String(options.limit));
        const query = params.toString() ? `?${params.toString()}` : '';
        return fetchJSON<JobsListResponse>(`/api/jobs${query}`);
      },

      async get(jobId: string): Promise<JobPayload> {
        return fetchJSON<JobPayload>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
      },

      async retry(jobId: string): Promise<ApiResponse> {
        return fetchJSON<ApiResponse>(`/api/v1/jobs/${encodeURIComponent(jobId)}/retry`, {
          method: 'POST',
        });
      },

      async delete(jobId: string): Promise<void> {
        return fetchVoid(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
          method: 'DELETE',
        });
      },

      async cleanupQueue(): Promise<ApiResponse> {
        return fetchJSON<ApiResponse>('/cleanup_queue', { method: 'POST' });
      },

      async cleanupProcessing(): Promise<ApiResponse> {
        return fetchJSON<ApiResponse>('/cleanup_processing', { method: 'POST' });
      },

      async cleanupProcessingJob(jobId: string): Promise<ApiResponse> {
        return fetchJSON<ApiResponse>(`/cleanup_processing/${encodeURIComponent(jobId)}`, {
          method: 'POST',
        });
      },
    },

    workers: {
      async list(): Promise<WorkerPayload[]> {
        const result = await fetchJSON<WorkerPayload[] | { workers: WorkerPayload[] }>('/api/workers');
        return Array.isArray(result) ? result : (result as { workers: WorkerPayload[] }).workers || [];
      },

      async logs(workerId: string, lines: number = 200): Promise<{ ok: boolean; logs?: string[]; error?: string }> {
        return fetchJSON(`/api/v1/workers/${encodeURIComponent(workerId)}/logs?tail=${lines}`);
      },

      async status(): Promise<Record<string, WorkerPayload>> {
        return fetchJSON('/api/v1/workers/status');
      },
    },

    analytics: {
      async submissions(limit: number = 200): Promise<{ items: SubmissionPayload[] }> {
        return fetchJSON(`/api/v1/submissions?limit=${limit}`);
      },
    },

    utils: {
      async fetchJSON<T = unknown>(url: string, _cacheMs?: number): Promise<T> {
        return fetchJSON<T>(url);
      },

      async post<T = unknown>(url: string, body: unknown): Promise<T> {
        return fetchJSON<T>(url, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      },

      async delete<T = unknown>(url: string): Promise<T> {
        return fetchJSON<T>(url, { method: 'DELETE' });
      },
    },

    errors: {
      normalize: normalizeError,
      ApiError,
    },

    loading: {
      start: (operation: string) => loadingManager.start(operation),
      stop: () => loadingManager.stop(),
      getState: () => loadingManager.getState(),
      subscribe: (listener: LoadingListener) => loadingManager.subscribe(listener),
    },

    toast: {
      show: showToastOrFallback,
    },
  };
}

// ============================================================================
// REACT CONTEXT / PROVIDER / HOOKS
// ============================================================================

export interface LegacyApiContextValue {
  adapter: LegacyApiAdapter;
  loadingState: LoadingState;
  setToastHandler: (handler: ToastHandler | null) => void;
}

const LegacyApiContext = createContext<LegacyApiContextValue | null>(null);

export interface LegacyApiProviderProps {
  children: React.ReactNode;
}

export function LegacyApiProvider({ children }: LegacyApiProviderProps): React.ReactElement {
  const loadingManagerRef = useRef(new LoadingManager());
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [toastHandler, setToastHandler] = useState<ToastHandler | null>(null);

  React.useEffect(() => {
    const unsubscribe = loadingManagerRef.current.subscribe((state) => {
      setLoadingState(state);
    });
    return unsubscribe;
  }, []);

  const adapter = useMemo(
    () => createLegacyApiAdapter(loadingManagerRef.current, toastHandler),
    [toastHandler]
  );

  const value: LegacyApiContextValue = useMemo(
    () => ({
      adapter,
      loadingState,
      setToastHandler,
    }),
    [adapter, loadingState, setToastHandler]
  );

  return <LegacyApiContext.Provider value={value}>{children}</LegacyApiContext.Provider>;
}

export function useLegacyApi(): LegacyApiAdapter {
  const context = useContext(LegacyApiContext);
  if (!context) {
    throw new Error('useLegacyApi must be used within a LegacyApiProvider');
  }
  return context.adapter;
}

export function useLegacyLoadingState(): LoadingState {
  const context = useContext(LegacyApiContext);
  if (!context) {
    throw new Error('useLegacyLoadingState must be used within a LegacyApiProvider');
  }
  return context.loadingState;
}

export function useLegacyToast(): { show: ToastHandler; setHandler: (handler: ToastHandler | null) => void } {
  const context = useContext(LegacyApiContext);
  if (!context) {
    throw new Error('useLegacyToast must be used within a LegacyApiProvider');
  }
  return useMemo(
    () => ({ show: context.adapter.toast.show, setHandler: context.setToastHandler }),
    [context.adapter.toast.show, context.setToastHandler]
  );
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

export function useVeloxAPI(): LegacyApiAdapter {
  return useLegacyApi();
}

export const VeloxAPIProvider = LegacyApiProvider;
