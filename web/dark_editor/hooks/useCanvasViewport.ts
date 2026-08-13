'use client';

import React, { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export interface CanvasViewport {
  viewportSize: { width: number; height: number };
  fitScale: number;
  displayScale: number;
  fitOffsetX: number;
  fitOffsetY: number;
  displayOffsetX: number;
  displayOffsetY: number;
}

/**
 * Viewport geometry of the Konva stage.
 *
 * The Konva stage is a viewport, not the document: the logical 1920×1080
 * document is fit into the actual editor container and the user's zoom is a
 * multiplier over that fit scale. This hook owns the container sizing
 * (ResizeObserver) and the resulting fit/display geometry; the pan/zoom
 * interactions (spacebar + stage drag + wheel) live in useCanvasPanZoom,
 * which reads and writes the zoom/offset store fields directly.
 */
export function useCanvasViewport(containerRef: React.RefObject<HTMLDivElement>): CanvasViewport {
  const { canvasWidth, canvasHeight, zoom, offsetX, offsetY } = useEditorStore();

  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateViewportSize = () => {
      setViewportSize({
        width: Math.max(1, element.clientWidth),
        height: Math.max(1, element.clientHeight),
      });
    };

    updateViewportSize();
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateViewportSize)
      : null;
    observer?.observe(element);
    window.addEventListener('resize', updateViewportSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateViewportSize);
    };
  }, [containerRef]);

  const fitScale = Math.min(
    viewportSize.width / Math.max(1, canvasWidth),
    viewportSize.height / Math.max(1, canvasHeight),
  );
  const displayScale = Math.max(0.01, fitScale * zoom);
  const fitOffsetX = (viewportSize.width - canvasWidth * fitScale) / 2;
  const fitOffsetY = (viewportSize.height - canvasHeight * fitScale) / 2;
  const displayOffsetX = fitOffsetX + offsetX;
  const displayOffsetY = fitOffsetY + offsetY;

  return {
    viewportSize,
    fitScale,
    displayScale,
    fitOffsetX,
    fitOffsetY,
    displayOffsetX,
    displayOffsetY,
  };
}
