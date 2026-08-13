// lib/cropClipGeometry.ts — Pure crop geometry shared by the image
// renderer and the crop overlays:
//   - the circle/square/lasso clip/mask path tracing (ImageRenderer)
//   - the outside "shield" dimming rectangles and rule-of-thirds/grid
//     guide lines (DocumentCropOverlay + CropSelectionOverlay)
// Extracted so the duplicated path + overlay math can't drift.

import type { ImageObject } from '@/stores/editorStore';

export type CropShape = NonNullable<ImageObject['cropMode']>;

/** A simple axis-aligned rectangle in whichever space the caller uses. */
export interface CropRectGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A guide line expressed as its two endpoints. */
export interface GuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

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

/**
 * The four rectangles OUTSIDE `rect` within `bounds` — used to dim the area
 * around the active crop so the crop itself reads as the highlight. Order is
 * left, right, top, bottom (the renderers spread these as `<Rect>` shields).
 */
export function shieldRects(rect: CropRectGeometry, bounds: CropRectGeometry): CropRectGeometry[] {
  return [
    { x: bounds.x, y: bounds.y, width: Math.max(0, rect.x - bounds.x), height: bounds.height },
    {
      x: rect.x + rect.width,
      y: bounds.y,
      width: Math.max(0, bounds.x + bounds.width - (rect.x + rect.width)),
      height: bounds.height,
    },
    { x: rect.x, y: bounds.y, width: rect.width, height: Math.max(0, rect.y - bounds.y) },
    {
      x: rect.x,
      y: rect.y + rect.height,
      width: rect.width,
      height: Math.max(0, bounds.y + bounds.height - (rect.y + rect.height)),
    },
  ];
}

/** The four rule-of-thirds guide lines inside `rect` (2 vertical + 2 horizontal). */
export function thirdsGuideLines(rect: CropRectGeometry): GuideLine[] {
  return [
    { x1: rect.x + rect.width / 3, y1: rect.y, x2: rect.x + rect.width / 3, y2: rect.y + rect.height },
    { x1: rect.x + (rect.width * 2) / 3, y1: rect.y, x2: rect.x + (rect.width * 2) / 3, y2: rect.y + rect.height },
    { x1: rect.x, y1: rect.y + rect.height / 3, x2: rect.x + rect.width, y2: rect.y + rect.height / 3 },
    { x1: rect.x, y1: rect.y + (rect.height * 2) / 3, x2: rect.x + rect.width, y2: rect.y + (rect.height * 2) / 3 },
  ];
}

/** A 3x3 grid of guide lines inside `rect` (defaults to thirds at 4 divisions). */
export function gridGuideLines(rect: CropRectGeometry, divisions = 4): GuideLine[] {
  const lines: GuideLine[] = [];
  for (let i = 1; i < divisions; i++) {
    const vx = rect.x + (rect.width * i) / divisions;
    const hy = rect.y + (rect.height * i) / divisions;
    lines.push({ x1: vx, y1: rect.y, x2: vx, y2: rect.y + rect.height });
    lines.push({ x1: rect.x, y1: hy, x2: rect.x + rect.width, y2: hy });
  }
  return lines;
}
