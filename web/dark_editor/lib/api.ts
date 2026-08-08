// API client for InstaEditor.
// The current deployment uses a compatibility namespace, isolated here so
// callers do not treat it as a product route or launcher.
import { editorRuntimePath } from './editor-runtime';
import { editorAuthorizationHeaders } from './editor-session';

const API_BASE = editorRuntimePath('');

async function editorFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const authorization = await editorAuthorizationHeaders();
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: { ...authorization, ...getCSRFHeaders(), ...init.headers },
  });
}

/** Headers required for cookie-authenticated mutating API requests. */
export function getCSRFHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrf_token='))
    ?.slice('csrf_token='.length);
  return token ? { 'X-CSRF-Token': decodeURIComponent(token) } : {};
}

/** Resolve URLs returned by the editor API to browser-loadable asset URLs. */
export function resolveEditorAssetUrl(value: string | undefined): string {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith(`${API_BASE}/`)) return value;
  if (value.startsWith('/')) return value;
  // The editor upload APIs return temp/<filename>; the runtime helper resolves
  // it against the current deployment boundary.
  if (value.startsWith('temp/')) return `${API_BASE}/api/${value}`;
  return `${API_BASE}/${value.replace(/^\/+/, '')}`;
}

// Request Manager to handle AbortControllers for concurrent requests
class RequestManager {
  private controllers = new Map<string, AbortController>();

  getSignal(key: string): AbortSignal {
    // Abort previous request of the same type if it exists
    if (this.controllers.has(key)) {
      this.controllers.get(key)!.abort();
    }
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  clear(key: string) {
    this.controllers.delete(key);
  }
}

const requestManager = new RequestManager();

export interface UploadResponse {
  filename: string;
  url: string;
}

export interface FilterRequest {
  filename: string;
  filter_type: string;
  value: number;
}

export interface FilterResponse {
  filename: string;
  url: string;
}

export function extractFilenameFromPath(pathOrUrl: string): string {
  const withoutHash = pathOrUrl.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export interface TransformRequest {
  filename: string;
  crop_box?: [number, number, number, number];
  resize_dims?: [number, number];
}

export interface ExportRequest {
  filename: string;
  format: string;
  quality: number;
}

export interface GenerateRequest {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
}

export interface GenerateResponse {
  filename: string;
  url: string;
  prompt: string;
}

export interface UpscaleRequest {
  filename: string;
  scale?: number;
  save_in_place?: boolean;
}

export interface UpscaleResponse {
  filename: string;
  url: string;
  saved_at?: string;
}

export interface YouTubeGrabRequest {
  url: string;
}

export interface YouTubeGrabResponse {
  filename: string;
  video_id: string;
  url: string;
}

export interface RemoveBgRequest {
  filename: string;
  model?: string;
  output_format?: string;
  async?: boolean;
}

export interface RemoveBgResponse {
  filename?: string;
  url?: string;
  processing?: boolean;
  task_id?: string;
  error?: string;
}

export interface RemoveBgStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filename?: string;
  url?: string;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  canvas_json: Record<string, unknown>;
  preview_url: string;
  created_at: string;
  updated_at: string;
  folder_id?: string | null;
}

function safeAssetUrl(value: string | undefined, videoId?: string): string {
  if (value && (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/'))) {
    return value;
  }
  return videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : '';
}

// Upload an image
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await editorFetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

// Apply a filter to an image
export async function applyFilter(request: FilterRequest): Promise<FilterResponse> {
  const response = await editorFetch(`${API_BASE}/process/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Filter failed');
  }

  return response.json();
}

// Transform an image (crop/resize)
export async function transformImage(request: TransformRequest): Promise<FilterResponse> {
  const response = await editorFetch(`${API_BASE}/process/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Transform failed');
  }

  return response.json();
}

// Export an image
export async function exportImage(request: ExportRequest): Promise<{ url: string; filename: string }> {
  const response = await editorFetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Export failed');
  }

  return response.json();
}

// Generate an image using AI
export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await editorFetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  return response.json();
}

export async function upscaleImage(request: UpscaleRequest): Promise<UpscaleResponse> {
  const response = await editorFetch(`${API_BASE}/api/upscale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upscale failed');
  }

  return response.json();
}

// Grab YouTube thumbnail
export async function grabYouTubeThumbnail(request: YouTubeGrabRequest): Promise<YouTubeGrabResponse> {
  const response = await editorFetch(`${API_BASE}/api/tools/youtube_grab`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'YouTube grab failed');
  }

  return response.json();
}

// Remove background
export async function removeBackground(request: RemoveBgRequest): Promise<RemoveBgResponse> {
  const signal = requestManager.getSignal(`remove-bg-${request.filename}`);

  const response = await editorFetch(`${API_BASE}/api/remove-bg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Background removal failed');
  }

  const result = await response.json();
  requestManager.clear(`remove-bg-${request.filename}`);
  return result;
}

// Get background removal status
export async function getBackgroundRemovalStatus(taskId: string): Promise<RemoveBgStatusResponse> {
  const response = await editorFetch(`${API_BASE}/api/remove-bg/status/${taskId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get background removal status');
  }

  return response.json();
}

// List projects
export async function listProjects(type?: string): Promise<Project[]> {
  const url = type
    ? `${API_BASE}/api/projects?type=${encodeURIComponent(type)}`
    : `${API_BASE}/api/projects`;

  const response = await editorFetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list projects');
  }

  return response.json();
}

// Get a project
export async function getProject(id: string): Promise<Project> {
  if (id.startsWith('ve_')) {
    // YouTube editor sessions provide the initial thumbnail metadata, while
    // the editor project endpoint stores the actual canvas snapshot.
    // Prefer the persisted canvas on reload; otherwise every refresh would
    // rebuild the editor from the original thumbnail and discard edits.
    const persistedResponse = await editorFetch(`${API_BASE}/api/projects/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (persistedResponse.ok) {
      return persistedResponse.json();
    }

    const response = await editorFetch(`${API_BASE}/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to get editor session');
    }
    const session = await response.json() as {
      velox_project_id: string;
      youtube_video_id: string;
      source_thumbnail_url?: string;
      draft_title?: string;
      created_at: string;
      updated_at: string;
    };
    const thumbnail = safeAssetUrl(session.source_thumbnail_url, session.youtube_video_id);
    return {
      id: session.velox_project_id || id,
      name: session.draft_title || `YouTube thumbnail ${session.youtube_video_id}`,
      type: 'youtube_thumbnail',
      canvas_json: {
        width: 1280,
        height: 720,
        objects: thumbnail ? [{
          id: `youtube-source-${session.youtube_video_id}`,
          type: 'image',
          x: 0,
          y: 0,
          width: 1280,
          height: 720,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
          name: 'YouTube source thumbnail',
          src: thumbnail,
        }] : [],
      },
      preview_url: thumbnail,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };
  }

  const response = await editorFetch(`${API_BASE}/api/projects/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get project');
  }

  return response.json();
}

// Save an existing editor project. Global project creation is retired:
// InstaEdit creates/authorizes the opaque ve_* handle first, and Velox
// persists only the canvas document under that project-scoped route.
export async function saveProject(project: {
  id: string;
  name: string;
  type?: string;
  canvas_json: Record<string, unknown>;
  preview_filename?: string;
}): Promise<{ id: string; message: string }> {
  const response = await editorFetch(`${API_BASE}/api/projects/${encodeURIComponent(project.id)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getCSRFHeaders() },
    body: JSON.stringify(project),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save project');
  }

  const saved = await response.json() as Project;
  return { id: saved.id || project.id, message: 'Project saved' };
}

// Delete a project
export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const response = await editorFetch(`${API_BASE}/api/projects/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete project');
  }

  return response.json();
}

// Get temp file URL
export function getTempFileUrl(filename: string): string {
  return resolveEditorAssetUrl(`temp/${filename}`);
}

// Get project file URL
export function getProjectFileUrl(projectId: string, filename: string): string {
  return `${API_BASE}/api/projects/${projectId}/${filename}`;
}

// =====================
// PRESET MANAGEMENT
// =====================

export interface Preset {
  id: string;
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// List presets
export async function listPresets(): Promise<Preset[]> {
  const response = await editorFetch(`${API_BASE}/api/presets`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list presets');
  }

  return response.json();
}

// Get a preset
export async function getPreset(id: string): Promise<Preset> {
  const response = await editorFetch(`${API_BASE}/api/presets/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get preset');
  }

  return response.json();
}

// Save a preset
export async function savePreset(preset: {
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
}): Promise<{ id: string; message: string }> {
  const response = await editorFetch(`${API_BASE}/api/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save preset');
  }

  return response.json();
}

// Update a preset
export async function updatePreset(id: string, preset: {
  name?: string;
  type?: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
}): Promise<Preset> {
  const response = await editorFetch(`${API_BASE}/api/presets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update preset');
  }

  return response.json();
}

// Delete a preset
export async function deletePreset(id: string): Promise<{ success: boolean }> {
  const response = await editorFetch(`${API_BASE}/api/presets/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete preset');
  }

  return response.json();
}

// =====================
// FOLDER MANAGEMENT
// =====================

export interface ProjectFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
}

// Folder CRUD is exposed by the editor app under its deployment boundary.
// These calls must include the runtime prefix, otherwise the browser resolves
// them against the main InstaEdit SPA instead of the editor API.
const FOLDERS_API_BASE = `${API_BASE}/api/folders`;

// List folders
export async function listFolders(): Promise<ProjectFolder[]> {
  const response = await editorFetch(FOLDERS_API_BASE, { cache: 'no-store' });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list folders');
  }

  return response.json();
}

// Create folder
export async function createFolder(folder: {
  name: string;
  parent_id?: string | null;
}): Promise<ProjectFolder> {
  const response = await editorFetch(FOLDERS_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folder),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create folder');
  }

  return response.json();
}

// Update folder
export async function updateFolder(id: string, folder: {
  name?: string;
  parent_id?: string | null;
}): Promise<ProjectFolder> {
  const response = await editorFetch(`${FOLDERS_API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folder),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update folder');
  }

  return response.json();
}

// Delete folder
export async function deleteFolder(id: string): Promise<{ success: boolean }> {
  const response = await editorFetch(`${FOLDERS_API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete folder');
  }

  return response.json();
}

// Assign project to folder
export async function assignProjectToFolder(projectId: string, folderId: string | null): Promise<{ success: boolean }> {
  const response = await editorFetch(`${API_BASE}/api/projects/${projectId}/folder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_id: folderId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign project to folder');
  }

  return response.json();
}

export interface TranslateRequest {
  text: string;
  target_language: string;
  tone?: string;
  preserve_hashtags?: boolean;
  kind?: 'title' | 'description' | 'text';
}

export interface TranslateResponse {
  ok: boolean;
  source_text: string;
  sanitized_text: string;
  translated_text: string;
  target_language: string;
}

export async function translateText(request: TranslateRequest): Promise<TranslateResponse> {
  const response = await editorFetch(`${API_BASE}/api/v1/youtube/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Translation failed');
  }

  return response.json();
}
