import { fetchJSON } from './core';

export interface BundleDir {
  name: string;
  type: 'folder' | 'root_files';
  size: number;
  size_formatted: string;
  file_count: number;
}

export interface BundleInfo {
  exists: boolean;
  filename: string;
  version: string;
  build_id: string;
  size: number;
  size_formatted: string;
  sha256: string;
  created_at: string;
  file_count: number;
  top_dirs: BundleDir[];
  manifest?: Record<string, unknown>;
}

export interface BundleFile {
  name: string;
  size: number;
  size_formatted: string;
  compressed: number;
}

export interface BundleFilesResponse {
  files: BundleFile[];
  prefix: string;
  has_more: boolean;
}

export const bundleApi = {
  info: (refresh = false) =>
    fetchJSON<BundleInfo>(`/api/bundle/info${refresh ? '?refresh=true' : ''}`),

  files: (prefix = '', limit = 100) =>
    fetchJSON<BundleFilesResponse>(`/api/bundle/files?prefix=${encodeURIComponent(prefix)}&limit=${limit}`),

  /** Force regenerate the worker bundle zip */
  regenerate: async (): Promise<{ ok: boolean; message: string; bundle?: BundleInfo }> => {
    const result = await fetchJSON<{
      success: boolean;
      message: string;
      error?: string;
      zip_path?: string;
      version?: string;
      build_id?: string;
      size_mb?: number;
      files?: number;
    }>('/install_worker/force_regenerate_zip', {
      method: 'POST',
    });
    // Map server response (success) to frontend expected format (ok)
    return {
      ok: result.success,
      message: result.message || result.error || 'Bundle rigenerato',
    };
  },
};
