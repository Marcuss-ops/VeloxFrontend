// Media client — upload / filter / transform / export / generate /
// upscale / YouTube-grab / background-removal for the InstaEditor.
//
// Talks to the InstaEditor runtime via the primitives in
// lib/api/httpClient (apiPost / apiGet / apiUpload + the
// requestManager singleton that backs removeBackground). Wire
// types come from lib/api/types.

import { apiGet, apiPost, apiUpload, requestManager } from './httpClient';
import type {
  UploadResponse,
  FilterRequest,
  FilterResponse,
  TransformRequest,
  ExportRequest,
  GenerateRequest,
  GenerateResponse,
  UpscaleRequest,
  UpscaleResponse,
  YouTubeGrabRequest,
  YouTubeGrabResponse,
  RemoveBgRequest,
  RemoveBgResponse,
  RemoveBgStatusResponse,
} from './types';

// Upload an image
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<UploadResponse>('/api/upload', formData);
}

// Apply a filter to an image
export async function applyFilter(request: FilterRequest): Promise<FilterResponse> {
  return apiPost<FilterResponse>('/process/filter', request);
}

// Transform an image (crop/resize)
export async function transformImage(request: TransformRequest): Promise<FilterResponse> {
  return apiPost<FilterResponse>('/process/transform', request);
}

// Export an image
export async function exportImage(request: ExportRequest): Promise<{ url: string; filename: string }> {
  return apiPost<{ url: string; filename: string }>('/export', request);
}

// Generate an image using AI
export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  return apiPost<GenerateResponse>('/generate', request);
}

export async function upscaleImage(request: UpscaleRequest): Promise<UpscaleResponse> {
  return apiPost<UpscaleResponse>('/api/upscale', request);
}

// Grab YouTube thumbnail
export async function grabYouTubeThumbnail(request: YouTubeGrabRequest): Promise<YouTubeGrabResponse> {
  return apiPost<YouTubeGrabResponse>('/api/tools/youtube_grab', request);
}

// Remove background
export async function removeBackground(request: RemoveBgRequest): Promise<RemoveBgResponse> {
  const signal = requestManager.getSignal(`remove-bg-${request.filename}`);
  try {
    return await apiPost<RemoveBgResponse>('/api/remove-bg', request, { signal });
  } finally {
    requestManager.clear(`remove-bg-${request.filename}`);
  }
}

// Get background removal status
export async function getBackgroundRemovalStatus(taskId: string): Promise<RemoveBgStatusResponse> {
  return apiGet<RemoveBgStatusResponse>(`/api/remove-bg/status/${taskId}`);
}
