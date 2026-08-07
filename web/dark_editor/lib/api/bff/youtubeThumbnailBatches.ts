import { bffFetch } from './types';

export interface YouTubeThumbnailBatchItemRequest {
  platform_account_id: number;
  youtube_video_id: string;
  variant_id: string;
  thumbnail_media_id: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface YouTubeThumbnailBatchCreateResponse {
  batch_id: string;
  status: string;
  total: number;
  completed?: number;
  failed?: number;
}

export interface YouTubeThumbnailBatchItemStatus {
  id: number;
  batch_id: string;
  platform_account_id: number;
  youtube_video_id: string;
  variant_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  editor_session_id?: string;
  public_url?: string;
  last_error?: string;
}

export interface YouTubeThumbnailBatchStatusResponse {
  batch_id: string;
  status: 'queued' | 'processing' | 'completed' | 'partial' | 'failed' | string;
  total: number;
  completed: number;
  failed: number;
  items: YouTubeThumbnailBatchItemStatus[];
  last_error?: string;
}

export async function createYouTubeThumbnailBatch(
  groupId: number,
  items: YouTubeThumbnailBatchItemRequest[],
  idempotencyKey: string,
): Promise<YouTubeThumbnailBatchCreateResponse> {
  return bffFetch<YouTubeThumbnailBatchCreateResponse>('/api/v1/youtube/thumbnail-batches', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ group_id: groupId, items }),
  });
}

export function getYouTubeThumbnailBatch(batchId: string): Promise<YouTubeThumbnailBatchStatusResponse> {
  return bffFetch<YouTubeThumbnailBatchStatusResponse>(
    `/api/v1/youtube/thumbnail-batches/${encodeURIComponent(batchId)}`,
  );
}
