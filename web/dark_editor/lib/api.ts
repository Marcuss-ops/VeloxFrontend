// API client for Dark Editor V2
// All endpoints route through the InstaEdit BFF at /api/v1/editor
// which proxies to the Velox master. The browser stays on the same
// origin so the InstaEdit session cookie + CSRF double-submit are
// preserved.

// HTTP infra lives in lib/api/httpClient.ts. We import the bits the
// remaining drive wrappers below still need: apiGet / apiPost /
// apiPut / apiDelete + apiUpload (for uploadToDrive, which will
// move to lib/api/driveClient.ts in commit 8).
//
// FOLDERS_API_BASE has dropped because the folder wrappers all
// moved to lib/api/folderClient.ts.
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,
} from './api/httpClient';

// Types live in lib/api/types.ts. We import all 17 here because the
// `export type { ... }` block immediately below needs them in local
// scope (the `export type { X } from './m'` form does NOT bind the
// names locally — same TS2304 footgun we fixed in commit 1).
//
// Even though most of these types are no longer referenced by the
// surviving client wrappers in api.ts itself, the back-compat barrel
// must keep re-exporting all 17 names because 19 call sites
// (e.g. app/DarkEditorHome.tsx's `import { type Project }`) import
// them through '@/lib/api'. Following the refactor plan, new code
// should import these directly from '@/lib/api/types'.
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

// URL helpers live in lib/api/utils.ts — re-exported here for
// back-compat so existing call sites (`@/lib/api`) keep working.
export {
  extractFilenameFromPath,
  getTempFileUrl,
  getProjectFileUrl,
} from './api/utils';

// Media client lives in lib/api/mediaClient.ts — re-exported here
// for back-compat so existing call sites (`@/lib/api`) keep working.
export {
  uploadImage,
  applyFilter,
  transformImage,
  exportImage,
  generateImage,
  upscaleImage,
  removeBackground,
  getBackgroundRemovalStatus,
} from './api/mediaClient';

// Project client lives in lib/api/projectClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working.
export {
  listProjects,
  getProject,
  saveProject,
  deleteProject,
} from './api/projectClient';





// Preset client lives in lib/api/presetClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working.
export {
  listPresets,
  getPreset,
  savePreset,
  updatePreset,
  deletePreset,
} from './api/presetClient';



// Folder client lives in lib/api/folderClient.ts — re-exported
// here for back-compat so existing call sites (`@/lib/api`) keep
// working.
export {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  assignProjectToFolder,
} from './api/folderClient';



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
