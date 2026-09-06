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

export const workersApi = {
  /** Get all workers */
  list: () => fetchJSON<Worker[]>('/workers'),

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
