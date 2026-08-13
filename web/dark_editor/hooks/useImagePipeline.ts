'use client';

import { useEffect, useState } from 'react';
import { applyAllFilters } from '@/lib/imageFilters';
import { resolveEditorAssetUrl } from '@/lib/api';
import { traceCropShape } from '@/lib/cropClipGeometry';
import type { ImageObject } from '@/stores/editorStore';

export interface ImagePipelineResult {
  originalImage: HTMLImageElement | null;
  processedImage: HTMLImageElement | HTMLCanvasElement | null;
  featheredImage: HTMLCanvasElement | HTMLImageElement | null;
}

/**
 * useImagePipeline — the image-renderer effect chain: load the asset, apply
 * blur/sharpen/pixelation filters in a worker, then feather the crop
 * (circle/square/lasso) into a masked canvas. Extracted from ImageRenderer
 * so the component stays a lean declarative renderer.
 */
export function useImagePipeline(obj: ImageObject): ImagePipelineResult {
  const {
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
  } = obj;

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
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

    const imgWidth = ('naturalWidth' in processedImage ? processedImage.naturalWidth : undefined) || processedImage.width || 0;
    const imgHeight = ('naturalHeight' in processedImage ? processedImage.naturalHeight : undefined) || processedImage.height || 0;
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
    if (traceCropShape(maskCtx, cropMode, width, height, cropPathPoints)) {
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
        0, 0, width, height
      );
    } else {
      outputCtx.drawImage(processedImage, 0, 0, width, height);
    }

    setFeatheredImage(outputCanvas);
  }, [processedImage, originalImage, width, height, cropRect, cropMode, cropPathPoints, feather]);

  return { originalImage, processedImage, featheredImage };
}
