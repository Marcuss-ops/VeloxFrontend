/**
 * API module exports - Modularized
 */
export { fetchJSON, fetchVoid, ApiError } from './core';
export type { RequestOptions } from './core';

// Session-aware BFF client + new modules (InstaEdit session-based auth)
export { apiFetch, apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiError as ClientApiError, API_BASE_URL } from './client';
export type { ClientOptions } from './client';

export { authApi, getMe } from './authApi';
export type { AuthUser, MeResponse } from './authApi';

export { socialApi } from './socialApi';
export type { VeloxDestination, CreateDestinationRequest, CreateDestinationResponse, PlatformAccount } from './socialApi';

export { veloxApi } from './veloxApi';
export type { VeloxJob, VeloxDelivery, VeloxJobDetail, VeloxWorker, VeloxAsset, CreateVeloxJobRequest, ListJobsParams } from './veloxApi';

export { projectsApi } from './projectsApi';
export type { Project, CreateProjectRequest } from './projectsApi';

export { deliveriesApi } from './deliveriesApi';
export type { Delivery } from './deliveriesApi';

// Legacy Bridge for backward compatibility with old JS modules
export { legacyApiAdapter, LoadingManager, normalizeError, showToast, setToastHandler } from './legacyBridge';
export type {
  ApiResponse,
  JobPayload,
  JobsListResponse,
  WorkerPayload,
  YouTubeChannelPayload,
  YouTubeGroupPayload,
  SubmissionPayload,
  YouTubeChannelsSummary,
  LoadingState,
  NormalizedError,
  ToastType,
  ToastOptions,
  LegacyApiAdapter
} from './legacyBridge';

export { jobsApi } from './jobsApi';
export type { Job, JobsResponse, JobStatus } from './jobsApi';

export { workersApi } from './workersApi';
export type { Worker } from './workersApi';

// YouTube API modules removed: publishing now flows through Velox/InstaEdit destinations

export { analyticsApi } from './analyticsApi';
export { driveApi, driveApiExtended } from './driveApi';
export type { DriveFile, DriveFolder } from './driveApi';

export { ansibleApi } from './ansibleApi';

export { bundleApi } from './bundleApi';
export type { BundleInfo, BundleDir, BundleFilesResponse, BundleFile } from './bundleApi';

export { serverApi } from './serverApi';
export { scriptApi } from './scriptApi';
export { utilApi } from './utilApi';
export { queueApi } from './queueApi';

export { livestreamApi } from './livestreamApi';
export type { Livestream, LivestreamConfig, LivestreamStatus, LivestreamHealth, LivestreamProtocol, LivestreamLatencyPreference, LivestreamHealthStatus, LivestreamStatusResponse } from './livestreamApi';

export { driveLinksApi } from './driveLinksApi';
export type { DriveLink } from './driveLinksApi';

// YouTube accounts API removed along with the YouTube Manager module

export { calendarApi, PROJECT_STATUSES } from './calendarApi';
export type { CalendarEvent, VideoClip, CalendarEventFilter, CalendarEventsResponse, ProjectStatus, StatusConfig } from './calendarApi';

// Default export combining them all for backwards compatibility
import { fetchJSON, fetchVoid, ApiError } from './core';
import { jobsApi } from './jobsApi';
import { workersApi } from './workersApi';

import { analyticsApi } from './analyticsApi';
import { driveApi } from './driveApi';
import { ansibleApi } from './ansibleApi';
import { bundleApi } from './bundleApi';
import { serverApi } from './serverApi';
import { scriptApi } from './scriptApi';
import { utilApi } from './utilApi';
import { queueApi } from './queueApi';
import { livestreamApi } from './livestreamApi';
import { driveLinksApi } from './driveLinksApi';


const apiClient = {
  fetchJSON,
  fetchVoid,
  ApiError,
  jobs: jobsApi,
  workers: workersApi,

  analytics: analyticsApi,
  drive: driveApi,
  ansible: ansibleApi,
  bundle: bundleApi,
  server: serverApi,
  script: scriptApi,
  util: utilApi,
  queue: queueApi,
  livestream: livestreamApi,
  driveLinks: driveLinksApi,

};

export default apiClient;
