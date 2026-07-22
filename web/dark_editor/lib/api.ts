// API client for Dark Editor V2
// All endpoints point to Go backend at /dark_editor_v2
// Single source of truth: Go backend owns all APIs

// Use relative path - Go backend is the single owner of APIs
// Browser will call directly to Go backend (port 8000) or through gateway
const API_BASE = '/dark_editor_v2';

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

// Upload an image
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/upload`, {
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
  const response = await fetch(`${API_BASE}/process/filter`, {
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
  const response = await fetch(`${API_BASE}/process/transform`, {
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
  const response = await fetch(`${API_BASE}/export`, {
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
  const response = await fetch(`${API_BASE}/generate`, {
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
  const response = await fetch(`${API_BASE}/api/upscale`, {
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

// Remove background
export async function removeBackground(request: RemoveBgRequest): Promise<RemoveBgResponse> {
  const signal = requestManager.getSignal(`remove-bg-${request.filename}`);
  
  const response = await fetch(`${API_BASE}/api/remove-bg`, {
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
  const response = await fetch(`${API_BASE}/api/remove-bg/status/${taskId}`);
  
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
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list projects');
  }
  
  return response.json();
}

// Get a project
export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/api/projects/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get project');
  }
  
  return response.json();
}

// Save a project
export async function saveProject(project: {
  id?: string;
  name: string;
  type?: string;
  canvas_json: Record<string, unknown>;
  preview_filename?: string;
}): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save project');
  }
  
  return response.json();
}

// Delete a project
export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/api/projects/${id}`, {
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
  return `${API_BASE}/temp/${filename}`;
}

// Get project file URL
export function getProjectFileUrl(projectId: string, filename: string): string {
  return `${API_BASE}/projects/${projectId}/${filename}`;
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
  const response = await fetch(`${API_BASE}/api/presets`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list presets');
  }
  
  return response.json();
}

// Get a preset
export async function getPreset(id: string): Promise<Preset> {
  const response = await fetch(`${API_BASE}/api/presets/${id}`);
  
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
  const response = await fetch(`${API_BASE}/api/presets`, {
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
  const response = await fetch(`${API_BASE}/api/presets/${id}`, {
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
  const response = await fetch(`${API_BASE}/api/presets/${id}`, {
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

// Folder CRUD is exposed by the dark editor app under its Next.js basePath.
// These calls must include the basePath, otherwise the browser resolves them
// against `/api/*` and receives an HTML page instead of JSON.
const FOLDERS_API_BASE = `${API_BASE}/api/folders`;

// List folders
export async function listFolders(): Promise<ProjectFolder[]> {
  const response = await fetch(FOLDERS_API_BASE, { cache: 'no-store' });
  
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
  const response = await fetch(FOLDERS_API_BASE, {
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
  const response = await fetch(`${FOLDERS_API_BASE}/${id}`, {
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
  const response = await fetch(`${FOLDERS_API_BASE}/${id}`, {
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
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/folder`, {
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

// =====================
// DRIVE INTEGRATION
// =====================

export interface DriveGroup {
  name: string;
  folder_id?: string;
  channels?: Array<{
    id?: string;
    channel?: string;
    url?: string;
    title?: string;
    thumbnail?: string;
  }>;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  size?: number;
}

// Get Drive groups (channel groups)
export async function getDriveGroups(): Promise<DriveGroup[]> {
  const response = await fetch(`${API_BASE}/api/drive/groups`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Drive groups');
  }
  
  const data = await response.json();
  return data.groups || [];
}

// Get Drive files in a folder
export async function getDriveFiles(folderId?: string): Promise<DriveFile[]> {
  const url = folderId 
    ? `${API_BASE}/api/drive/files?folder_id=${encodeURIComponent(folderId)}`
    : `${API_BASE}/api/drive/files`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Drive files');
  }
  
  const data = await response.json();
  return data.files || [];
}

// Upload to Drive
export async function uploadToDrive(file: File, folderId?: string): Promise<{ success: boolean; file_id?: string; web_view_link?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folder_id', folderId);
  
  const response = await fetch(`${API_BASE}/api/drive/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload to Drive');
  }
  
  return response.json();
}

// Create folder on Drive
export async function createDriveFolder(name: string, parentId?: string): Promise<{ id: string; name: string; webViewLink?: string }> {
  const response = await fetch(`${API_BASE}/api/drive/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent_id: parentId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create Drive folder');
  }
  
  return response.json();
}

// List Drive folders (subfolders of a parent folder)
export async function listDriveFolders(parentId?: string): Promise<Array<{ id: string; name: string }>> {
  const url = parentId 
    ? `${API_BASE}/api/drive/folders?parent_id=${encodeURIComponent(parentId)}`
    : `${API_BASE}/api/drive/folders`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list Drive folders');
  }
  
  const data = await response.json();
  return data.folders || [];
}

// =====================
// DRIVE LINKS (Copertine)
// =====================

export interface DriveLink {
  id: string;
  name: string;
  link: string;
  parentId?: string;
  language?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Get Drive links from drive_links.json
export async function getDriveLinks(): Promise<DriveLink[]> {
  const response = await fetch(`${API_BASE}/api/drive/links`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Drive links');
  }
  
  const data = await response.json();
  return data.links || [];
}

// Get Drive links organized by category (Copertine, Clips, etc.)
export async function getDriveLinksByCategory(): Promise<Record<string, DriveLink[]>> {
  const links = await getDriveLinks();
  
  // Group by parent folder name
  const categories: Record<string, DriveLink[]> = {};
  
  // Known parent folders
  const parentNames: Record<string, string> = {
    '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh': 'Stock Master',
    '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS': 'Clips',
    '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A': 'Voiceover',
    '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ': 'Copertine',
    'folder-1772027317539': 'VideoYoutube',
  };
  
  for (const link of links) {
    if (link.parentId) {
      const categoryName = parentNames[link.parentId] || link.parentId;
      if (!categories[categoryName]) {
        categories[categoryName] = [];
      }
      categories[categoryName].push(link);
    } else {
      // Root level folder
      if (!categories['Root']) {
        categories['Root'] = [];
      }
      categories['Root'].push(link);
    }
  }
  
  return categories;
}

// Get Copertine folders (for thumbnail exports)
export async function getCopertineFolders(): Promise<DriveLink[]> {
  const links = await getDriveLinks();
  
  // Find folders under "Copertine" parent
  const copertineParentId = '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ';
  
  return links.filter(link => 
    link.parentId === copertineParentId || 
    link.name.toLowerCase().includes('copertin') ||
    link.id === copertineParentId
  );
}

