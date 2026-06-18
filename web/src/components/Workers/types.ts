export interface SlotData {
    video_name?: string;
    youtube_url?: string;
}

export interface UploadResult {
    success?: boolean;
    error?: string;
    message?: string;
    detail?: string;
    youtube_video_id?: string;
    video_id?: string;
    videoId?: string;
    youtubeVideoId?: string;
    url?: string;
    link?: string;
    video_url?: string;
    youtube_url?: string;
}

export interface DriveResult {
    success?: boolean;
    link?: string;
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'FAILED' | 'CANCELED';

export interface Job {
    job_id: string;
    video_name?: string;
    status: JobStatus;
    progress?: number; // 0-100 percentage
    progress_message?: string; // Optional status message
    slot_data?: SlotData;
    assigned_to?: string;
    worker_id?: string;
    assigned_worker_ip?: string;
    processing_at?: string | number;
    processing_started_at?: string | number;
    started_at?: string | number;
    assigned_at?: string | number;
    completed_at?: string | number;
    updated_at?: string | number;
    error_message?: string;
    error?: string;
    last_upload_result?: UploadResult;
    last_drive_upload_result?: DriveResult;
}

export interface Worker {
    worker_id: string;
    ip?: string;
    ip_address?: string;
    host?: string;
    worker_name?: string;
    display_name?: string;
    name?: string;
    status?: string;
    last_heartbeat?: string | number;
    lastHeartbeat?: string | number;
}

export type ErrorCategory =
    | 'IDEMPOTENT'
    | 'OAUTH'
    | 'QUOTA'
    | 'SIZE'
    | 'COPYRIGHT'
    | 'NETWORK'
    | 'CHANNEL'
    | 'ERROR'
    | 'UNKNOWN';

export interface ErrorInfo {
    category: ErrorCategory;
    icon: string;
    color: string;
    hint: string;
}

export type WorkersTab = 'coda' | 'esecuzione' | 'completati' | 'errori';
