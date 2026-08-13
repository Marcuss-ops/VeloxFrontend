'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useUIStore, type CropMode } from '@/stores/uiStore';
import { foldCropRect, initialCropDraft, type CropDraft } from '@/lib/canvasCropMath';

interface CanvasCropDraftOptions {
  cropTarget: ImageObject | null;
  cropEditingMode: CropMode | null;
}

export interface CanvasCropDraftApi {
  cropDraft: CropDraft | null;
  setCropDraft: Dispatch<SetStateAction<CropDraft | null>>;
  commitCrop: () => void;
}

/**
 * useCanvasCropDraft — owns the rectangular crop draft: its initialization
 * (full-size for free, centered 1:1 for square/circle) and the commit that
 * folds the draft into the previous cropRect. Extracted from useCanvasCrop.
 */
export function useCanvasCropDraft(opts: CanvasCropDraftOptions): CanvasCropDraftApi {
  const { cropTarget, cropEditingMode } = opts;

  const { updateObject, selectObject } = useEditorStore();
  const { cancelCropEditing, setActiveTool } = useUIStore();

  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);

  // Initialize crop selection to cover 100% of the image size (maintaining
  // aspect ratio for square/circle via a centered 1:1 area).
  useEffect(() => {
    if (!cropTarget) {
      setCropDraft(null);
      return;
    }
    setCropDraft(initialCropDraft(cropTarget, cropEditingMode || 'free'));
  }, [cropTarget, cropEditingMode]);

  const commitCrop = useCallback(() => {
    if (!cropTarget || !cropDraft) return;

    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;

    // Calculate crop relative to previous crops to prevent aspect stretching.
    const nextCropRect = foldCropRect(cropTarget, cropDraft);

    updateObject(cropTarget.id, {
      x: cropTarget.x + cropDraft.x * scaleX,
      y: cropTarget.y + cropDraft.y * scaleY,
      width: cropDraft.width,
      height: cropDraft.height,
      cropRect: nextCropRect,
      cropMode: cropEditingMode || 'free',
    });

    selectObject(cropTarget.id);
    cancelCropEditing();
    setActiveTool('select');
    setCropDraft(null);
  }, [cancelCropEditing, cropDraft, cropEditingMode, cropTarget, selectObject, setActiveTool, updateObject]);

  return { cropDraft, setCropDraft, commitCrop };
}
