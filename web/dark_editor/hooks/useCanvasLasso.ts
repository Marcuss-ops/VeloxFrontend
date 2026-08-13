'use client';

import { useCallback, useEffect, useState } from 'react';
import Konva from 'konva';
import type { RefObject } from 'react';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useUIStore, type CropMode } from '@/stores/uiStore';
import { foldCropRect, lassoBounds, lassoRelativePath, toLocalCoords } from '@/lib/canvasCropMath';

interface CanvasLassoOptions {
  stageRef: RefObject<Konva.Stage | null>;
  displayScale: number;
  displayOffsetX: number;
  displayOffsetY: number;
  isPanning: boolean;
  cropTarget: ImageObject | null;
  cropEditingId: string | null;
  cropEditingMode: CropMode | null;
}

export interface CanvasLassoApi {
  lassoPoints: { x: number; y: number }[];
  handleStageMouseDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleStageMouseMove: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleStageMouseUp: () => void;
  commitLassoCrop: () => void;
  resetLasso: () => void;
}

/**
 * useCanvasLasso — owns the free-hand lasso path: drawing state, the pointer
 * handlers and the bounding-box commit. Extracted from useCanvasCrop.
 */
export function useCanvasLasso(opts: CanvasLassoOptions): CanvasLassoApi {
  const {
    stageRef,
    displayScale,
    displayOffsetX,
    displayOffsetY,
    isPanning,
    cropTarget,
    cropEditingId,
    cropEditingMode,
  } = opts;

  const { updateObject, selectObject } = useEditorStore();
  const { cancelCropEditing, setActiveTool } = useUIStore();

  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);

  useEffect(() => {
    setLassoPoints([]);
  }, [cropEditingId]);

  const resetLasso = useCallback(() => setLassoPoints([]), []);

  const commitLassoCrop = useCallback(() => {
    if (!cropTarget || lassoPoints.length < 3) return;

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;

    // Bounding box of the polygon path, clamped to the image dimensions.
    const bounds = lassoBounds(lassoPoints, baseWidth, baseHeight);
    // Fold into the previous cropRect to prevent aspect stretching.
    const nextCropRect = foldCropRect(cropTarget, bounds);
    const cropPathPoints = lassoRelativePath(lassoPoints, bounds);

    updateObject(cropTarget.id, {
      x: cropTarget.x + bounds.x * scaleX,
      y: cropTarget.y + bounds.y * scaleY,
      width: bounds.width,
      height: bounds.height,
      cropRect: nextCropRect,
      cropMode: 'lasso',
      cropPathPoints,
    });

    selectObject(cropTarget.id);
    cancelCropEditing();
    setActiveTool('select');
    setLassoPoints([]);
  }, [cancelCropEditing, cropTarget, lassoPoints, selectObject, setActiveTool, updateObject]);

  const handleStageMouseDown = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isPanning) return;
      if (cropEditingId && cropEditingMode === 'free' && cropTarget) {
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const local = toLocalCoords(cropTarget, pointer, displayScale, displayOffsetX, displayOffsetY);
        setIsDrawingLasso(true);
        setLassoPoints([local]);
      }
    },
    [cropEditingId, cropEditingMode, cropTarget, isPanning, displayScale, displayOffsetX, displayOffsetY, stageRef]
  );

  const handleStageMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawingLasso || !cropTarget) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const local = toLocalCoords(cropTarget, pointer, displayScale, displayOffsetX, displayOffsetY);
      const last = lassoPoints[lassoPoints.length - 1];
      if (last) {
        const dist = Math.hypot(local.x - last.x, local.y - last.y);
        if (dist < 3) return;
      }
      setLassoPoints((prev) => [...prev, local]);
    },
    [isDrawingLasso, cropTarget, lassoPoints, displayScale, displayOffsetX, displayOffsetY, stageRef]
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
    lassoPoints,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    commitLassoCrop,
    resetLasso,
  };
}
