// Folder client — list / create / update / delete for the Dark
// Editor's project folder tree, plus the project\u2192folder binding
// helper (assignProjectToFolder).
//
// Talks to the InstaEdit BFF via the primitives in
// lib/api/httpClient (apiGet / apiPost / apiPut / apiDelete) and
// reuses the FOLDERS_API_BASE constant. The wire type for a folder
// comes from lib/api/types.
//
// `assignProjectToFolder` is grouped here even though the endpoint
// it calls lives under /api/projects/{id}/folder: semantically it
// sets a project's folder pointer and is part of the folder
// management surface from the operator's POV.

import { FOLDERS_API_BASE, apiGet, apiPost, apiPut, apiDelete } from './httpClient';
import type { ProjectFolder } from './types';

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
