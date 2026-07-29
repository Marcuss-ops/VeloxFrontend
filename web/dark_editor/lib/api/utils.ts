// URL / filename helpers for the Dark Editor.
//
// Lives separately from lib/api/types.ts (which carries wire-level
// interface types) and lib/api/httpClient.ts (which carries HTTP
// infra). This module owns the BFF URL builders + the filename
// extractor used by __tests__/apiUtils.test.ts and a handful of
// components that need to render <img src> or <a href> tags.

import { API_BASE } from './httpClient';

/** Extract the basename from a full URL or path, stripping query
 *  string + hash fragment. Returns '' for empty input. */
export function extractFilenameFromPath(pathOrUrl: string): string {
  const withoutHash = pathOrUrl.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

/** Absolute URL for a temp-uploaded file (pre-save). */
export function getTempFileUrl(filename: string): string {
  return `${API_BASE}/temp/${filename}`;
}

/** Absolute URL for a file attached to a saved project. */
export function getProjectFileUrl(projectId: string, filename: string): string {
  return `${API_BASE}/projects/${projectId}/${filename}`;
}
