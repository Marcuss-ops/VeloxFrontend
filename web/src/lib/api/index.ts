/**
 * API module exports - Modularized
 */
export { fetchJSON, fetchVoid, ApiError } from './core';
export type { RequestOptions } from './core';

// Legacy Bridge for backward compatibility with old JS modules
export { legacyApiAdapter, loadingManager, normalizeError, showToast, setToastHandler } from './legacyBridge';
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

export { youtubeApi } from './youtubeApi';
export type { YouTubeChannel, YouTubeUploadResult, YouTubeUploadConfig, YouTubeUploadOptions } from './youtubeApi';

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

export { youtubeAccountsApi } from './youtubeAccountsApi';
export type { YouTubeAccountToken, YouTubeChannelGroup } from './youtubeAccountsApi';

export { calendarApi, PROJECT_STATUSES } from './calendarApi';
export type { CalendarEvent, VideoClip, CalendarEventFilter, CalendarEventsResponse, ProjectStatus, StatusConfig } from './calendarApi';

// Default export combining them all for backwards compatibility
import { fetchJSON, fetchVoid, ApiError } from './core';
import { jobsApi } from './jobsApi';
import { workersApi } from './workersApi';
import { youtubeApi } from './youtubeApi';
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
import { youtubeAccountsApi } from './youtubeAccountsApi';

const apiClient = {
  fetchJSON,
  fetchVoid,
  ApiError,
  jobs: jobsApi,
  workers: workersApi,
  youtube: youtubeApi,
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
  youtubeAccounts: youtubeAccountsApi
};

export default apiClient;
