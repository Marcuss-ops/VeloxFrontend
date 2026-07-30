/**
 * Projects API — wrappers for project-related BFF endpoints.
 *
 * Projects are the top-level container for a rendering job: a
 * project carries the render_spec template, source assets, and
 * the delivery plan. This module is a thin stub that will grow
 * as the BFF adds project endpoints.
 */

import { apiGet, apiPost } from './client';

/** A project (rendering job container). */
export interface Project {
  id: string;
  name: string;
  workspaceId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Body for creating a project. */
export interface CreateProjectRequest {
  name: string;
  templateId?: string;
}

/** List projects for the current workspace. */
export function listProjects(): Promise<{ projects: Project[] }> {
  return apiGet('/api/v1/projects');
}

/** Get a single project by id. */
export function getProject(id: string): Promise<Project> {
  return apiGet(`/api/v1/projects/${encodeURIComponent(id)}`);
}

/** Create a new project. */
export function createProject(body: CreateProjectRequest): Promise<Project> {
  return apiPost('/api/v1/projects', body);
}

export const projectsApi = {
  listProjects,
  getProject,
  createProject,
};
