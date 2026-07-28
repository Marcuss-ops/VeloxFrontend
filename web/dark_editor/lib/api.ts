// API client for Dark Editor V2
// All endpoints route through the InstaEdit BFF at /api/v1/editor
// which proxies to the Velox master. The browser stays on the same
// origin so the InstaEdit session cookie + CSRF double-submit are
// preserved.

// HTTP infra lives in lib/api/httpClient.ts. We import the bits the
// remaining client wrappers below still need (apiGet/Post/Put/
// Delete/Upload + the requestManager singleton + the two base URLs).
import {
  API_BASE,
  FOLDERS_API_BASE,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,
  requestManager,
} from './api/httpClient';

// Types live in lib/api/types.ts. We import them so the function
// signatures below can reference them locally, then re-export them
// unchanged for back-compat with the 19 existing call sites that
// import them via '@/lib/api'. (Following the refactor plan, new
// code should import these directly from '@/lib/api/types'.)
import type {
  UploadResponse,
  FilterRequest,
  FilterResponse,
  TransformRequest,
  ExportRequest,
  GenerateRequest,
  GenerateResponse,
  UpscaleRequest,
  UpscaleResponse,
  RemoveBgRequest,
  RemoveBgResponse,
  RemoveBgStatusResponse,
  Project,
  Preset,
  ProjectFolder,
  DriveGroup,
  DriveFile,
  DriveLink,
} from './api/types';

export type {
  UploadResponse,
  FilterRequest,
  FilterResponse,
  TransformRequest,
  ExportRequest,
  GenerateRequest,
  GenerateResponse,
  UpscaleRequest,
  UpscaleResponse,
  RemoveBgRequest,
  RemoveBgResponse,
  RemoveBgStatusResponse,
  Project,
  Preset,
  ProjectFolder,
  DriveGroup,
  DriveFile,
  DriveLink,
};

export function extractFilenameFromPath(pathOrUrl: string): string {
  const withoutHash = pathOrUrl.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<UploadResponse>('/upload', formData);
}

export async function applyFilter(request: FilterRequest): Promise<FilterResponse> {
  return apiPost<FilterResponse>('/process/filter', request);
}

export async function transformImage(request: TransformRequest): Promise<FilterResponse> {
  return apiPost<FilterResponse>('/process/transform', request);
}

export async function exportImage(request: ExportRequest): Promise<{ url: string; filename: string }> {
  return apiPost<{ url: string; filename: string }>('/export', request);
}

export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  return apiPost<GenerateResponse>('/generate', request);
}

export async function upscaleImage(request: UpscaleRequest): Promise<UpscaleResponse> {
  return apiPost<UpscaleResponse>('/api/upscale', request);
}

export async function removeBackground(request: RemoveBgRequest): Promise<RemoveBgResponse> {
  const signal = requestManager.getSignal(`remove-bg-${request.filename}`);
  try {
    return await apiPost<RemoveBgResponse>('/api/remove-bg', request, { signal });
  } finally {
    requestManager.clear(`remove-bg-${request.filename}`);
  }
}

export async function getBackgroundRemovalStatus(taskId: string): Promise<RemoveBgStatusResponse> {
  return apiGet<RemoveBgStatusResponse>(`/api/remove-bg/status/${taskId}`);
}

export async function listProjects(type?: string): Promise<Project[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiGet<Project[]>(`/api/projects${query}`);
}

export async function getProject(id: string): Promise<Project> {
  return apiGet<Project>(`/api/projects/${id}`);
}

export async function saveProject(project: {
  id?: string;
  name: string;
  type?: string;
  canvas_json: Record<string, unknown>;
  preview_filename?: string;
}): Promise<{ id: string; message: string }> {
  return apiPost<{ id: string; message: string }>('/api/projects', project);
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/projects/${id}`);
}

export function getTempFileUrl(filename: string): string {
  return `${API_BASE}/temp/${filename}`;
}

export function getProjectFileUrl(projectId: string, filename: string): string {
  return `${API_BASE}/projects/${projectId}/${filename}`;
}



export async function listPresets(): Promise<Preset[]> {
  return apiGet<Preset[]>('/api/presets');
}

export async function getPreset(id: string): Promise<Preset> {
  return apiGet<Preset>(`/api/presets/${id}`);
}

export async function savePreset(preset: {
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
}): Promise<{ id: string; message: string }> {
  return apiPost<{ id: string; message: string }>('/api/presets', preset);
}

export async function updatePreset(id: string, preset: {
  name?: string;
  type?: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
}): Promise<Preset> {
  return apiPut<Preset>(`/api/presets/${id}`, preset);
}

export async function deletePreset(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/presets/${id}`);
}



export async function listFolders(): Promise<ProjectFolder[]> {
  return apiGet<ProjectFolder[]>(FOLDERS_API_BASE, { cache: 'no-store' });
}

export async function createFolder(folder: {
  name: string;
  parent_id?: string | null;
}): Promise<ProjectFolder> {
  return apiPost<ProjectFolder>(FOLDERS_API_BASE, folder);
}

export async function updateFolder(id: string, folder: {
  name?: string;
  parent_id?: string | null;
}): Promise<ProjectFolder> {
  return apiPut<ProjectFolder>(`${FOLDERS_API_BASE}/${id}`, folder);
}

export async function deleteFolder(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`${FOLDERS_API_BASE}/${id}`);
}

export async function assignProjectToFolder(projectId: string, folderId: string | null): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>(`/api/projects/${projectId}/folder`, { folder_id: folderId });
}



export async function getDriveGroups(): Promise<DriveGroup[]> {
  const data = await apiGet<{ groups: DriveGroup[] }>('/api/drive/groups');
  return data.groups || [];
}

export async function getDriveFiles(folderId?: string): Promise<DriveFile[]> {
  const query = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : '';
  const data = await apiGet<{ files: DriveFile[] }>(`/api/drive/files${query}`);
  return data.files || [];
}

export async function uploadToDrive(file: File, folderId?: string): Promise<{ success: boolean; file_id?: string; web_view_link?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folder_id', folderId);
  return apiUpload<{ success: boolean; file_id?: string; web_view_link?: string }>('/api/drive/upload', formData);
}

export async function createDriveFolder(name: string, parentId?: string): Promise<{ id: string; name: string; webViewLink?: string }> {
  return apiPost<{ id: string; name: string; webViewLink?: string }>('/api/drive/folders', { name, parent_id: parentId });
}

export async function listDriveFolders(parentId?: string): Promise<Array<{ id: string; name: string }>> {
  const query = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : '';
  const data = await apiGet<{ folders: Array<{ id: string; name: string }> }>(`/api/drive/folders${query}`);
  return data.folders || [];
}



export async function getDriveLinks(): Promise<DriveLink[]> {
  const data = await apiGet<{ links: DriveLink[] }>('/api/drive/links');
  return data.links || [];
}

const DRIVE_LINK_PARENT_NAMES: Record<string, string> = {
  '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh': 'Stock Master',
  '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS': 'Clips',
  '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A': 'Voiceover',
  '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ': 'Copertine',
  'folder-1772027317539': 'Video',
};

const COPERTINE_PARENT_ID = '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ';

export async function getDriveLinksByCategory(): Promise<Record<string, DriveLink[]>> {
  const links = await getDriveLinks();
  const categories: Record<string, DriveLink[]> = {};

  for (const link of links) {
    if (link.parentId) {
      const categoryName = DRIVE_LINK_PARENT_NAMES[link.parentId] || link.parentId;
      categories[categoryName] = categories[categoryName] || [];
      categories[categoryName].push(link);
    } else {
      categories['Root'] = categories['Root'] || [];
      categories['Root'].push(link);
    }
  }

  return categories;
}

export async function getCopertineFolders(): Promise<DriveLink[]> {
  const links = await getDriveLinks();

  return links.filter(
    (link) =>
      link.parentId === COPERTINE_PARENT_ID ||
      link.name.toLowerCase().includes('copertin') ||
      link.id === COPERTINE_PARENT_ID
  );
}
