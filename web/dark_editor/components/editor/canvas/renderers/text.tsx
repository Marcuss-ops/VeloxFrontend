'use client';

import React from 'react';
import { Group, Rect, Text, TextPath } from 'react-konva';
import { censorText } from '@/lib/textCensorship';
import { resolveFontFamily, useImageLoader } from './utils';

export interface RenderTextLayerArgs {
  obj: import('@/stores/editorStore').CanvasObject;
  commonProps: any;
  shadowProps: any;
  editingId: string | null;
  handleTextDblClick: (e: any, id: string) => void;
}

/**
 * renderTextLayer \u2014 the 'text' case from ObjectRenderer's
 * switch. Renders a single text object with:
 *
 *   - optional background fill (rect underneath the text glyphs)
 *   - censor pipeline (censorText \u2192 allCaps \u2192 display)
 *   - textCurve (curved text along a Konva.Path) vs straight
 *     text (Text) branch
 *   - textShadow + textStroke + textFillProps (imageFill
 *     pattern OR solid white fill, the pre-refactor default)
 *   - hidden while editingId === obj.id (the in-place textarea
 *     overlay is rendered on top by Canvas.tsx)
 *
 * The double-click handler bubbles from the Group, NOT the
 * inner Text, so a click on the empty bounding-box around the
 * glyphs still triggers the edit mode.
 *
 * Per [REFACTOR 4/N] code-review fix, this renderer owns its
 * own `textFillProps` derivation (the pre-refactor default of
 * `#ffffff` for plain text fills). The marker renderer uses a
 * different default (`#3b82f6`) \u2014 see marker.tsx.
 */
export function renderTextLayer({
  obj,
  commonProps,
  shadowProps,
  editingId,
  handleTextDblClick,
}: RenderTextLayerArgs) {
  const rawText = obj.text || '';
  const maybeCensored = obj.useCensorship ? censorText(rawText) : rawText;
  const displayText = obj.allCaps ? maybeCensored.toUpperCase() : maybeCensored;

  // Per-renderer fillProps: text default is white (#ffffff),
  // matching the pre-refactor ObjectRenderer text case.
  const imageFillElement = useImageLoader(obj.imageFill?.src);
  const textFillProps = obj.imageFill?.src && imageFillElement
    ? {
        fillPatternImage: imageFillElement,
        fillPatternScaleX: obj.imageFill.scale,
        fillPatternScaleY: obj.imageFill.scale,
        fillPatternOffsetY: -obj.imageFill.offsetY,
        fillPatternOffsetX: -obj.imageFill.offsetX,
        fillPatternRepeat: 'no-repeat',
      }
    : { fill: obj.fill || '#ffffff' };

  return (
    <Group
      {...commonProps}
      onDblClick={(e) => handleTextDblClick(e, obj.id)}
    >
      {obj.backgroundFill ? (
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.backgroundFill}
          opacity={obj.backgroundOpacity ?? 0.6}
          cornerRadius={obj.padding ?? 0}
        />
      ) : null}

      {obj.textCurve?.enabled ? (
        <TextPath
          id={obj.id}
          text={displayText}
          width={obj.width}
          height={obj.height}
          fontSize={obj.fontSize || 24}
          fontFamily={resolveFontFamily(obj.fontFamily)}
          fontStyle={obj.fontWeight ? `${obj.fontWeight}` : 'normal'}
          letterSpacing={obj.letterSpacing ?? 0}
          data={(() => {
            const r = obj.textCurve.radius || 200;
            const isUp = obj.textCurve.direction === 'up';
            return isUp
              ? `M 0,${r} A ${r},${r} 0 0,1 ${obj.width},${r}`
              : `M 0,0 A ${r},${r} 0 0,0 ${obj.width},0`;
          })()}
          visible={editingId !== obj.id}
          {...shadowProps}
          {...textFillProps}
          shadowColor={obj.textShadow?.color}
          shadowBlur={obj.textShadow?.blur ?? 0}
          shadowOffsetX={obj.textShadow?.offsetX ?? 0}
          shadowOffsetY={obj.textShadow?.offsetY ?? 0}
          shadowOpacity={obj.textShadow ? 1 : 0}
        />
      ) : (
        <Text
          id={obj.id}
          text={displayText}
          padding={obj.padding ?? 0}
          fontSize={obj.fontSize || 24}
          fontFamily={resolveFontFamily(obj.fontFamily)}
          fontStyle={obj.fontWeight ? `${obj.fontWeight}` : 'normal'}
          lineHeight={obj.lineHeight ?? 1}
          letterSpacing={obj.letterSpacing ?? 0}
          stroke={obj.textStroke?.color}
          strokeWidth={obj.textStroke?.width ?? 0}
          visible={editingId !== obj.id}
          {...shadowProps}
          {...textFillProps}
          shadowColor={obj.textShadow?.color}
          shadowBlur={obj.textShadow?.blur ?? 0}
          shadowOffsetX={obj.textShadow?.offsetX ?? 0}
          shadowOffsetY={obj.textShadow?.offsetY ?? 0}
          shadowOpacity={obj.textShadow ? 1 : 0}
        />
      )}
    </Group>
  );
}
