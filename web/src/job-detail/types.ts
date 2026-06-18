/**
 * Job Detail Types
 * Shared types for JobDetailView and related components
 */

import { Job, JobStatus } from '../lib/api/jobsApi';

export interface JobEvent {
    timestamp: string;
    event_type: string;
    message: string;
    worker_id?: string;
    details?: Record<string, unknown>;
}

export interface JobHistoryEntry {
    timestamp?: string;
    status?: string;
    message?: string;
    worker_id?: string;
}

export interface JobDetailData {
    job_id: string;
    status: JobStatus;
    created_at: string | number;
    completed_at?: string | number;
    updated_at?: string | number;
    resolution?: string;
    codec?: string;
    duration?: string;
    progress?: number;
    logs?: JobEvent[];
    slot_data?: Record<string, unknown>;
}

export type { Job, JobStatus };
