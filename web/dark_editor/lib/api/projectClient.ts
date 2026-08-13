// Project client — list / read / write / delete for the InstaEditor's
// canvas projects.
//
// Talks to the InstaEditor runtime via the primitives in
// lib/api/httpClient (apiGet / apiDelete / editorFetch /
// editorProjectFetch). The wire type for a project row comes from
// lib/api/types.
//
// `ve_*` sessions are owned by the InstaEdit backend: their document is
// read/written through the project-scoped BFF route, not the local
// project catalog. The non-ve_* path keeps the legacy catalog API.
//
// Note: `assignProjectToFolder` is a project-mutating operation but
// lives in folderClient (it sets the project's folder pointer and is
// grouped semantically with the folder management surface).

import { apiDelete, API_BASE, editorFetch, editorImageProxyUrl, editorProjectFetch } from './httpClient';
import { isScopedProjectId } from '../project-scope';
import type { Project } from './types';

function safeAssetUrl(value: string | undefined, videoId?: string): string {
  if (value && (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/'))) {
    return value;
  }
  return videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : '';
}

function normalizeCanvasImages(canvasJson: Record<string, unknown>): Record<string, unknown> {
  const objects = Array.isArray(canvasJson.objects) ? canvasJson.objects : [];
  return {
    ...canvasJson,
    objects: objects.map((value) => {
      if (!value || typeof value !== 'object') return value;
      const object = value as Record<string, unknown>;
      return typeof object.src === 'string' ? { ...object, src: editorImageProxyUrl(object.src) } : object;
    }),
  };
}

// List projects — the global project catalog was retired: InstaEdit owns
// the only real catalog, so there is nothing to list on this side.
export async function listProjects(_type?: string): Promise<Project[]> {
  return [];
}

// Get a project
export async function getProject(id: string): Promise<Project> {
  if (isScopedProjectId(id)) {
    // The old local /api/projects catalog does not own ve_* projects. Read the
    // persisted document through the project-scoped InstaEdit BFF instead.
    const persistedResponse = await editorProjectFetch(id, `projects/${encodeURIComponent(id)}/document`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (persistedResponse.ok) {
      const document = await persistedResponse.json() as Record<string, unknown>;
      if (document.document_exists !== false) {
        const now = new Date().toISOString();
        return {
          id,
          name: `YouTube thumbnail ${id}`,
          type: 'youtube_thumbnail',
          canvas_json: normalizeCanvasImages(document),
          preview_url: '',
          created_at: now,
          updated_at: now,
        };
      }
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
    const thumbnail = editorImageProxyUrl(safeAssetUrl(session.source_thumbnail_url, session.youtube_video_id));
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

  // Non-scoped ids have no owner: the global /api/projects catalog is
  // retired (410) and the local projects.json store was removed. Fail with
  // a clear error instead of silently hitting a dead endpoint.
  throw new Error(
    `Project ${id} is not an InstaEdit-scoped project: only ve_*/vx_* handles are readable.`,
  );
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
  if (isScopedProjectId(project.id)) {
    const response = await editorProjectFetch(project.id, `projects/${encodeURIComponent(project.id)}/document`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeCanvasImages(project.canvas_json)),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save editor document');
    }
    return { id: project.id, message: 'Project saved' };
  }

  // The legacy global catalog was retired: non-scoped projects have no
  // owner. Fail with a clear error instead of writing to a dead endpoint.
  throw new Error(
    `Project ${project.id} is not an InstaEdit-scoped project: only ve_*/vx_* handles can be saved.`,
  );
}

// Delete a project — only InstaEdit-scoped projects exist; the legacy
// global catalog (and its local projects.json store) is gone.
export async function deleteProject(id: string): Promise<{ success: boolean }> {
  if (!isScopedProjectId(id)) {
    throw new Error(
      `Project ${id} is not an InstaEdit-scoped project: only ve_*/vx_* handles can be deleted.`,
    );
  }
  return apiDelete<{ success: boolean }>(`/api/projects/${id}`);
}
