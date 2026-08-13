'use client';

import React from 'react';
import { Circle, Rect } from 'react-konva';
import type { CircleObject, RectObject, ShapeObject } from '@/stores/editorStore';
import type { CommonProps, ShadowProps } from './shared';
import { buildFillProps, useImageLoader } from './shared';

/**
 * Rect renderer: a plain Konva <Rect> with stroke and optional image-fill
 * pattern (fallback color for shapes is the editor blue).
 */
export function RectRenderer({
  obj,
  commonProps,
  shadowProps,
}: {
  obj: RectObject;
  commonProps: CommonProps;
  shadowProps: ShadowProps;
}) {
  const imageFillElement = useImageLoader(obj.imageFill?.src);
  const fillProps = buildFillProps(obj, imageFillElement, '#3b82f6');

  return (
    <Rect
      {...commonProps}
      {...shadowProps}
      width={obj.width}
      height={obj.height}
      stroke={obj.stroke}
      strokeWidth={obj.strokeWidth || 0}
      {...fillProps}
    />
  );
}

/**
 * Circle renderer: a Konva <Circle> sized from the object width, with stroke
 * and optional image-fill pattern.
 */
export function CircleRenderer({
  obj,
  commonProps,
  shadowProps,
}: {
  obj: CircleObject;
  commonProps: CommonProps;
  shadowProps: ShadowProps;
}) {
  const imageFillElement = useImageLoader(obj.imageFill?.src);
  const fillProps = buildFillProps(obj, imageFillElement, '#3b82f6');

  return (
    <Circle
      {...commonProps}
      {...shadowProps}
      radius={obj.width / 2}
      stroke={obj.stroke}
      strokeWidth={obj.strokeWidth || 0}
      {...fillProps}
    />
  );
}

/**
 * Shape renderer: the 'shape' kind currently has no visual representation
 * (the previous dispatcher returned null for it). Kept as an explicit
 * component so the dispatcher's switch is exhaustive and the kind has a
 * single place to grow.
 */
export function ShapeRenderer({
  obj,
  commonProps,
  shadowProps,
}: {
  obj: ShapeObject;
  commonProps: CommonProps;
  shadowProps: ShadowProps;
}) {
  void obj;
  void commonProps;
  void shadowProps;
  return null;
}
