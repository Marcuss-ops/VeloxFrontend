/**
 * API module exports - Modularized
 */
// Single transport engine (core.ts was folded into client.ts).
// RequestOptions is kept as an alias so legacy imports of the old
// core.ts type name keep resolving.
export { fetchJSON, fetchVoid, ApiError } from './client';
export { apiFetch, apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiError as ClientApiError, API_BASE_URL } from './client';
export type { ClientOptions, ClientOptions as RequestOptions } from './client';

export { authApi, getMe } from './authApi';
export type { AuthUser, MeResponse } from './authApi';

export { accountsApi } from './accountsApi';
export type { PlatformAccount } from './accountsApi';

export { socialDestinationsApi } from './socialDestinationsApi';
export type { SocialDestination, CreateSocialDestinationRequest, UpdateSocialDestinationRequest } from './socialDestinationsApi';

export { veloxApi } from './veloxApi';
export type { VeloxJob, VeloxDelivery, VeloxJobDetail, VeloxWorker, VeloxAsset, CreateVeloxJobRequest, ListJobsParams } from './veloxApi';

export { projectsApi } from './projectsApi';
export type { Project, CreateProjectRequest } from './projectsApi';

export { deliveriesApi } from './deliveriesApi';
export type { Delivery, DeliveryStatus } from './deliveriesApi';

// The Legacy Bridge React adapter (legacyBridge.tsx) was removed: it had
// zero production consumers — the canonical path is the typed per-domain
// API modules re-exported below plus React Query at the call sites.

export { jobsApi } from './jobsApi';
export type { Job, JobsResponse, JobStatus } from './jobsApi';

export { workersApi } from './workersApi';
export type { Worker } from './workersApi';

// YouTube API modules removed: publishing now flows through Velox/InstaEdit destinations

export { analyticsApi } from './analyticsApi';
export { driveApi, driveApiExtended } from './driveApi';
export type { DriveFile, DriveFolder } from './driveApi';

export { ansibleApi } from './ansibleApi';

export { serverApi } from './serverApi';
export { scriptApi } from './scriptApi';
export { utilApi } from './utilApi';
export { queueApi } from './queueApi';

export { livestreamApi } from './livestreamApi';
export type {
  Livestream,
  LivestreamConfig,
  LivestreamPatch,
  LivestreamState,
  LivestreamPrivacy,
  LivestreamPlaybackMode,
  LivestreamScheduleType,
  LivestreamLatencyPreference,
  LivestreamChannel,
  LivestreamListResponse,
  LivestreamChannelsResponse,
  LivestreamListOptions,
} from './livestreamApi';

export { driveLinksApi } from './driveLinksApi';
export type { DriveLink } from './driveLinksApi';

// YouTube accounts API removed along with the YouTube Manager module

export { calendarApi, PROJECT_STATUSES } from './calendarApi';
export type { CalendarEvent, VideoClip, CalendarEventFilter, CalendarEventsResponse, ProjectStatus, StatusConfig } from './calendarApi';

// Default export combining them all for backwards compatibility
import { fetchJSON, fetchVoid, ApiError } from './client';
import { jobsApi } from './jobsApi';
import { workersApi } from './workersApi';

import { analyticsApi } from './analyticsApi';
import { driveApi } from './driveApi';
import { ansibleApi } from './ansibleApi';
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
  server: serverApi,
  script: scriptApi,
  util: utilApi,
  queue: queueApi,
  livestream: livestreamApi,
  driveLinks: driveLinksApi,

};

export default apiClient;
