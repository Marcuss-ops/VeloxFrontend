'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

export interface CanvasViewport {
  viewportSize: { width: number; height: number };
  fitScale: number;
  displayScale: number;
  fitOffsetX: number;
  fitOffsetY: number;
  displayOffsetX: number;
  displayOffsetY: number;
  isPanning: boolean;
  handleStageDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleStageDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleStageDragEnd: () => void;
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
}

/**
 * Viewport and zoom/pan of the Konva stage.
 *
 * The Konva stage is a viewport, not the document: the logical 1920×1080
 * document is fit into the actual editor container and the user's zoom is a
 * multiplier over that fit scale. This hook owns the container sizing
 * (ResizeObserver), the fit/display geometry, spacebar panning and wheel
 * zoom, reading zoom/offset from the editor store and writing back through
 * its setters.
 */
export function useCanvasViewport({
  containerRef,
  stageRef,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage | null>;
}): CanvasViewport {
  const { canvasWidth, canvasHeight, zoom, offsetX, offsetY, setZoom, setOffset } = useEditorStore();
  const { editingId } = useUIStore();

  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

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

  // Spacebar panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingId && e.target === document.body) {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingId]);

  const handleStageDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isPanning) return;
    const stage = stageRef.current;
    if (!stage) return;
    panStartRef.current = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      ox: offsetX,
      oy: offsetY,
    };
  }, [isPanning, offsetX, offsetY, stageRef]);

  const handleStageDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isPanning || !panStartRef.current) return;
    const dx = e.evt.clientX - panStartRef.current.x;
    const dy = e.evt.clientY - panStartRef.current.y;
    setOffset(panStartRef.current.ox + dx, panStartRef.current.oy + dy);
  }, [isPanning, setOffset]);

  const handleStageDragEnd = useCallback(() => {
    panStartRef.current = null;
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = displayScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - displayOffsetX) / oldScale,
      y: (pointer.y - displayOffsetY) / oldScale,
    };

    const speed = 1.05;
    const nextZoom = e.evt.deltaY < 0 ? zoom * speed : zoom / speed;
    const clampedZoom = Math.max(0.1, Math.min(5, nextZoom));

    setZoom(clampedZoom);
    const nextDisplayScale = fitScale * clampedZoom;
    setOffset(
      pointer.x - mousePointTo.x * nextDisplayScale - fitOffsetX,
      pointer.y - mousePointTo.y * nextDisplayScale - fitOffsetY,
    );
  }, [displayScale, displayOffsetX, displayOffsetY, fitOffsetX, fitOffsetY, fitScale, setOffset, setZoom, stageRef, zoom]);

  return {
    viewportSize,
    fitScale,
    displayScale,
    fitOffsetX,
    fitOffsetY,
    displayOffsetX,
    displayOffsetY,
    isPanning,
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,
    handleWheel,
  };
}
