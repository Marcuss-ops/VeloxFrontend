'use client';

import React from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { useImagePipeline } from '@/hooks/useImagePipeline';
import { traceCropShape } from '@/lib/cropClipGeometry';
import type { ImageObject } from '@/stores/editorStore';
import type { CommonProps, ShadowProps } from './shared';

/**
 * Image renderer: loads the asset, applies blur/sharpen/pixelation filters in
 * a worker and feathers the crop (circle/square/lasso) into a masked canvas
 * (all in useImagePipeline). The shadow fields are applied on the inner image
 * node exactly as before (the drop-shadow offset object stays on the wrapping
 * Group via `restShadowProps`), preserving the previous Konva shadow behavior.
 */
export function ImageRenderer({
  obj,
  commonProps,
  shadowProps,
}: {
  obj: ImageObject;
  commonProps: CommonProps;
  shadowProps: ShadowProps;
}) {
  const { src, width, height, cropRect, cropMode, cropPathPoints, feather, blur, sharpen, pixelation, processing } = obj;
  const { shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, ...restShadowProps } = shadowProps;

  const { originalImage, processedImage, featheredImage } = useImagePipeline(obj);

  if (!processedImage) {
    return (
      <Rect
        {...commonProps}
        {...restShadowProps}
        width={width}
        height={height}
        fill="#2a2a4e"
        stroke="#3b82f6"
        strokeWidth={2}
        shadowColor={shadowColor}
        shadowBlur={shadowBlur}
        shadowOffsetX={shadowOffsetX}
        shadowOffsetY={shadowOffsetY}
      />
    );
  }

  const cropProps = cropRect && originalImage
    ? {
        crop: {
          x: cropRect.x * originalImage.naturalWidth,
          y: cropRect.y * originalImage.naturalHeight,
          width: cropRect.width * originalImage.naturalWidth,
          height: cropRect.height * originalImage.naturalHeight,
        },
      }
    : {};

  const clipFunc = (() => {
    if (!cropMode || cropMode === 'free') return undefined;
    if (cropMode === 'lasso' && (!cropPathPoints || cropPathPoints.length < 6)) return undefined;
    return (ctx: Konva.Context) => {
      traceCropShape(ctx, cropMode, width, height, cropPathPoints);
    };
  })();

  const activeImage = featheredImage || processedImage;
  const activeCropProps = featheredImage ? {} : cropProps;
  const activeClipFunc = featheredImage ? undefined : clipFunc;

  // Note: shadowOffset/shadowOpacity were previously spread onto the Group
  // here, but Groups are not Shapes — Konva ignores those attrs on a Group,
  // so they were inert. They still reach the inner KonvaImage via
  // shadowColor/shadowBlur and the placeholder Rect via restShadowProps.
  return (
    <Group {...commonProps} clipFunc={activeClipFunc}>
      <KonvaImage
        image={activeImage}
        width={width}
        height={height}
        key={`img-${src}-${blur}-${sharpen}-${pixelation}-${feather ? 'feathered' : 'normal'}`}
        {...activeCropProps}
        shadowColor={shadowColor}
        shadowBlur={shadowBlur}
        shadowOffsetX={shadowOffsetX}
        shadowOffsetY={shadowOffsetY}
      />
      {processing && <Rect width={width} height={height} fill="rgba(0,0,0,0.5)" />}
    </Group>
  );
}
