// ------------------------------------------------------------------
// Media upload — used by the dark editor to store thumbnails in
// InstaEdit before publishing them to YouTube.
//
// Lives in lib/api/bff/upload.ts (commit 5 of the api-bff refactor
// series). Re-exported at lib/api/bff.ts (the barrel) so legacy
// `@/lib/api/bff` callers (ExportDialog) keep working without
// import-path churn.
//
// `PresignMediaResponse` is the wire-level contract declared in
// lib/api/bff/types.ts (extracted in commit 1) — consumed here via
// a `type` import to keep types.ts the canonical source of truth
// for response shapes.
// ------------------------------------------------------------------

import type { PresignMediaResponse } from './types';
import { bffFetch, sha256Hex } from './types';

export async function uploadMediaAsset(blob: Blob, filename: string): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(blob.type)) {
    throw new Error('Unsupported thumbnail format. Only JPEG and PNG are allowed.');
  }
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error('Thumbnail exceeds 2 MB limit.');
  }

  const presign = await bffFetch<PresignMediaResponse>('/api/v1/media/presign', {
    method: 'POST',
    body: JSON.stringify({
      filename,
      content_type: blob.type,
      size_bytes: blob.size,
      sha256: await sha256Hex(blob),
    }),
  });

  const putRes = await fetch(presign.upload_url, {
    method: presign.upload_method || 'PUT',
    headers: { 'Content-Type': blob.type, ...(presign.upload_headers || {}) },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Storage upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  const completed = await bffFetch<{ id: string }>(`/api/v1/media/${presign.asset_id}/complete`, {
    method: 'POST',
  });
  return completed.id;
}

export async function updateEditorSessionThumbnail(
  veloxProjectId: string,
  thumbnailMediaId: string
): Promise<void> {
  await bffFetch(`/api/v1/youtube/editor-sessions/by-project/${encodeURIComponent(veloxProjectId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ thumbnail_media_id: thumbnailMediaId }),
  });
}