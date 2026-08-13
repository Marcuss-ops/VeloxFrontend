'use client';

import React, { useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { applyAllFilters } from '@/lib/imageFilters';
import { resolveEditorAssetUrl } from '@/lib/api';
import { useImageLoader } from './utils';

function ImageRenderer({
  src,
  width,
  height,
  cropRect,
  cropMode,
  cropPathPoints,
  feather = 0,
  blur,
  sharpen,
  pixelation,
  shadowColor,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  ...props
}: any) {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<any>(null);
  const [featheredImage, setFeatheredImage] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setOriginalImage(img);
    img.src = resolveEditorAssetUrl(src);
  }, [src]);

  useEffect(() => {
    if (!originalImage) return;
    if (!blur && !sharpen && !pixelation) {
      setProcessedImage(originalImage);
      return;
    }

    let isActive = true;

    const timeoutId = setTimeout(() => {
      applyAllFilters(originalImage, { blur, sharpen, pixelation }).then((canvas) => {
        if (isActive) {
          setProcessedImage(canvas);
        }
      });
    }, 50);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [originalImage, blur, sharpen, pixelation]);

  useEffect(() => {
    if (!processedImage) {
      setFeatheredImage(null);
      return;
    }

    if (!feather || feather <= 0 || !cropMode || cropMode === 'free') {
      setFeatheredImage(null);
      return;
    }

    const imgWidth = processedImage.naturalWidth || processedImage.width || 0;
    const imgHeight = processedImage.naturalHeight || processedImage.height || 0;
    if (imgWidth === 0 || imgHeight === 0) {
      setFeatheredImage(null);
      return;
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext('2d')!;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d')!;

    maskCtx.fillStyle = 'white';
    if (cropMode === 'circle') {
      const size = Math.min(width, height);
      const radius = size / 2;
      maskCtx.beginPath();
      maskCtx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      maskCtx.closePath();
      maskCtx.fill();
    } else if (cropMode === 'square') {
      const size = Math.min(width, height);
      const x = (width - size) / 2;
      const y = (height - size) / 2;
      maskCtx.fillRect(x, y, size, size);
    } else if (cropMode === 'lasso' && cropPathPoints && cropPathPoints.length >= 6) {
      maskCtx.beginPath();
      maskCtx.moveTo(cropPathPoints[0] * width, cropPathPoints[1] * height);
      for (let i = 2; i < cropPathPoints.length; i += 2) {
        maskCtx.lineTo(cropPathPoints[i] * width, cropPathPoints[i + 1] * height);
      }
      maskCtx.closePath();
      maskCtx.fill();
    }

    outputCtx.filter = `blur(${feather}px)`;
    outputCtx.drawImage(maskCanvas, 0, 0);
    outputCtx.filter = 'none';

    outputCtx.globalCompositeOperation = 'source-in';

    if (cropRect && originalImage) {
      outputCtx.drawImage(
        processedImage,
        cropRect.x * imgWidth,
        cropRect.y * imgHeight,
        cropRect.width * imgWidth,
        cropRect.height * imgHeight,
        0, 0, width, height,
      );
    } else {
      outputCtx.drawImage(processedImage, 0, 0, width, height);
    }

    setFeatheredImage(outputCanvas);
  }, [processedImage, originalImage, width, height, cropRect, cropMode, cropPathPoints, feather]);

  if (!processedImage) {
    return (
      <Rect
        {...props}
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

  const clipFunc = cropMode === 'circle'
    ? (ctx: Konva.Context) => {
        const size = Math.min(width, height);
        const radius = size / 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2, false);
        ctx.closePath();
      }
    : cropMode === 'square'
      ? (ctx: Konva.Context) => {
          const size = Math.min(width, height);
          const x = (width - size) / 2;
          const y = (height - size) / 2;
          ctx.rect(x, y, size, size);
        }
      : cropMode === 'lasso' && cropPathPoints && cropPathPoints.length >= 6
        ? (ctx: Konva.Context) => {
            ctx.beginPath();
            ctx.moveTo(cropPathPoints[0] * width, cropPathPoints[1] * height);
            for (let i = 2; i < cropPathPoints.length; i += 2) {
              ctx.lineTo(cropPathPoints[i] * width, cropPathPoints[i + 1] * height);
            }
            ctx.closePath();
          }
        : undefined;

  const activeImage = featheredImage || processedImage;
  const activeCropProps = featheredImage ? {} : cropProps;
  const activeClipFunc = featheredImage ? undefined : clipFunc;

  return (
    <Group {...props} clipFunc={activeClipFunc}>
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
      {props.processing && <Rect width={width} height={height} fill="rgba(0,0,0,0.5)" />}
    </Group>
  );
}

export interface RenderMediaLayerArgs {
  obj: import('@/stores/editorStore').ImageObject;
  commonProps: any;
  shadowProps: any;
}

/**
 * renderMediaLayer \u2014 the 'image' case from ObjectRenderer's
 * switch. Loads the source image via useImageLoader, applies the
 * blur/sharpen/pixelation filter pipeline (50ms debounce) and
 * the optional crop mask (rect/circle/lasso) + feather blur,
 * then renders the result as a Konva.Image with shadow props.
 *
 * `obj.src` is REQUIRED. Empty src falls back to a placeholder
 * Rect (rendered in ImageRenderer) so the editor remains
 * interactive even when the asset hasn't loaded yet.
 */
export function renderMediaLayer({ obj, commonProps, shadowProps }: RenderMediaLayerArgs) {
  return (
    <ImageRenderer
      {...commonProps}
      {...shadowProps}
      src={obj.src || ''}
      width={obj.width}
      height={obj.height}
      cropRect={obj.cropRect}
      cropMode={obj.cropMode}
      cropPathPoints={obj.cropPathPoints}
      feather={obj.feather}
      blur={obj.blur}
      sharpen={obj.sharpen}
      pixelation={obj.pixelation}
      processing={obj.processing}
      borderRadius={obj.borderRadius}
    />
  );
}
