'use client';

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
  applyFilter as apiApplyFilter,
  transformImage as apiTransform,
  exportImage as apiExport,
  generateImage as apiGenerate,
  upscaleImage as apiUpscale,
  UploadResponse,
  FilterResponse,
  GenerateResponse,
  UpscaleResponse,
} from '@/lib/api';

export interface FilterOptions {
  type: string;
  value: number;
}

export interface TransformOptions {
  cropBox?: [number, number, number, number];
  resizeDims?: [number, number];
}

export interface ExportOptions {
  format: string;
  quality: number;
}

export interface GenerateOptions {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
}

export function useImageProcessor() {
  const { setGenerating, setUploading, setExporting, addToast } = useUIStore();

  const applyFilter = useCallback(
    async (filename: string, filter: FilterOptions): Promise<FilterResponse> => {
      setUploading(true);
      try {
        const result = await apiApplyFilter({
          filename,
          filter_type: filter.type,
          value: filter.value,
        });
        addToast({ type: 'success', message: `Applied ${filter.type} filter` });
        return result;
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Filter failed',
        });
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [setUploading, addToast]
  );

  const transform = useCallback(
    async (filename: string, options: TransformOptions): Promise<FilterResponse> => {
      setUploading(true);
      try {
        const result = await apiTransform({
          filename,
          crop_box: options.cropBox,
          resize_dims: options.resizeDims,
        });
        addToast({ type: 'success', message: 'Transform applied' });
        return result;
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Transform failed',
        });
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [setUploading, addToast]
  );

  const export_ = useCallback(
    async (filename: string, options: ExportOptions): Promise<{ url: string; filename: string }> => {
      setExporting(true);
      try {
        const result = await apiExport({
          filename,
          format: options.format,
          quality: options.quality,
        });
        addToast({ type: 'success', message: 'Export complete' });
        return result;
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Export failed',
        });
        throw error;
      } finally {
        setExporting(false);
      }
    },
    [setExporting, addToast]
  );

  const generate = useCallback(
    async (options: GenerateOptions): Promise<GenerateResponse> => {
      setGenerating(true);
      try {
        const result = await apiGenerate({
          prompt: options.prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          seed: options.seed,
          steps: options.steps || 4,
        });
        addToast({ type: 'success', message: 'Image generated successfully' });
        return result;
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Generation failed',
        });
        throw error;
      } finally {
        setGenerating(false);
      }
    },
    [setGenerating, addToast]
  );

  const upscale = useCallback(
    async (filename: string, scale: number = 2): Promise<UpscaleResponse> => {
      setUploading(true);
      try {
        const result = await apiUpscale({
          filename,
          scale,
        });
        addToast({ type: 'success', message: `Upscaled ${scale}x successfully` });
        return result;
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Upscale failed',
        });
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [setUploading, addToast]
  );

  return {
    applyFilter,
    transform,
    export: export_,
    generate,
    upscale,
  };
}