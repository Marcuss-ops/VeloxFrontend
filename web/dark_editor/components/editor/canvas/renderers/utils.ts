'use client';

import { useEffect, useState } from 'react';
import { fontFamilies, type FontKey } from '@/lib/fonts';
import { resolveEditorAssetUrl } from '@/lib/api';

/**
 * resolveFontFamily \u2014 maps a font name (which can be either a FontKey
 * or a free-form family string the operator typed) to the actual CSS
 * font-family string the canvas text renderer consumes.
 *
 * Used by the 'text' case (Text/TextPath with obj.fontFamily) and
 * TextEditorOverlay (the DOM textarea). Falls back to Arial when
 * the name is missing; falls back to the literal name when it
 * isn't a known key (so a custom font the operator imported in
 * CSS still renders).
 */
export function resolveFontFamily(name?: string): string {
  if (!name) return fontFamilies.Arial;
  return fontFamilies[name as FontKey] ?? name;
}

/**
 * useImageLoader \u2014 loads an <img> element from a URL. Relative assets
 * are resolved by the shared editor API helper; the deployment
 * compatibility namespace is intentionally not part of renderer logic.
 *
 * The hook is used by:
 *   - the 'image' case in ObjectRenderer (media renderer)
 *   - the imageFill pattern on rect/circle shapes (marker renderer)
 *
 * Returns the loaded HTMLImageElement (or null while loading /
 * on failure). CORS is set to 'anonymous' so canvas reads from
 * the loaded image are not tainted (required by Konva filters).
 */
export function useImageLoader(src?: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = resolveEditorAssetUrl(src);
    img.onload = () => setImage(img);
  }, [src]);

  return image;
}
