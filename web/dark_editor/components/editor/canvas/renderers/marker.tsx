'use client';

import React from 'react';
import { Circle, Rect } from 'react-konva';
import { useImageLoader } from './utils';

export interface RenderMarkerLayerArgs {
  obj: import('@/stores/editorStore').CanvasObject;
  commonProps: any;
  shadowProps: any;
}

/**
 * renderMarkerLayer \u2014 the 'rect' and 'circle' cases from
 * ObjectRenderer's switch. Both shapes share the same fill
 * pipeline (imageFill pattern via markerFillProps OR a solid
 * blue fill), the same shadow props, and the same stroke
 * configuration.
 *
 * The dispatcher (CanvasRenderers.tsx) routes both 'rect' and
 * 'circle' to this function. The shape difference is just the
 * Konva primitive (Rect vs Circle) and the radius derivation
 * (half the width for circle).
 *
 * Per [REFACTOR 4/N] code-review fix, this renderer owns its
 * own `markerFillProps` derivation with a default of `#3b82f6`
 * (blue), matching the pre-refactor ObjectRenderer rect/circle
 * case. The text renderer uses a different default (white)
 * \u2014 see text.tsx.
 */
export function renderMarkerLayer({
  obj,
  commonProps,
  shadowProps,
}: RenderMarkerLayerArgs) {
  // Per-renderer fillProps: marker default is blue (#3b82f6),
  // matching the pre-refactor ObjectRenderer rect/circle case.
  const imageFillElement = useImageLoader(obj.imageFill?.src);
  const markerFillProps =
    obj.imageFill?.src && imageFillElement
      ? {
          fillPatternImage: imageFillElement,
          fillPatternScaleX: obj.imageFill.scale,
          fillPatternScaleY: obj.imageFill.scale,
          fillPatternOffsetY: -obj.imageFill.offsetY,
          fillPatternOffsetX: -obj.imageFill.offsetX,
          fillPatternRepeat: 'no-repeat',
        }
      : { fill: obj.fill || '#3b82f6' };

  if (obj.type === 'circle') {
    return (
      <Circle
        {...commonProps}
        {...shadowProps}
        radius={obj.width / 2}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth || 0}
        {...markerFillProps}
      />
    );
  }
  return (
    <Rect
      {...commonProps}
      {...shadowProps}
      width={obj.width}
      height={obj.height}
      stroke={obj.stroke}
      strokeWidth={obj.strokeWidth || 0}
      {...markerFillProps}
    />
  );
}
