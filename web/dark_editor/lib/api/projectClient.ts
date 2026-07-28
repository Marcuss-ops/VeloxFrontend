// Project client — list / read / write / delete for the Dark
// Editor's canvas projects.
//
// Talks to the InstaEdit BFF via the primitives in
// lib/api/httpClient (apiGet / apiPost / apiDelete). The wire
// type for a project row comes from lib/api/types.
//
// Note: `assignProjectToFolder` is a project-mutating operation
// (its endpoint is /api/projects/{id}/folder) but lives in the
// folderClient module because it sets the project's folder
// pointer and is grouped semantically with the rest of the folder
// management surface.

import { apiGet, apiPost, apiDelete } from './httpClient';
import type { Project } from './types';

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
