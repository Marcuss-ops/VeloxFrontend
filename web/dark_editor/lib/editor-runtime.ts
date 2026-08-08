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
