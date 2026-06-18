import { fetchJSON } from './client';
import type { YouTubeVideo } from './types';

const BASE = '/dark_editor_v2/api/v1/youtube';

export interface TranslateTextResponse {
  ok: boolean;
  source_text: string;
  sanitized_text: string;
  translated_text: string;
  target_language: string;
  provider: string;
}

export interface CoverVariant {
  id: string;
  label: string;
  prompt: string;
  negative_prompt: string;
  headline: string;
  hook: string;
  filename?: string;
  image_base64?: string;
  width: number;
  height: number;
  seed: number;
  provider?: string;
  translation?: string;
}

export interface GenerateCoverPackResponse {
  ok: boolean;
  title: string;
  sanitized_title: string;
  translated_title: string;
  translated_body?: string;
  target_language: string;
  style: string;
  variant_count: number;
  provider: string;
  warnings?: string[];
  variants: CoverVariant[];
}

export interface ApplyBulkCoverResponse {
  ok: boolean;
  channel_id: string;
  variant_id?: string;
  cover_file?: string;
  cover_size_mb?: number;
  privacy?: string;
  results: Array<{
    video_id: string;
    ok: boolean;
    thumbnail_url?: string;
    privacy?: string;
    size_bytes?: number;
    error?: string;
  }>;
  applied_count: number;
  failed_count: number;
  message: string;
}

export async function translateText(
  text: string,
  targetLanguage: string,
  options?: { tone?: string; preserveHashtags?: boolean }
): Promise<TranslateTextResponse> {
  return fetchJSON<TranslateTextResponse>(`${BASE}/ai/translate`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      target_language: targetLanguage,
      tone: options?.tone,
      preserve_hashtags: options?.preserveHashtags,
    }),
  });
}

export async function generateCoverPack(payload: {
  title: string;
  description?: string;
  target_language?: string;
  style?: string;
  extra_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  variant_count?: number;
}): Promise<GenerateCoverPackResponse> {
  return fetchJSON<GenerateCoverPackResponse>(`${BASE}/ai/covers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function applyBulkCover(payload: {
  channel_id: string;
  video_ids: string[];
  variant_id?: string;
  cover_base64: string;
  cover_filename?: string;
  publish?: boolean;
  privacy?: 'private' | 'unlisted' | 'public';
  max_size_mb?: number;
}): Promise<ApplyBulkCoverResponse> {
  return fetchJSON<ApplyBulkCoverResponse>(`${BASE}/videos/bulk-cover`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getVideoChannelId(video: YouTubeVideo, fallbackChannelId?: string): string {
  return video.channel_id || fallbackChannelId || '';
}
