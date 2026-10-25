'use client';

import React from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { useImagePipeline } from '@/hooks/useImagePipeline';
import { useImageAlphaBounds } from '@/hooks/useImageAlphaBounds';
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

  const { processedImage, featheredImage } = useImagePipeline(obj);
  const activeImage = featheredImage || processedImage;
  const alphaBounds = useImageAlphaBounds(activeImage);

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

  const activeWidth = activeImage
    ? (('naturalWidth' in activeImage ? activeImage.naturalWidth : 0) || activeImage.width)
    : width;
  const activeHeight = activeImage
    ? (('naturalHeight' in activeImage ? activeImage.naturalHeight : 0) || activeImage.height)
    : height;
  const sourceCrop = featheredImage
    ? { x: 0, y: 0, width: 1, height: 1 }
    : (cropRect || { x: 0, y: 0, width: 1, height: 1 });
  const cropLeft = sourceCrop.x * activeWidth;
  const cropTop = sourceCrop.y * activeHeight;
  const cropRight = (sourceCrop.x + sourceCrop.width) * activeWidth;
  const cropBottom = (sourceCrop.y + sourceCrop.height) * activeHeight;
  const visibleLeft = Math.max(cropLeft, alphaBounds?.x ?? 0);
  const visibleTop = Math.max(cropTop, alphaBounds?.y ?? 0);
  const visibleRight = Math.min(cropRight, (alphaBounds?.x ?? activeWidth) + (alphaBounds?.width ?? activeWidth));
  const visibleBottom = Math.min(cropBottom, (alphaBounds?.y ?? activeHeight) + (alphaBounds?.height ?? activeHeight));
  const hasVisibleIntersection = visibleRight > visibleLeft && visibleBottom > visibleTop;
  const visibleCrop = hasVisibleIntersection
    ? { x: visibleLeft, y: visibleTop, width: visibleRight - visibleLeft, height: visibleBottom - visibleTop }
    : { x: cropLeft, y: cropTop, width: cropRight - cropLeft, height: cropBottom - cropTop };
  const visibleImageProps = {
    x: (visibleCrop.x - cropLeft) / Math.max(1, cropRight - cropLeft) * width,
    y: (visibleCrop.y - cropTop) / Math.max(1, cropBottom - cropTop) * height,
    width: visibleCrop.width / Math.max(1, cropRight - cropLeft) * width,
    height: visibleCrop.height / Math.max(1, cropBottom - cropTop) * height,
    crop: visibleCrop,
  };

  const clipFunc = (() => {
    if (!cropMode || cropMode === 'free') return undefined;
    if (cropMode === 'lasso' && (!cropPathPoints || cropPathPoints.length < 6)) return undefined;
    return (ctx: Konva.Context) => {
      traceCropShape(ctx, cropMode, width, height, cropPathPoints);
    };
  })();

  const activeClipFunc = featheredImage ? undefined : clipFunc;

  // Note: shadowOffset/shadowOpacity were previously spread onto the Group
  // here, but Groups are not Shapes — Konva ignores those attrs on a Group,
  // so they were inert. They still reach the inner KonvaImage via
  // shadowColor/shadowBlur and the placeholder Rect via restShadowProps.
  return (
    <Group {...commonProps} clipFunc={activeClipFunc}>
      <KonvaImage
        image={activeImage || undefined}
        {...visibleImageProps}
        key={`img-${src}-${blur}-${sharpen}-${pixelation}-${feather ? 'feathered' : 'normal'}`}
        shadowColor={shadowColor}
        shadowBlur={shadowBlur}
        shadowOffsetX={shadowOffsetX}
        shadowOffsetY={shadowOffsetY}
      />
      {processing && <Rect width={width} height={height} fill="rgba(0,0,0,0.5)" />}
    </Group>
  );
}
