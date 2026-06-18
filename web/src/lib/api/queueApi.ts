import { fetchJSON } from './core';

export interface QueueMetrics {
  total_submitted: number;
  total_completed: number;
  total_failed: number;
  total_dlq: number;
  queue_depth: number;
  inflight_count: number;
  lease_expired_total: number;
  retry_total: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  last_updated: string;
}

export interface QueueJob {
  job_id: string;
  id: string;
  type: string;
  status: string;
  priority: number;
  attempt: number;
  max_attempts: number;
  worker_id?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  lease_expiry?: string;
  last_error?: string;
  retry_count: number;
  idempotency_key?: string;
  payload?: Record<string, unknown>;
}

export interface DLQEntry {
  job_id: string;
  error: string;
  failed_at: string;
  attempt: number;
  payload?: Record<string, unknown>;
}

export const queueApi = {
  /** Get next job for worker */
  getJob: (workerId: string, workerName?: string) =>
    fetchJSON<{ job: QueueJob | null }>(`/api/queue/job?worker_id=${encodeURIComponent(workerId)}${workerName ? `&worker_name=${encodeURIComponent(workerName)}` : ''}`),

  /** Get job status */
  getJobStatus: (jobId: string) =>
    fetchJSON<{ job: QueueJob }>(`/api/queue/job/${encodeURIComponent(jobId)}`),

  /** Submit a new job */
  submitJob: (job: { job_id: string; type?: string; priority?: number; max_attempts?: number; idempotency_key?: string; payload?: Record<string, unknown> }) =>
    fetchJSON<{ ok: boolean; job_id: string; status: string }>(`/api/queue/submit`, {
      method: 'POST',
      body: JSON.stringify(job),
    }),

  /** Complete a job */
  completeJob: (jobId: string, workerId?: string, result?: string) =>
    fetchJSON<{ ok: boolean; job_id: string; status: string }>(`/api/queue/complete`, {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, worker_id: workerId, result }),
    }),

  /** Fail a job */
  failJob: (jobId: string, workerId?: string, error?: string, requeue = false) =>
    fetchJSON<{ ok: boolean; job_id: string; status: string }>(`/api/queue/fail`, {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, worker_id: workerId, error, requeue }),
    }),

  /** Get queue metrics */
  metrics: () =>
    fetchJSON<{ metrics: QueueMetrics; timestamp: string }>(`/api/queue/metrics`),

  /** Get queue health */
  health: () =>
    fetchJSON<{ healthy: boolean; status: string; warnings: string[]; metrics: QueueMetrics; timestamp: string }>(`/api/queue/health`),

  /** Recover expired leases */
  recover: () =>
    fetchJSON<{ ok: boolean; claimed: number; timestamp: string }>(`/api/queue/recover`, { method: 'POST' }),

  /** Get dead letter queue entries */
  getDLQ: (limit = 100) =>
    fetchJSON<{ dlq: DLQEntry[]; count: number; timestamp: string }>(`/api/queue/dlq?limit=${limit}`),

  /** Replay DLQ jobs */
  replayDLQ: (jobId?: string) =>
    fetchJSON<{ ok: boolean; message: string; job_id?: string }>(`/api/queue/dlq/replay`, {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId }),
    }),
};
