// Drive client \u2014 Google Drive integration for the Dark Editor:
// groups, files, uploads, folder management, the link index, and
// the category + copertine helpers consumed by the asset browser.
//
// Talks to the InstaEdit BFF via the primitives in
// lib/api/httpClient (apiGet / apiPost / apiUpload). Wire types
// come from lib/api/types.

import { apiGet, apiPost, apiUpload } from './httpClient';
import type { DriveGroup, DriveFile, DriveLink } from './types';

// ------------------------------------------------------------------
// Drive folders + groups
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Drive links index \u2014 flat list + parent-derived categories +
// copertine-only filter
// ------------------------------------------------------------------

export async function getDriveLinks(): Promise<DriveLink[]> {
  const data = await apiGet<{ links: DriveLink[] }>('/api/drive/links');
  return data.links || [];
}

/** Human-friendly category names keyed by parent folder id. */
const DRIVE_LINK_PARENT_NAMES: Record<string, string> = {
  '1wt4hqmHD5qEsNhpUUBszlRkSHhyFgtGh': 'Stock Master',
  '1ID_oFJF15Q5nmiZF0d2NaJeKhsOJpQNS': 'Clips',
  '1wFhLmyyIH5rKSbtQuCuua9a2LKQymA8A': 'Voiceover',
  '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ': 'Copertine',
  'folder-1772027317539': 'Video',
};

/** Hard-coded parent id for the Copertine folder. */
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
