'use client';

import { useCallback, useEffect } from 'react';
import Konva from 'konva';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useCanvasCropDraft } from '@/hooks/useCanvasCropDraft';
import { useCanvasLasso } from '@/hooks/useCanvasLasso';
import type { CropDraft } from '@/lib/canvasCropMath';

export type { CropDraft } from '@/lib/canvasCropMath';

interface CanvasCropOptions {
  stageRef: RefObject<Konva.Stage | null>;
  displayScale: number;
  displayOffsetX: number;
  displayOffsetY: number;
  isPanning: boolean;
}

export interface CanvasCropApi {
  cropTarget: ImageObject | null;
  cropDraft: CropDraft | null;
  setCropDraft: Dispatch<SetStateAction<CropDraft | null>>;
  lassoPoints: { x: number; y: number }[];
  handleStageMouseDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleStageMouseMove: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleStageMouseUp: () => void;
  commitLassoCrop: () => void;
  commitCrop: () => void;
  discardCrop: () => void;
}

/**
 * useCanvasCrop — orchestrator for image crop editing: the active crop
 * target, the rectangular draft (useCanvasCropDraft), the free lasso path
 * (useCanvasLasso) and the commit/discard + Enter/Escape keyboard flow.
 * The crop math lives in lib/canvasCropMath.ts (pure, shared, unit-tested).
 *
 * Extracted from Canvas.tsx.
 */
export function useCanvasCrop(opts: CanvasCropOptions): CanvasCropApi {
  const { stageRef, displayScale, displayOffsetX, displayOffsetY, isPanning } = opts;

  const { cropEditingId, cropEditingMode, cancelCropEditing, setActiveTool } = useUIStore();

  const cropTarget = useEditorStore((state): ImageObject | null => {
    if (!cropEditingId) return null;
    const obj = state.objects[cropEditingId];
    return obj && obj.type === 'image' ? obj : null;
  });

  const { cropDraft, setCropDraft, commitCrop } = useCanvasCropDraft({ cropTarget, cropEditingMode });
  const {
    lassoPoints,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    commitLassoCrop,
    resetLasso,
  } = useCanvasLasso({
    stageRef,
    displayScale,
    displayOffsetX,
    displayOffsetY,
    isPanning,
    cropTarget,
    cropEditingId,
    cropEditingMode,
  });

  const discardCrop = useCallback(() => {
    cancelCropEditing();
    setCropDraft(null);
    resetLasso();
    setActiveTool('select');
  }, [cancelCropEditing, setCropDraft, resetLasso, setActiveTool]);

  // Global Enter and Escape keyboard listeners for Crop.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cropEditingId) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (cropEditingMode === 'free') {
          commitLassoCrop();
        } else {
          commitCrop();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        discardCrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropEditingId, cropEditingMode, commitCrop, commitLassoCrop, discardCrop]);

  return {
    cropTarget,
    cropDraft,
    setCropDraft,
    lassoPoints,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    commitLassoCrop,
    commitCrop,
    discardCrop,
  };
}
