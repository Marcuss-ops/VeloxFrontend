'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Line, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import type { CanvasObject } from '@/stores/editorStore';
import { shieldRects, thirdsGuideLines } from '@/lib/cropClipGeometry';

type CropDraft = { x: number; y: number; width: number; height: number };

export function CropSelectionOverlay({
  target,
  draft,
  mode,
  onDraftChange,
}: {
  target: CanvasObject;
  draft: CropDraft;
  mode: 'free' | 'square' | 'circle';
  onDraftChange: (draft: CropDraft) => void;
}) {
  const rectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const scaleX = Math.max(0.0001, target.scaleX || 1);
  const scaleY = Math.max(0.0001, target.scaleY || 1);
  const stageBounds = {
    x: target.x,
    y: target.y,
    width: Math.max(1, target.width * scaleX),
    height: Math.max(1, target.height * scaleY),
  };

  useEffect(() => {
    if (!transformerRef.current || !rectRef.current) return;
    transformerRef.current.nodes([rectRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [draft, target.id]);

  const keepRatio = mode !== 'free';
  const cornerRadius = mode === 'circle'
    ? Math.min(draft.width * scaleX, draft.height * scaleY) / 2
    : 18;

  const clampDraft = useCallback((next: CropDraft): CropDraft => {
    const maxWidth = Math.max(20 / scaleX, target.width - next.x);
    const maxHeight = Math.max(20 / scaleY, target.height - next.y);
    const width = Math.max(20 / scaleX, Math.min(next.width, maxWidth));
    const height = Math.max(20 / scaleY, Math.min(next.height, maxHeight));
    const x = Math.max(0, Math.min(next.x, Math.max(0, target.width - width)));
    const y = Math.max(0, Math.min(next.y, Math.max(0, target.height - height)));

    let adjustedWidth = width;
    let adjustedHeight = height;

    if (mode !== 'free') {
      const size = Math.min(adjustedWidth, adjustedHeight);
      adjustedWidth = size;
      adjustedHeight = size;
    }

    return { x, y, width: adjustedWidth, height: adjustedHeight };
  }, [mode, scaleX, scaleY, target.width, target.height]);

  const syncFromNode = (node: Konva.Rect) => {
    const nextStageWidth = Math.max(20, node.width() * node.scaleX());
    const nextStageHeight = Math.max(20, node.height() * node.scaleY());
    const nextStageX = Math.min(
      Math.max(stageBounds.x, node.x()),
      Math.max(stageBounds.x, stageBounds.x + stageBounds.width - nextStageWidth)
    );
    const nextStageY = Math.min(
      Math.max(stageBounds.y, node.y()),
      Math.max(stageBounds.y, stageBounds.y + stageBounds.height - nextStageHeight)
    );

    node.scaleX(1);
    node.scaleY(1);
    node.position({ x: nextStageX, y: nextStageY });
    node.width(nextStageWidth);
    node.height(nextStageHeight);

    onDraftChange(
      clampDraft({
        x: (nextStageX - stageBounds.x) / scaleX,
        y: (nextStageY - stageBounds.y) / scaleY,
        width: nextStageWidth / scaleX,
        height: nextStageHeight / scaleY,
      })
    );
  };

  const stageRect = {
    x: stageBounds.x + draft.x * scaleX,
    y: stageBounds.y + draft.y * scaleY,
    width: draft.width * scaleX,
    height: draft.height * scaleY,
  };

  const shields = shieldRects(stageRect, stageBounds);
  const guideLines = thirdsGuideLines(stageRect);

  return (
    <>
      {/* Dimming / Shield Areas (Photoshop style) */}
      {shields.map((rect, index) => (
        <Rect key={index} {...rect} fill="rgba(0, 0, 0, 0.55)" listening={false} />
      ))}

      {/* Rule of Thirds Helper Grid lines */}
      {guideLines.map((line, index) => (
        <Line
          key={index}
          points={[line.x1, line.y1, line.x2, line.y2]}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={1}
          listening={false}
        />
      ))}

      <Rect
        ref={rectRef}
        x={stageRect.x}
        y={stageRect.y}
        width={stageRect.width}
        height={stageRect.height}
        fill="rgba(56, 189, 248, 0.05)"
        stroke="rgba(125, 211, 252, 0.95)"
        strokeWidth={2}
        dash={[8, 6]}
        cornerRadius={cornerRadius}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onDragEnd={(e) => syncFromNode(e.target as Konva.Rect)}
        onTransformEnd={(e) => syncFromNode(e.target as Konva.Rect)}
      />
      <Transformer
        ref={transformerRef}
        rotateEnabled={false}
        keepRatio={keepRatio}
        centeredScaling={false}
        boundBoxFunc={(oldBox, newBox) => {
          const minSize = 20;
          const x = Math.max(stageBounds.x, newBox.x);
          const y = Math.max(stageBounds.y, newBox.y);
          let width = Math.min(newBox.width, stageBounds.x + stageBounds.width - x);
          let height = Math.min(newBox.height, stageBounds.y + stageBounds.height - y);
          
          if (width < minSize || height < minSize) {
            return oldBox;
          }
          
          if (mode !== 'free') {
            const size = Math.min(width, height);
            width = size;
            height = size;
          }
          
          return {
            x,
            y,
            width,
            height,
            rotation: 0
          };
        }}
      />
    </>
  );
}
