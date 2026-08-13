'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { exportStageToBlob } from '@/lib/canvasExport';
import type { CanvasHandle } from '@/lib/canvasHandle';

/**
 * useFeedPreviewCapture — captures the canonical Konva stage to a blob URL
 * whenever the feed preview opens, and owns the object-URL lifecycle so no
 * URL leaks when the dialog closes or the component unmounts.
 */
export function useFeedPreviewCapture(isOpen: boolean, canvasRef?: RefObject<CanvasHandle>): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
      return;
    }

    const stage = canvasRef?.current?.getStage?.();
    if (!stage) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { canvasWidth, canvasHeight } = useEditorStore.getState();
        const result = await exportStageToBlob(stage, canvasWidth, canvasHeight, 'png', 100);
        if (cancelled) return;
        if (!result) {
          setPreviewUrl(null);
          return;
        }
        if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
        const url = URL.createObjectURL(result.blob);
        previewObjectUrlRef.current = url;
        setPreviewUrl(url);
      } catch (error) {
        console.error('Failed to capture canonical canvas for feed preview', error);
        if (!cancelled) setPreviewUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canvasRef, isOpen]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
  }, []);

  return previewUrl;
}
