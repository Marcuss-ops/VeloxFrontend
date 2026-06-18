import { fetchJSON, fetchVoid } from './core';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'FAILED' | 'CANCELED';

export interface Job {
  job_id: string;
  video_name?: string;
  status: JobStatus;
  command?: string;
  slot_data?: Record<string, unknown>;
  assigned_to?: string;
  worker_id?: string;
  assigned_worker_ip?: string;
  processing_at?: string | number;
  processing_started_at?: string | number;
  started_at?: string | number;
  assigned_at?: string | number;
  completed_at?: string | number;
  updated_at?: string | number;
  created_at?: string;
  error_message?: string;
  error?: string;
  last_upload_result?: Record<string, unknown>;
  last_drive_upload_result?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface JobsResponse {
  jobs: Job[];
}

/**
 * Jobs API client for managing video processing jobs.
 * 
 * Provides methods for CRUD operations on jobs, queue management,
 * and job lifecycle operations (retry, cancel, delete).
 * 
 * @namespace jobsApi
 * 
 * @example
 * ```typescript
 * // Get all jobs
 * const { jobs } = await jobsApi.list();
 * 
 * // Get specific job
 * const job = await jobsApi.get('job-123');
 * 
 * // Retry failed job
 * await jobsApi.retry('job-123');
 * 
 * // Clear all pending jobs
 * await jobsApi.clearQueue();
 * ```
 */
export const jobsApi = {
  /**
   * Get all jobs in the system.
   * 
   * @returns {Promise<JobsResponse>} Object containing array of all jobs
   */
  list: () => fetchJSON<JobsResponse>('/jobs'),

  /** Get a specific job */
  get: (jobId: string) => fetchJSON<Job>(`/jobs/${jobId}`),

  /** Delete a job */
  delete: (jobId: string) => fetchVoid(`/jobs/${jobId}`, { method: 'DELETE' }),

  /** Retry a failed job */
  retry: (jobId: string) => fetchVoid(`/jobs/${jobId}/retry`, { method: 'POST' }),

  /** Clear queue (all pending jobs) */
  clearQueue: () => fetchVoid('/cleanup_queue', { method: 'POST' }),

  /** Clear processing jobs */
  clearProcessing: () => fetchVoid('/cleanup_processing', { method: 'POST' }),

  /** Cancel a specific processing job */
  cancelProcessing: (jobId: string) => fetchVoid(`/cleanup_processing/${jobId}`, { method: 'POST' }),
};
