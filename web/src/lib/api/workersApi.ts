import { fetchJSON } from './client';

export interface Worker {
  worker_id: string;
  ip?: string;
  ip_address?: string;
  host?: string;
  hostname?: string;
  worker_name?: string;
  display_name?: string;
  name?: string;
  status?: string;
  last_heartbeat?: string | number;
  lastHeartbeat?: string | number;
  current_job?: string;
  [key: string]: unknown;
}

/**
 * Normalize the wire shape: the endpoint historically answered both a bare
 * array and `{ workers: [...] }` depending on the backend version. One
 * normalizer here so call sites never re-implement the tolerance.
 */
function normalizeWorkerList(result: Worker[] | { workers?: Worker[] } | null | undefined): Worker[] {
  if (Array.isArray(result)) return result;
  return result?.workers ?? [];
}

export const workersApi = {
  /** Get all workers (shape-tolerant: array or { workers }). */
  list: async (): Promise<Worker[]> =>
    normalizeWorkerList(await fetchJSON<Worker[] | { workers?: Worker[] }>('/workers')),

  /** Get workers status */
  status: () => fetchJSON<Record<string, unknown>>('/workers_status'),

  /** Get worker logs */
  logs: (workerId: string, lines = 100) =>
    fetchJSON<{ logs: string }>(`/workers/${workerId}/logs?tail=${lines}`),

  // NOTE: no updateAll/restartAll wrappers — POST /workers/update_all and
  // /workers/restart_all are retired, never-mounted routes (see
  // docs/api/bundle.md). Worker mutations go through the canonical admin
  // namespace: POST /api/v1/admin/workers/:worker_id/{update,restart,...}.
};
