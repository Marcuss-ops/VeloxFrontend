'use client';

import { renderMediaLayer } from './renderers/media';
import { renderTextLayer } from './renderers/text';
import { renderMarkerLayer } from './renderers/marker';
import type { CanvasObject } from '@/stores/editorStore';

export interface ObjectRendererProps {
  obj: CanvasObject;
  commonProps: any;
  shadowProps: any;
  editingId: string | null;
  handleTextDblClick: (e: any, id: string) => void;
}

/**
 * ObjectRenderer \u2014 the canonical dispatcher for per-object
 * Konva rendering inside the dark editor's canvas.
 *
 * Per [REFACTOR 4/N], this module exposes ONLY the dispatcher.
 * The actual rendering lives in sibling files under
 * `./renderers/`:
 *   - renderers/media   \u2014 'image' case (ImageRenderer + filter
 *                        pipeline + crop mask + feather)
 *   - renderers/text    \u2014 'text' case (TextPath/Text with
 *                        censor + fontFamily + textShadow)
 *   - renderers/marker  \u2014 'rect' and 'circle' cases
 *                        (annotation shapes with imageFill)
 *   - renderers/overlay \u2014 TextEditorOverlay, DocumentCropOverlay,
 *                        CropSelectionOverlay, GridOverlay
 *   - renderers/utils   \u2014 resolveFontFamily + useImageLoader
 *                        (shared between media / text / marker)
 *
 * The dispatcher is a pure switch. Each per-layer renderer
 * owns its own `fillProps` derivation with its own default
 * color:
 *   - text.tsx  defaults to `#ffffff` (white)
 *   - marker.tsx defaults to `#3b82f6` (blue, matches the
 *     pre-refactor color so a freshly-added rect/circle
 *     without an explicit obj.fill still renders blue).
 *
 * Consumers of the overlays should import them directly from
 * `./renderers/overlay` to keep the dispatcher as the single
 * entry-point for per-object rendering.
 */
export function ObjectRenderer({
  obj,
  commonProps,
  shadowProps,
  editingId,
  handleTextDblClick,
}: ObjectRendererProps) {
  switch (obj.type) {
    case 'image':
      return renderMediaLayer({ obj, commonProps, shadowProps });
    case 'text':
      return renderTextLayer({
        obj,
        commonProps,
        shadowProps,
        editingId,
        handleTextDblClick,
      });
    case 'rect':
    case 'circle':
      return renderMarkerLayer({ obj, commonProps, shadowProps });
    default:
      return null;
  }
}
