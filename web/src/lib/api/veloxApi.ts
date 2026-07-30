/**
 * Velox BFF API — typed wrappers for the user-facing /api/v1/velox/*
 * routes proxied through the InstaEdit BFF.
 *
 * DESIGN: workspace_id and user_id are NEVER included in request
 * bodies. The BFF extracts them from the session identity and
 * forwards them to Velox via a signed short-lived JWT. The browser
 * only sends project_id, render_spec, and delivery_plan (with
 * opaque external_destination_id references).
 */

import { apiGet, apiPost } from './client';

/** A Velox rendering job. */
export interface VeloxJob {
  id: string;
  projectId?: string;
  renderStatus: string;
  createdAt: string;
  updatedAt: string;
}

/** A social delivery associated with a job. */
export interface VeloxDelivery {
  externalDestinationId: string;
  socialDeliveryId: string;
  status: string;
  platformMediaId?: string;
  platformUrl?: string;
}

/** Synthetic event in the publishing lifecycle of a delivery. */
export interface VeloxDeliveryEvent {
  key: string;
  label: string;
  completed: boolean;
  active: boolean;
  icon: string;
}

/** Build a synthetic timeline of delivery events from the current status.
 *
 * The backend does not yet store per-delivery event history, so we
 * derive a timeline from the current `status` value. All non-terminal
 * statuses are mapped to the canonical pipeline:
 *   artifact_verified → queued → publishing → published
 */
export function getDeliveryEventTimeline(status: string): VeloxDeliveryEvent[] {
  const normalized = (status || 'UNKNOWN').toUpperCase();

  const pipeline: VeloxDeliveryEvent[] = [
    { key: 'artifact_verified', label: 'Artifact verificato', icon: 'verified', completed: false, active: false },
    { key: 'queued', label: 'In coda', icon: 'queue', completed: false, active: false },
    { key: 'publishing', label: 'Pubblicazione in corso', icon: 'publish', completed: false, active: false },
    { key: 'published', label: 'Pubblicato', icon: 'check_circle', completed: false, active: false },
  ];

  const markCompleted = (upToIndex: number) => {
    for (let i = 0; i <= upToIndex; i += 1) {
      pipeline[i].completed = true;
    }
  };

  const statusIndex: Record<string, number> = {
    ARTIFACT_VERIFIED: 0,
    QUEUED: 1,
    PUBLISHING: 2,
    WAITING_PROVIDER: 2,
    PUBLISHED: 3,
  };

  if (normalized === 'PUBLISHED') {
    markCompleted(3);
  } else if (normalized in statusIndex) {
    const idx = statusIndex[normalized];
    markCompleted(idx);
    pipeline[idx].active = true;
  }

  // Terminal failure states: append a synthetic failed event.
  if (normalized === 'FAILED' || normalized === 'BLOCKED_AUTH' || normalized === 'DEAD_LETTER') {
    const label =
      normalized === 'BLOCKED_AUTH'
        ? 'Autenticazione bloccata'
        : normalized === 'DEAD_LETTER'
          ? 'Dead letter'
          : 'Pubblicazione fallita';
    return [
      ...pipeline,
      {
        key: 'failed',
        label,
        icon: 'error',
        completed: false,
        active: true,
      },
    ];
  }

  return pipeline;
}

/** Aggregated job detail (job + deliveries). */
export interface VeloxJobDetail {
  job: VeloxJob;
  deliveries: VeloxDelivery[];
}

/** A Velox compute worker. */
export interface VeloxWorker {
  id: string;
  status: string;
  cpu?: number;
  ramMb?: number;
  gpu?: string;
  diskGb?: number;
}

/** A Velox artifact. */
export interface VeloxAsset {
  id: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  downloadUrl?: string;
}

/** Body for POST /api/v1/velox/jobs. */
export interface CreateVeloxJobRequest {
  projectId: string;
  renderSpec: Record<string, unknown>;
  deliveryPlan: {
    destinations: Array<{
      externalDestinationId: string;
      metadata?: Record<string, unknown>;
    }>;
  };
}

/** Query params for listing jobs. */
export interface ListJobsParams {
  status?: string;
  limit?: number;
}

/** List Velox jobs for the current workspace. */
export function listJobs(params?: ListJobsParams): Promise<{ jobs: VeloxJob[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiGet(`/api/v1/velox/jobs${qs ? '?' + qs : ''}`);
}

/** Create a new Velox rendering job. */
export function createJob(body: CreateVeloxJobRequest): Promise<VeloxJob> {
  return apiPost('/api/v1/velox/jobs', body);
}

/** Get a single job with its deliveries (aggregated view). */
export function getJob(id: string): Promise<VeloxJobDetail> {
  return apiGet(`/api/v1/velox/jobs/${encodeURIComponent(id)}`);
}

/** Cancel a job. Returns 204 No Content. */
export function cancelJob(id: string): Promise<void> {
  return apiPost(`/api/v1/velox/jobs/${encodeURIComponent(id)}/cancel`);
}

/** List deliveries for a job. */
export function listJobDeliveries(id: string): Promise<{ deliveries: VeloxDelivery[] }> {
  return apiGet(`/api/v1/velox/jobs/${encodeURIComponent(id)}/deliveries`);
}

/** List Velox workers for the current workspace. */
export function listWorkers(): Promise<{ workers: VeloxWorker[] }> {
  return apiGet('/api/v1/velox/workers');
}

/** Get a single worker. */
export function getWorker(id: string): Promise<VeloxWorker> {
  return apiGet(`/api/v1/velox/workers/${encodeURIComponent(id)}`);
}

/** Get a single artifact's metadata. */
export function getAsset(id: string): Promise<VeloxAsset> {
  return apiGet(`/api/v1/velox/assets/${encodeURIComponent(id)}`);
}

export const veloxApi = {
  listJobs,
  createJob,
  getJob,
  cancelJob,
  listJobDeliveries,
  listWorkers,
  getWorker,
  getAsset,
};
