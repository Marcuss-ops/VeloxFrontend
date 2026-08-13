// lib/cropClipGeometry.ts — Pure crop-mask geometry shared by the image
// renderer: the same circle/square/lasso path is traced both into a 2D
// mask canvas (for feathering) and into a Konva clip context. Extracted
// from components/editor/canvas/renderers/ImageRenderer.tsx so the two
// copies of the path logic can't drift.

import type { ImageObject } from '@/stores/editorStore';

export type CropShape = NonNullable<ImageObject['cropMode']>;

/** Minimal path-drawing surface satisfied by both CanvasRenderingContext2D and Konva.Context. */
export interface CropPathContext {
  beginPath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
  rect(x: number, y: number, width: number, height: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

/** True when the shape can actually be traced (lasso needs a full path). */
export function canTraceCropShape(mode: CropShape | undefined, cropPathPoints?: number[]): boolean {
  if (!mode || mode === 'free') return false;
  if (mode === 'lasso') return Boolean(cropPathPoints && cropPathPoints.length >= 6);
  return true;
}

/**
 * Traces the crop shape onto `ctx`. Returns false (and draws nothing) when
 * the shape cannot be traced — e.g. a lasso with fewer than 6 points. The
 * caller decides whether to fill (mask canvas) or use the path as a clip.
 */
export function traceCropShape(
  ctx: CropPathContext,
  mode: CropShape,
  width: number,
  height: number,
  cropPathPoints?: number[],
): boolean {
  if (mode === 'circle') {
    const size = Math.min(width, height);
    const radius = size / 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2, false);
    ctx.closePath();
    return true;
  }
  if (mode === 'square') {
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    ctx.rect(x, y, size, size);
    return true;
  }
  if (mode === 'lasso' && cropPathPoints && cropPathPoints.length >= 6) {
    ctx.beginPath();
    ctx.moveTo(cropPathPoints[0] * width, cropPathPoints[1] * height);
    for (let i = 2; i < cropPathPoints.length; i += 2) {
      ctx.lineTo(cropPathPoints[i] * width, cropPathPoints[i + 1] * height);
    }
    ctx.closePath();
    return true;
  }
  return false;
}
