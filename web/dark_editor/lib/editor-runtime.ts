/**
 * Runtime URL helpers for the separately deployed InstaEditor.
 *
 * The compatibility prefix is an infrastructure boundary for the current
 * Next deployment. Product/application code should use these helpers rather
 * than treating the prefix as an editor feature or navigation concept.
 */
export const EDITOR_COMPATIBILITY_BASE_PATH = '/instaeditor';

export function editorRuntimePath(path: string): string {
  if (!path) return EDITOR_COMPATIBILITY_BASE_PATH;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith(`${EDITOR_COMPATIBILITY_BASE_PATH}/`) || path === EDITOR_COMPATIBILITY_BASE_PATH) {
    return path;
  }
  return `${EDITOR_COMPATIBILITY_BASE_PATH}/${path.replace(/^\/+/, '')}`;
}

export function editorApiPath(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  return editorRuntimePath(normalized.startsWith('api/') ? normalized : `api/${normalized}`);
}

/** API path for the project-scoped InstaEditor BFF. */
export function editorBffPath(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  return editorRuntimePath(normalized.startsWith('api/v1/editor/') ? normalized : `api/v1/editor/${normalized}`);
}

export function editorAssetPath(path: string): string {
  return editorRuntimePath(path);
}

export function editorProjectContextPath(projectId: string): string {
  return editorApiPath(`v1/youtube/editor-sessions/by-project/${encodeURIComponent(projectId)}`);
}

/**
 * Origin of the InstaEdit SPA the editor hands back to. The editor is a
 * separately deployed app (often a different host than the SPA), so the
 * return destination must be configured explicitly; `app.instaedit.org`
 * is the production default.
 */
export const INSTAEDIT_APP_URL = (process.env.NEXT_PUBLIC_INSTAEDIT_URL ?? 'https://app.instaedit.org').replace(/\/+$/, '');

/**
 * Relative InstaEdit SPA path the user should return to after leaving the
 * editor (read from the launch URL's `return_to` query parameter, stamped
 * by the InstaEdit SPA when it opens the editor). Falls back to the
 * Copertine hub when no return context was provided.
 */
export function editorReturnToPath(): string {
  if (typeof window === 'undefined') return '/app/covers';
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('return_to')?.trim();
  if (returnTo && returnTo.startsWith('/') && !/^\/\//.test(returnTo)) return returnTo;
  return '/app/covers';
}

/**
 * Absolute return URL on the InstaEdit SPA — the destination of the
 * in-editor Home / back pill.
 */
export function editorReturnToUrl(): string {
  return `${INSTAEDIT_APP_URL}${editorReturnToPath()}`;
}
