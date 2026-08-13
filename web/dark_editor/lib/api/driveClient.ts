// Drive client — read-only access to the Google Drive PNG library used
// as a canvas asset source.
//
// Talks to the InstaEditor runtime via the primitives in
// lib/api/httpClient (apiGet). The wire type for a drive asset comes
// from lib/api/types.

import { apiGet } from './httpClient';
import { editorRuntimePath } from '@/lib/editor-runtime';
import type { DriveAsset } from './types';

/**
 * Page through the Drive assets of a folder (up to 10 pages). The BFF
 * resolves the Google account server-side; `driveAccountId` is echoed
 * back by the first response and must be passed to subsequent pages.
 */
export async function listDriveAssets(folderId: string, driveAccountId?: number, pageToken?: string): Promise<{ items: DriveAsset[]; next_page_token?: string; drive_account_id: number }> {
  const params = new URLSearchParams({ folder_id: folderId });
  if (driveAccountId) params.set('drive_account_id', String(driveAccountId));
  if (pageToken) params.set('page_token', pageToken);
  return apiGet<{ items: DriveAsset[]; next_page_token?: string; drive_account_id: number }>(
    `/api/v1/drive/assets?${params.toString()}`,
    { cache: 'no-store' },
  );
}

/** Resolve a drive asset's content URL against the runtime boundary. */
export function driveAssetContentUrl(asset: DriveAsset): string {
  if (/^(https?:|data:|blob:)/i.test(asset.content_url)) return asset.content_url;
  return editorRuntimePath(asset.content_url);
}
