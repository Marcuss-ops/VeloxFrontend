'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import Konva from 'konva';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

export interface CropDraft {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
 * useCanvasCrop — owns image crop editing state: the active crop target,
 * the rectangular draft (square/circle modes), the free lasso path, and the
 * commit/discard + Enter/Escape keyboard flow.
 *
 * Extracted from Canvas.tsx. The crop math is expressed in the image's local
 * coordinates (divided by scale) and folded into the previous cropRect so
 * repeated crops never stretch the source aspect ratio.
 */
export function useCanvasCrop(opts: CanvasCropOptions): CanvasCropApi {
  const { stageRef, displayScale, displayOffsetX, displayOffsetY, isPanning } = opts;

  const { updateObject, selectObject } = useEditorStore();
  const {
    cropEditingId,
    cropEditingMode,
    cancelCropEditing,
    setActiveTool,
  } = useUIStore();

  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);

  const cropTarget = useEditorStore((state): ImageObject | null => {
    if (!cropEditingId) return null;
    const obj = state.objects[cropEditingId];
    return obj && obj.type === 'image' ? obj : null;
  });

  useEffect(() => {
    setLassoPoints([]);
  }, [cropEditingId]);

  // Initialize crop selection to cover 100% of the image size (maintaining aspect ratio)
  useEffect(() => {
    if (!cropTarget) {
      setCropDraft(null);
      return;
    }

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const mode = cropEditingMode || 'free';

    if (mode === 'free') {
      setCropDraft({ x: 0, y: 0, width: baseWidth, height: baseHeight });
      return;
    }

    // For square and circle crop: start at the maximum centered 1:1 area so user has full control
    const size = Math.max(1, Math.min(baseWidth, baseHeight));
    setCropDraft({
      x: (baseWidth - size) / 2,
      y: (baseHeight - size) / 2,
      width: size,
      height: size,
    });
  }, [cropTarget, cropEditingMode]);

  const getLocalCoords = useCallback(
    (pointer: { x: number; y: number }) => {
      if (!cropTarget) return null;
      const scaleX = cropTarget.scaleX || 1;
      const scaleY = cropTarget.scaleY || 1;
      const stageX = (pointer.x - displayOffsetX) / displayScale;
      const stageY = (pointer.y - displayOffsetY) / displayScale;
      return {
        x: (stageX - cropTarget.x) / scaleX,
        y: (stageY - cropTarget.y) / scaleY,
      };
    },
    [cropTarget, displayOffsetX, displayOffsetY, displayScale]
  );

  const commitLassoCrop = useCallback(() => {
    if (!cropTarget || lassoPoints.length < 3) return;

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;

    // Get bounding box of the selected polygon path
    const minX = Math.min(...lassoPoints.map((p) => p.x));
    const maxX = Math.max(...lassoPoints.map((p) => p.x));
    const minY = Math.min(...lassoPoints.map((p) => p.y));
    const maxY = Math.max(...lassoPoints.map((p) => p.y));

    // Clamp to image dimensions
    const clampMinX = Math.max(0, Math.min(minX, baseWidth));
    const clampMaxX = Math.max(0, Math.min(maxX, baseWidth));
    const clampMinY = Math.max(0, Math.min(minY, baseHeight));
    const clampMaxY = Math.max(0, Math.min(maxY, baseHeight));

    const w = Math.max(20, clampMaxX - clampMinX);
    const h = Math.max(20, clampMaxY - clampMinY);

    // Calculate next relative cropRect relative to previous crops to prevent aspect stretching
    const prev = cropTarget.cropRect || { x: 0, y: 0, width: 1, height: 1 };
    const nextCropRect = {
      x: prev.x + (clampMinX / baseWidth) * prev.width,
      y: prev.y + (clampMinY / baseHeight) * prev.height,
      width: (w / baseWidth) * prev.width,
      height: (h / baseHeight) * prev.height,
    };

    // Calculate relative path points mapped to the new bounding box (0 to 1)
    const relativePoints = lassoPoints
      .map((p) => [
        Math.max(0, Math.min(1, (p.x - clampMinX) / w)),
        Math.max(0, Math.min(1, (p.y - clampMinY) / h)),
      ])
      .flat();

    updateObject(cropTarget.id, {
      x: cropTarget.x + clampMinX * scaleX,
      y: cropTarget.y + clampMinY * scaleY,
      width: w,
      height: h,
      cropRect: nextCropRect,
      cropMode: 'lasso',
      cropPathPoints: relativePoints,
    });

    selectObject(cropTarget.id);
    cancelCropEditing();
    setActiveTool('select');
    setLassoPoints([]);
  }, [cancelCropEditing, cropTarget, lassoPoints, selectObject, setActiveTool, updateObject]);

  const commitCrop = useCallback(() => {
    if (!cropTarget || !cropDraft) return;

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;

    // Calculate crop relative to previous crops to prevent aspect stretching
    const prev = cropTarget.cropRect || { x: 0, y: 0, width: 1, height: 1 };
    const nextCropRect = {
      x: prev.x + (cropDraft.x / baseWidth) * prev.width,
      y: prev.y + (cropDraft.y / baseHeight) * prev.height,
      width: (cropDraft.width / baseWidth) * prev.width,
      height: (cropDraft.height / baseHeight) * prev.height,
    };

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

  const discardCrop = useCallback(() => {
    cancelCropEditing();
    setCropDraft(null);
    setLassoPoints([]);
    setActiveTool('select');
  }, [cancelCropEditing, setActiveTool]);

  // Global Enter and Escape keyboard listeners for Crop
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

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isPanning) return;
      if (cropEditingId && cropEditingMode === 'free' && cropTarget) {
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const local = getLocalCoords(pointer);
        if (local) {
          setIsDrawingLasso(true);
          setLassoPoints([local]);
        }
      }
    },
    [cropEditingId, cropEditingMode, cropTarget, isPanning, getLocalCoords, stageRef]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawingLasso || !cropTarget) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const local = getLocalCoords(pointer);
      if (local) {
        const last = lassoPoints[lassoPoints.length - 1];
        if (last) {
          const dist = Math.hypot(local.x - last.x, local.y - last.y);
          if (dist < 3) return;
        }
        setLassoPoints((prev) => [...prev, local]);
      }
    },
    [isDrawingLasso, cropTarget, lassoPoints, getLocalCoords, stageRef]
  );

  const handleStageMouseUp = useCallback(() => {
    if (!isDrawingLasso) return;
    setIsDrawingLasso(false);
    if (lassoPoints.length >= 3) {
      commitLassoCrop();
    } else {
      setLassoPoints([]);
    }
  }, [isDrawingLasso, lassoPoints, commitLassoCrop]);

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
