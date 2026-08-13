'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import type { KonvaNodeEvents } from 'react-konva';
import { fontFamilies, type FontKey } from '@/lib/fonts';
import { resolveEditorAssetUrl } from '@/lib/api';
import { thumbnailFallbackDataUrl } from '@/lib/thumbnailFallback';
import type { BaseCanvasObject } from '@/stores/editorStore';

export function resolveFontFamily(name?: string): string {
  if (!name) return fontFamilies.Arial;
  return fontFamilies[name as FontKey] ?? name;
}

export function resolveFontStyle(weight?: string): 'normal' | 'bold' {
  if (!weight) return 'normal';
  if (weight === 'bold' || Number(weight) >= 700) return 'bold';
  return 'normal';
}

export function useImageLoader(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const fallbackApplied = useRef(false);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    fallbackApplied.current = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = resolveEditorAssetUrl(src);
    img.onload = () => setImage(img);
    img.onerror = () => {
      if (fallbackApplied.current) {
        setImage(null);
        return;
      }
      fallbackApplied.current = true;
      const fallback = new window.Image();
      fallback.onload = () => setImage(fallback);
      fallback.src = thumbnailFallbackDataUrl();
    };
  }, [src]);

  return image;
}

/**
 * Konva props shared by every object kind: transform/visibility fields
 * (id, x/y/scale, opacity, visible, draggable, listening...) plus the
 * react-konva event handlers. Spread onto Konva nodes via `{...commonProps}`.
 */
export type CommonProps = Partial<Konva.NodeConfig> & Partial<KonvaNodeEvents>;

/** Konva drop-shadow props ({} when the object has no dropShadow). */
export type ShadowProps = Partial<
  Pick<
    Konva.ShapeConfig,
    'shadowColor' | 'shadowBlur' | 'shadowOffset' | 'shadowOffsetX' | 'shadowOffsetY' | 'shadowOpacity'
  >
>;

/**
 * Fill props for an object: an image-fill pattern when `imageFill` is set and
 * its image is loaded, otherwise a plain color fill. `fallbackFill` is the
 * color used per kind when no image-fill is present (text defaults to white,
 * shapes to the editor blue).
 */
export function buildFillProps(
  obj: BaseCanvasObject,
  imageFillElement: HTMLImageElement | null,
  fallbackFill = '#ffffff'
): Partial<Konva.ShapeConfig> {
  if (obj.imageFill?.src && imageFillElement) {
    return {
      fillPatternImage: imageFillElement,
      fillPatternScaleX: obj.imageFill.scale,
      fillPatternScaleY: obj.imageFill.scale,
      fillPatternOffsetY: -obj.imageFill.offsetY,
      fillPatternOffsetX: -obj.imageFill.offsetX,
      fillPatternRepeat: 'no-repeat',
    };
  }
  return { fill: obj.fill || fallbackFill };
}
