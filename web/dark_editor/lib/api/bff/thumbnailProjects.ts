import { bffFetch } from './client';

export interface ThumbnailProjectDraft {
  id: string;
  workspace_id: number;
  name: string;
  description: string;
  status: string;
  preview_media_id?: string | null;
  updated_at: string;
}

interface ThumbnailProjectListResponse { items: ThumbnailProjectDraft[] }
interface MediaDetail { preview_url?: string; filename?: string }

export async function listGroupThumbnailDrafts(workspaceId: number, groupId: number): Promise<ThumbnailProjectDraft[]> {
  const response = await bffFetch<ThumbnailProjectListResponse>(`/api/v1/thumbnail-projects?workspace_id=${workspaceId}`);
  const drafts = response.items
    .filter((project) => project.status !== 'archived' && project.status !== 'deleted')
    .filter((project) => project.description?.includes(`[instaedit-group:${groupId}]`));
  await Promise.all(drafts.filter((project) => !project.preview_media_id).map(async (project) => {
    try {
      const assets = await bffFetch<{ items?: Array<{ media_id?: string }> }>(`/api/v1/thumbnail-projects/${encodeURIComponent(project.id)}/assets?workspace_id=${workspaceId}`);
      project.preview_media_id = assets.items?.find((asset) => asset.media_id)?.media_id || null;
    } catch {
      // Keep the draft selectable even when its preview is not available.
    }
  }));
  return drafts;
}

export async function getMediaPreview(mediaId: string): Promise<string> {
  const detail = await bffFetch<MediaDetail>(`/api/v1/media/${encodeURIComponent(mediaId)}`);
  return detail.preview_url || '';
}
