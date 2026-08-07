// Keep this in lockstep with the InstaEdit BFF parser: 128 characters
// total, including the mandatory `ve_` prefix.
const PROJECT_ID_PATTERN = /^ve_[A-Za-z0-9_-]{1,125}$/;

const RETIRED_YOUTUBE_CATALOG_PREFIXES = [
  '/groups',
  '/channels',
  '/feed',
  '/group-videos',
  '/group-private-videos',
  '/videos',
] as const;

export function isScopedEditorProjectId(value: string): boolean {
  return PROJECT_ID_PATTERN.test(value.trim());
}

export function isRetiredYouTubeCatalogPath(path: string): boolean {
  return RETIRED_YOUTUBE_CATALOG_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export type ProjectAuthorization =
  | { ok: true }
  | { ok: false; status: 401 | 404 | 410 | 503; error: string };

/**
 * Validate the opaque project handle through InstaEdit before touching
 * Velox-local canvas persistence. The browser cookie is forwarded only
 * to the canonical InstaEdit session gate; no user/project headers are
 * trusted from the client.
 */
export async function authorizeEditorProject(
  request: Request,
  projectId: string,
): Promise<ProjectAuthorization> {
  if (!isScopedEditorProjectId(projectId)) {
    return { ok: false, status: 410, error: 'editor_project_context_required' };
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return { ok: false, status: 401, error: 'authentication required' };
  }

  const baseURL = process.env.DARK_EDITOR_API_BASE ?? 'http://localhost:8000';
  try {
    const response = await fetch(
      `${baseURL}/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(projectId)}`,
      {
        method: 'GET',
        headers: { cookie, accept: 'application/json' },
        cache: 'no-store',
      },
    );

    if (response.ok) return { ok: true };
    if (response.status === 401) return { ok: false, status: 401, error: 'authentication required' };
    if (response.status === 404 || response.status === 403) {
      return { ok: false, status: 404, error: 'editor project context not found' };
    }
    return { ok: false, status: 503, error: 'editor project authorization unavailable' };
  } catch {
    return { ok: false, status: 503, error: 'editor project authorization unavailable' };
  }
}
