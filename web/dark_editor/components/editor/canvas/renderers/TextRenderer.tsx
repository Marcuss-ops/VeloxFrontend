'use client';

import React from 'react';
import type Konva from 'konva';
import { Group, Rect, Text, TextPath } from 'react-konva';
import { censorText } from '@/lib/textCensorship';
import type { TextObject } from '@/stores/editorStore';
import type { CommonProps, ShadowProps } from './shared';
import { buildFillProps, resolveFontFamily, resolveFontStyle, useImageLoader } from './shared';

/**
 * Text renderer: renders the layer as Konva <Text> (or <TextPath> when a text
 * curve is enabled) with censorship/all-caps transforms, an optional
 * background pill and the text-shadow/stroke effect fields. Fill order and
 * shadow override semantics (dropShadow first, textShadow second) are kept
 * exactly as before.
 */
export function TextRenderer({
  obj,
  commonProps,
  shadowProps,
  editingId,
  handleTextDblClick,
}: {
  obj: TextObject;
  commonProps: CommonProps;
  shadowProps: ShadowProps;
  editingId: string | null;
  handleTextDblClick: (e: Konva.KonvaEventObject<MouseEvent>, id: string) => void;
}) {
  const imageFillElement = useImageLoader(obj.imageFill?.src);
  const fillProps = buildFillProps(obj, imageFillElement, '#ffffff');

  const rawText = obj.text || '';
  const maybeCensored = obj.useCensorship ? censorText(rawText) : rawText;
  const displayText = obj.allCaps ? maybeCensored.toUpperCase() : maybeCensored;

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
          fontStyle={resolveFontStyle(obj.fontWeight)}
          letterSpacing={obj.letterSpacing ?? 0}
          fill={obj.fill || '#ffffff'}
          data={(() => {
            const r = obj.textCurve.radius || 200;
            const isUp = obj.textCurve.direction === 'up';
            return isUp
              ? `M 0,${r} A ${r},${r} 0 0,1 ${obj.width},${r}`
              : `M 0,0 A ${r},${r} 0 0,0 ${obj.width},0`;
          })()}
          visible={editingId !== obj.id}
          stroke={obj.textStroke?.color}
          strokeWidth={obj.textStroke?.width ?? 0}
          {...shadowProps}
          {...fillProps}
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
          width={obj.width}
          padding={obj.padding ?? 0}
          fontSize={obj.fontSize || 24}
          fontFamily={resolveFontFamily(obj.fontFamily)}
          fontStyle={resolveFontStyle(obj.fontWeight)}
          lineHeight={obj.lineHeight ?? 1}
          letterSpacing={obj.letterSpacing ?? 0}
          align="left"
          verticalAlign="top"
          ellipsis={false}
          fill={obj.fill || '#ffffff'}
          wrap="word"
          stroke={obj.textStroke?.color}
          strokeWidth={obj.textStroke?.width ?? 0}
          visible={editingId !== obj.id}
          {...shadowProps}
          {...fillProps}
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
