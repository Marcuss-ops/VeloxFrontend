/**
 * Centralized API Types
 * 
 * All API request/response types in one place for better maintainability.
 */

// ============================================================================
// Generic API Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status?: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Jobs API Types
// ============================================================================

export type JobStatus = 
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Job {
  id: string;
  status: JobStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

export interface JobEvent {
  id: string;
  jobId: string;
  type: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface CreateJobRequest {
  type: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateJobRequest {
  status?: JobStatus;
  progress?: number;
  error?: string;
}

// ============================================================================
// Workers API Types
// ============================================================================

export type WorkerStatus = 'online' | 'offline' | 'busy' | 'error';

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  lastSeen: string;
  currentJobId?: string;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkerStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

// ============================================================================
// Analytics API Types
// ============================================================================

export interface AnalyticsOverview {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
}

// ============================================================================
// YouTube API Types
// ============================================================================

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface YouTubeUploadRequest {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  filePath: string;
}

export interface YouTubeUploadResponse {
  videoId: string;
  uploadUrl?: string;
  status: 'initiated' | 'uploading' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// Drive API Types
// ============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  fileCount: number;
  subfolders: DriveFolder[];
}

export interface DriveUploadRequest {
  file: File | Blob;
  filename: string;
  parentId?: string;
  mimeType?: string;
}

// ============================================================================
// Script Generator Types
// ============================================================================

export interface ScriptGenerationRequest {
  topic: string;
  language: string;
  style?: 'formal' | 'casual' | 'educational' | 'entertaining';
  length?: 'short' | 'medium' | 'long';
  includeTimestamps?: boolean;
}

export interface ScriptGenerationResponse {
  script: string;
  sections: ScriptSection[];
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    language: string;
  };
}

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  startTime?: number;
  endTime?: number;
}

// ============================================================================
// Calendar API Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  color?: string;
}

// ============================================================================
// Finance API Types
// ============================================================================

export interface RevenueEntry {
  id: string;
  date: string;
  amount: number;
  source: string;
  description?: string;
  category?: string;
}

export interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  period: {
    start: string;
    end: string;
  };
}

// ============================================================================
// Ansible API Types
// ============================================================================

export interface AnsibleComputer {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'unreachable';
  lastSeen: string;
  groups: string[];
  facts?: Record<string, unknown>;
}

export interface AnsiblePlaybook {
  id: string;
  name: string;
  description?: string;
  path: string;
  lastRun?: string;
  status?: 'success' | 'failed' | 'running';
}

export interface AnsibleRunRequest {
  playbookId: string;
  computerIds?: string[];
  groups?: string[];
  extraVars?: Record<string, unknown>;
}

export interface AnsibleRunResponse {
  runId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

// ============================================================================
// Bundle API Types
// ============================================================================

export interface Bundle {
  id: string;
  name: string;
  version: string;
  description?: string;
  files: BundleFile[];
  createdAt: string;
  updatedAt: string;
}

export interface BundleFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  checksum: string;
}

// ============================================================================
// Server Status Types
// ============================================================================

export interface ServerStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  services: ServiceStatus[];
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
}

// ============================================================================
// Queue API Types
// ============================================================================

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
}

export interface QueueItem {
  id: string;
  jobId: string;
  priority: number;
  createdAt: string;
  startedAt?: string;
  position: number;
}