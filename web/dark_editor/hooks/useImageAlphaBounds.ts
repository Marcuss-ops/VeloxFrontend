'use client';

import { useEffect, useState } from 'react';

export interface ImageAlphaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

/** Find the non-transparent pixel bounds so image handles follow visible pixels. */
export function useImageAlphaBounds(
  image: HTMLImageElement | HTMLCanvasElement | null
): ImageAlphaBounds | null {
  const [bounds, setBounds] = useState<ImageAlphaBounds | null>(null);

  useEffect(() => {
    if (!image) {
      setBounds(null);
      return;
    }

    const imageWidth = ('naturalWidth' in image ? image.naturalWidth : 0) || image.width;
    const imageHeight = ('naturalHeight' in image ? image.naturalHeight : 0) || image.height;
    if (!imageWidth || !imageHeight) {
      setBounds(null);
      return;
    }

    try {
      const scanScale = Math.min(1, 512 / Math.max(imageWidth, imageHeight));
      const scanWidth = Math.max(1, Math.round(imageWidth * scanScale));
      const scanHeight = Math.max(1, Math.round(imageHeight * scanScale));
      const canvas = document.createElement('canvas');
      canvas.width = scanWidth;
      canvas.height = scanHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        setBounds(null);
        return;
      }
      context.drawImage(image, 0, 0, scanWidth, scanHeight);
      const { data } = context.getImageData(0, 0, scanWidth, scanHeight);
      let left = scanWidth;
      let top = scanHeight;
      let right = -1;
      let bottom = -1;

      for (let y = 0; y < scanHeight; y += 1) {
        for (let x = 0; x < scanWidth; x += 1) {
          // Ignore barely visible antialiasing/noise around the true silhouette.
          if (data[(y * scanWidth + x) * 4 + 3] <= 8) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }

      setBounds(right < left || bottom < top
        ? { x: 0, y: 0, width: imageWidth, height: imageHeight, imageWidth, imageHeight }
        : {
            x: Math.floor(left / scanWidth * imageWidth),
            y: Math.floor(top / scanHeight * imageHeight),
            width: Math.ceil((right + 1) / scanWidth * imageWidth) - Math.floor(left / scanWidth * imageWidth),
            height: Math.ceil((bottom + 1) / scanHeight * imageHeight) - Math.floor(top / scanHeight * imageHeight),
            imageWidth,
            imageHeight,
          });
    } catch {
      // Tainted or unreadable assets keep their original full-image bounds.
      setBounds({ x: 0, y: 0, width: imageWidth, height: imageHeight, imageWidth, imageHeight });
    }
  }, [image]);

  return bounds;
}
