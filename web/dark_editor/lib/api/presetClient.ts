// Preset client — list / read / write / update / delete for the
// Dark Editor's preset library (complete + text-type presets).
//
// Talks to the InstaEdit BFF via the primitives in
// lib/api/httpClient (apiGet / apiPost / apiPut / apiDelete). The
// wire type for a preset comes from lib/api/types.

import { apiGet, apiPost, apiPut, apiDelete } from './httpClient';
import type { Preset } from './types';

export async function listPresets(): Promise<Preset[]> {
  return apiGet<Preset[]>('/api/presets');
}

export async function getPreset(id: string): Promise<Preset> {
  return apiGet<Preset>(`/api/presets/${id}`);
}

export async function savePreset(preset: {
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
}): Promise<{ id: string; message: string }> {
  return apiPost<{ id: string; message: string }>('/api/presets', preset);
}

export async function updatePreset(id: string, preset: {
  name?: string;
  type?: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
}): Promise<Preset> {
  return apiPut<Preset>(`/api/presets/${id}`, preset);
}

export async function deletePreset(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/presets/${id}`);
}
