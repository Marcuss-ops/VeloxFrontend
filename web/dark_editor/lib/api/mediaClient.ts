// Media client — upload / filter / transform / export / generate /
// upscale / background-removal for the Dark Editor.
//
// Talks to the InstaEdit BFF via the primitives in
// lib/api/httpClient (apiPost / apiGet / apiUpload + the
// requestManager singleton that backs removeBackground). Wire
// types come from lib/api/types.

import { apiPost, apiUpload, apiGet, requestManager } from './httpClient';
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
  RemoveBgRequest,
  RemoveBgResponse,
  RemoveBgStatusResponse,
} from './types';

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<UploadResponse>('/upload', formData);
}

export async function applyFilter(request: FilterRequest): Promise<FilterResponse> {
  return apiPost<FilterResponse>('/process/filter', request);
}

export async function transformImage(request: TransformRequest): Promise<FilterResponse> {
  return apiPost<FilterResponse>('/process/transform', request);
}

export async function exportImage(request: ExportRequest): Promise<{ url: string; filename: string }> {
  return apiPost<{ url: string; filename: string }>('/export', request);
}

export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  return apiPost<GenerateResponse>('/generate', request);
}

export async function upscaleImage(request: UpscaleRequest): Promise<UpscaleResponse> {
  return apiPost<UpscaleResponse>('/api/upscale', request);
}

export async function removeBackground(request: RemoveBgRequest): Promise<RemoveBgResponse> {
  const signal = requestManager.getSignal(`remove-bg-${request.filename}`);
  try {
    return await apiPost<RemoveBgResponse>('/api/remove-bg', request, { signal });
  } finally {
    requestManager.clear(`remove-bg-${request.filename}`);
  }
}

export async function getBackgroundRemovalStatus(taskId: string): Promise<RemoveBgStatusResponse> {
  return apiGet<RemoveBgStatusResponse>(`/api/remove-bg/status/${taskId}`);
}
