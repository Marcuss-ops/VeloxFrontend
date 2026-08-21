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
  return response.items
    .filter((project) => project.status !== 'archived' && project.status !== 'deleted')
    .filter((project) => project.description?.includes(`[instaedit-group:${groupId}]`));
}

export async function getMediaPreview(mediaId: string): Promise<string> {
  const detail = await bffFetch<MediaDetail>(`/api/v1/media/${encodeURIComponent(mediaId)}`);
  return detail.preview_url || '';
}
