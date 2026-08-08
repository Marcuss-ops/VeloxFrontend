// hooks/useCanvasStage.ts — Konva stage interaction hook for the InstaEditor.
//
// Extracted from components/editor/Canvas.tsx (commit 1 of 3 in the canvas
// hooks refactor) so the canvas component can stay focused on rendering and
// selection orchestration while the stage-level concerns live in their own
// focused module.
//
// Owns:
//   - stageRef (the Konva.Stage instance ref) + useImperativeHandle that
//     exposes `getStage()` on the parent's forwarded ref / props.canvasRef.
//   - containerRef fallback (internal HTMLDivElement ref if no external
//     containerRef was passed via props).
//   - isPanning state + panStartRef (spacebar-to-pan tracking).
//   - guides state (snap guide lines drawn during drag, exposed via
//     {v: number[]; h: number[]} for the renderer's overlay <Rect>s).
//   - Spacebar pan useEffect (Space toggles panning; ignored while a text
//     edit is active so the textarea keeps Spacebar input).
//   - handleStageDragStart / handleStageDragMove / handleStageDragEnd
//     (mouse-drag panning of the stage while isPanning is true).
//   - handleWheel (zoom around the cursor; multiplies zoom by 1.05 per
//     wheel notch and clamps to [0.1, 5]).
//   - snap (utility for snap-to-grid rounding; takes a value and returns
//     it rounded to the nearest gridSize when snapToGrid is enabled).
//
// The hook does NOT own:
//   - transformerRef (owned by useCanvasSelection — commit 2).
//   - cropDraft / lassoPoints / isDrawingLasso (owned by useCanvasKeyboard
//     and the canvas component orchestrator — commits 2 + 3).

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Konva from 'konva';

export interface UseCanvasStageArgs {
  forwardedRef?: React.Ref<any>;
  containerRef?: React.RefObject<HTMLDivElement>;
  zoom: number;
  offsetX: number;
  offsetY: number;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
  editingId: string | null;
}

export interface UseCanvasStageReturn {
  stageRef: React.RefObject<Konva.Stage>;
  containerRef: React.RefObject<HTMLDivElement>;
  isPanning: boolean;
  guides: { v: number[]; h: number[] };
  handleStageDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleStageDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleStageDragEnd: () => void;
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
}

export function useCanvasStage({
  forwardedRef,
  containerRef: externalContainerRef,
  zoom,
  offsetX,
  offsetY,
  setZoom,
  setOffset,
  editingId,
}: UseCanvasStageArgs): UseCanvasStageReturn {
  const stageRef = useRef<Konva.Stage>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalContainerRef;

  React.useImperativeHandle(forwardedRef, () => ({
    getStage: () => stageRef.current,
  }));

  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({
    v: [],
    h: [],
  });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);

  // Spacebar panning — Spacebar toggles isPanning; ignored while editing text
  // so the textarea keeps Spacebar as a normal character input.
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
    [isPanning, offsetX, offsetY]
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

  // Wheel zoom — zoom around the cursor with 1.05x speed and clamp to [0.1, 5].
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - offsetX) / oldScale,
        y: (pointer.y - offsetY) / oldScale,
      };

      const speed = 1.05;
      const nextScale =
        e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;
      const clampedScale = Math.max(0.1, Math.min(5, nextScale));

      setZoom(clampedScale);
      setOffset(
        pointer.x - mousePointTo.x * clampedScale,
        pointer.y - mousePointTo.y * clampedScale
      );
    },
    [zoom, offsetX, offsetY, setZoom, setOffset]
  );

  return {
    stageRef,
    containerRef,
    isPanning,
    guides,
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,
    handleWheel,
  };
}
