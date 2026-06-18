/**
 * Legacy Bridge - Shared Types & Payload Contracts
 * 
 * Tipi per tab legacy critici, usati sia da React che da legacy JS.
 */

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
 * YouTube Channel payload contract
 */
export interface YouTubeChannelPayload {
  id: string;
  title?: string;
  url: string;
  thumbnail?: string;
  notes?: string;
  added_at?: string;
  history?: Array<{
    ts: string;
    views?: number;
    subs?: number;
  }>;
}

/**
 * YouTube Group payload contract
 */
export interface YouTubeGroupPayload {
  name: string;
  channels: YouTubeChannelPayload[];
  created_at?: string;
  updated_at?: string;
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

/**
 * YouTube channels summary for API tab
 */
export interface YouTubeChannelsSummary {
  total_channels?: number;
  channels_ok?: number;
  channels_token_present?: number;
  channels_reauth?: number;
  channels_no_token?: number;
  channels_error?: number;
}
