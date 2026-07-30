import { fetchJSON } from './core';

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

  /** Update all workers */
  updateAll: (excludeLocal = true) =>
    fetchJSON<{ updated_workers: string[] }>('/workers/update_all', {
      method: 'POST',
      body: JSON.stringify({ exclude_local: excludeLocal }),
    }),

  /** Restart all workers */
  restartAll: (excludeLocal = true) =>
    fetchJSON<{ restarted_workers: string[] }>('/workers/restart_all', {
      method: 'POST',
      body: JSON.stringify({ exclude_local: excludeLocal }),
    }),
};
