'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import Konva from 'konva';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import type { CanvasViewport } from './useCanvasViewport';

interface CanvasPanZoomOptions {
  stageRef: RefObject<Konva.Stage | null>;
  viewport: CanvasViewport;
}

export interface CanvasPanZoomApi {
  isPanning: boolean;
  handleStageDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleStageDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleStageDragEnd: () => void;
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
}

/**
 * useCanvasPanZoom — owns the spacebar pan gesture, the stage drag pan and
 * the wheel zoom (anchored on the pointer). Extracted from Canvas.tsx so the
 * composition root no longer carries the viewport interaction state.
 *
 * Zoom keeps the cursor over the same document point: the pointer is mapped
 * back into document coordinates and the offset is recomputed for the new
 * display scale.
 */
export function useCanvasPanZoom({ stageRef, viewport }: CanvasPanZoomOptions): CanvasPanZoomApi {
  const { zoom, offsetX, offsetY, setZoom, setOffset } = useEditorStore();
  const { editingId } = useUIStore();
  const {
    fitScale,
    displayScale,
    fitOffsetX,
    fitOffsetY,
    displayOffsetX,
    displayOffsetY,
  } = viewport;

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

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

  const handleStageDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!isPanning) return;
      const stage = stageRef.current;
      if (!stage) return;
      panStartRef.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
        ox: offsetX,
        oy: offsetY,
      };
    },
    [isPanning, offsetX, offsetY, stageRef]
  );

  const handleStageDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!isPanning || !panStartRef.current) return;
      const dx = e.evt.clientX - panStartRef.current.x;
      const dy = e.evt.clientY - panStartRef.current.y;
      setOffset(panStartRef.current.ox + dx, panStartRef.current.oy + dy);
    },
    [isPanning, setOffset]
  );

  const handleStageDragEnd = useCallback(() => {
    panStartRef.current = null;
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
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
    },
    [stageRef, displayScale, displayOffsetX, displayOffsetY, fitOffsetX, fitOffsetY, fitScale, setOffset, setZoom, zoom]
  );

  return {
    isPanning,
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,
    handleWheel,
  };
}
