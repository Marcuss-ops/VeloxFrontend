/**
 * Type definitions for Script Generator
 * Agent 1A - Extracted from legacy script-generator.js
 */

export interface ClipRefInput {
  link?: string;
  url?: string;
  id?: string;
  fileId?: string;
}

export interface StockTimestampInput {
  start?: string;
  end?: string;
  folderId?: string;
  folder_id?: string;
  folderName?: string;
  folder_name?: string;
  source?: string;
}

export interface StockTimestamp {
  start: string;
  end: string;
  folder_id: string | null;
  folder_name: string;
  source: string;
}

export interface TitleOverride {
  voiceover_langs?: string[];
  languages?: string[];
  youtube_channel?: string;
}

export interface ProjectRef {
  voiceoverLangs?: string[];
  titleOverrides?: Record<number, TitleOverride>;
  clipFolders?: {
    initial?: unknown[];
    inter?: unknown[];
    final?: unknown[];
  };
  stockTimestamps?: StockTimestampInput[];
  youtubeGroup?: string;
  voiceoverFolderId?: string;
  videoStyle?: string;
  sourceContext?: string;
  background?: string;
  music?: string;
  driveFolderId?: string;
}

export interface CreateMasterPayload {
  job_spec_version: string;
  project_name: string;
  youtube_group: string | null;
  video_style: string;
  video_name: string;
  source: string;
  source_context: string;
  youtube_url: string;
  language: string;
  duration: string;
  voiceover_drive_folder: string | null;
  script_text: string;
  start_clips: string[];
  middle_clips: string[];
  end_clips: string[];
  stock_clips_timestamps: StockTimestamp[];
  voiceover_items: unknown[];
  voiceover_languages: string[];
  assets: {
    background: string;
    music: string;
  };
  drive_folder_id: string | null;
}

export interface GenerationProgress {
  global: number;
  scripting: { percent: number; status: string; logs: string[] };
  voiceover: { percent: number; status: string; logs: string[] };
  remote: { step: string; message: string; progress: number; isError?: boolean };
}

export interface GenerationResult {
  ok: boolean;
  error?: string;
  results?: GenerationResultItem[];
  job_id?: string;
  jobId?: string;
  queue_id?: string;
  queueId?: string;
  status?: string;
  script_doc?: {
    ok?: boolean;
    doc_url?: string;
    webViewLink?: string;
    reason?: string;
    error?: string;
  };
  remote_generation?: RemoteGenerationResult;
  _remote_generation?: RemoteGenerationResult;
  remote?: RemoteGenerationResult;
}

export interface GenerationResultItem {
  titleIndex: number;
  title: string;
  result: GenerationResult | null;
  status: number;
  rawText?: string;
}

export interface RemoteGenerationResult {
  generation_logs?: (string | unknown)[];
  voiceover_preview?: VoiceoverPreviewItem[];
}

export interface VoiceoverPreviewItem {
  language?: string;
  name?: string;
  url?: string;
  drive_file_id?: string;
  task_id?: string;
}

export interface DriveValidationResult {
  ok: boolean;
  folderId?: string;
  folderName?: string;
  error?: string;
}

export interface SendToMasterOptions {
  forceRemoteGeneration?: boolean;
  remoteVoiceoverLangs?: string[];
  projectRef?: ProjectRef;
  titles?: string[];
  sourceContext?: string;
}