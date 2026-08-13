// Pure geometry for image crop editing — extracted from useCanvasCrop so
// the hook stays focused on state wiring while the math stays unit-testable
// and shared between the rectangular draft and the free-hand lasso paths.
//
// All coordinates are expressed in the image's LOCAL space (divided by
// scale) so the same helpers serve the draft overlay and the lasso path.

import type { ImageObject } from '@/stores/editorStore';

export interface CropDraft {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Convert a stage pointer to image-local coordinates. */
export function toLocalCoords(
  target: ImageObject,
  pointer: { x: number; y: number },
  displayScale: number,
  displayOffsetX: number,
  displayOffsetY: number,
): { x: number; y: number } {
  const scaleX = target.scaleX || 1;
  const scaleY = target.scaleY || 1;
  const stageX = (pointer.x - displayOffsetX) / displayScale;
  const stageY = (pointer.y - displayOffsetY) / displayScale;
  return {
    x: (stageX - target.x) / scaleX,
    y: (stageY - target.y) / scaleY,
  };
}

/** Initial draft: full-size for free, centered 1:1 for square/circle. */
export function initialCropDraft(target: ImageObject, mode: string): CropDraft {
  const baseWidth = Math.max(1, target.width);
  const baseHeight = Math.max(1, target.height);
  if (mode !== 'free') {
    const size = Math.max(1, Math.min(baseWidth, baseHeight));
    return {
      x: (baseWidth - size) / 2,
      y: (baseHeight - size) / 2,
      width: size,
      height: size,
    };
  }
  return { x: 0, y: 0, width: baseWidth, height: baseHeight };
}

/** Fold a draft (image-local) into the previous cropRect so repeated crops
 *  never stretch the source aspect ratio. */
export function foldCropRect(target: ImageObject, draft: CropDraft): CropRect {
  const baseWidth = Math.max(1, target.width);
  const baseHeight = Math.max(1, target.height);
  const prev = target.cropRect || { x: 0, y: 0, width: 1, height: 1 };
  return {
    x: prev.x + (draft.x / baseWidth) * prev.width,
    y: prev.y + (draft.y / baseHeight) * prev.height,
    width: (draft.width / baseWidth) * prev.width,
    height: (draft.height / baseHeight) * prev.height,
  };
}

/** Clamped bounding box of a lasso path, mapped to image-local space. */
export function lassoBounds(
  points: { x: number; y: number }[],
  baseWidth: number,
  baseHeight: number,
): CropRect {
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const clampMinX = Math.max(0, Math.min(minX, baseWidth));
  const clampMaxX = Math.max(0, Math.min(maxX, baseWidth));
  const clampMinY = Math.max(0, Math.min(minY, baseHeight));
  const clampMaxY = Math.max(0, Math.min(maxY, baseHeight));
  return {
    x: clampMinX,
    y: clampMinY,
    width: Math.max(20, clampMaxX - clampMinX),
    height: Math.max(20, clampMaxY - clampMinY),
  };
}

/** Map the lasso path into [0,1]x[0,1] relative to its clamped bounding box. */
export function lassoRelativePath(
  points: { x: number; y: number }[],
  bounds: CropRect,
): number[] {
  return points
    .map((p) => [
      Math.max(0, Math.min(1, (p.x - bounds.x) / bounds.width)),
      Math.max(0, Math.min(1, (p.y - bounds.y) / bounds.height)),
    ])
    .flat();
}
