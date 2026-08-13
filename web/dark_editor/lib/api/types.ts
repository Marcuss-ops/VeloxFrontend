// Shared API types for the InstaEditor BFF clients.
//
// All endpoints route through the InstaEditor runtime base path (see
// lib/api/httpClient.ts) which proxies to the Velox master. The browser
// stays on the same origin so the InstaEdit session cookie + CSRF
// double-submit are preserved.
//
// This module is the single source of truth for wire-level shapes
// exchanged by mediaClient / projectClient / driveClient / folderClient /
// presetClient / translationClient. Clients import their types from here
// so the barrel in lib/api.ts only has to re-export them once.

// ------------------------------------------------------------------
// Media (upload / filter / transform / export / generate / upscale /
// background-removal)
// ------------------------------------------------------------------

export interface UploadResponse {
  filename: string;
  url: string;
}

export interface FilterRequest {
  filename: string;
  filter_type: string;
  value: number;
}

export interface FilterResponse {
  filename: string;
  url: string;
}

export interface TransformRequest {
  filename: string;
  crop_box?: [number, number, number, number];
  resize_dims?: [number, number];
}

export interface ExportRequest {
  filename: string;
  format: string;
  quality: number;
}

export interface GenerateRequest {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
}

export interface GenerateResponse {
  filename: string;
  url: string;
  prompt: string;
}

export interface UpscaleRequest {
  filename: string;
  scale?: number;
  save_in_place?: boolean;
}

export interface UpscaleResponse {
  filename: string;
  url: string;
  saved_at?: string;
}

export interface RemoveBgRequest {
  filename: string;
  model?: string;
  output_format?: string;
  async?: boolean;
}

export interface RemoveBgResponse {
  filename?: string;
  url?: string;
  processing?: boolean;
  task_id?: string;
  error?: string;
}

export interface RemoveBgStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filename?: string;
  url?: string;
  error?: string;
}

// ------------------------------------------------------------------
// Projects
// ------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  type: string;
  canvas_json: Record<string, unknown>;
  preview_url: string;
  created_at: string;
  updated_at: string;
  folder_id?: string | null;
}

// ------------------------------------------------------------------
// Drive assets
// ------------------------------------------------------------------

export interface DriveAsset {
  id: string;
  name: string;
  mime_type: string;
  size?: string;
  modified_time?: string;
  thumbnail_url?: string;
  content_url: string;
}

// ------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------

export interface Preset {
  id: string;
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------
// Folders
// ------------------------------------------------------------------

export interface ProjectFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
}

// ------------------------------------------------------------------
// Translation
// ------------------------------------------------------------------

export interface TranslateRequest {
  text: string;
  target_language: string;
  tone?: string;
  preserve_hashtags?: boolean;
  kind?: 'title' | 'description' | 'text';
}

export interface TranslateResponse {
  ok: boolean;
  source_text: string;
  sanitized_text: string;
  translated_text: string;
  target_language: string;
}
