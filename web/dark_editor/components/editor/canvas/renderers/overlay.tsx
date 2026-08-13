'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Group, Line, Rect, TextPath, Transformer } from 'react-konva';
import Konva from 'konva';
import { resolveFontFamily } from './utils';

interface TextEditorOverlayProps {
  obj: import('@/stores/editorStore').TextObject;
  stage: Konva.Stage;
  zoom: number;
  offsetX: number;
  offsetY: number;
  onSave: (text: string) => void;
  onClose: () => void;
}

/**
 * TextEditorOverlay \u2014 a DOM <textarea> that floats over the
 * Konva stage when a text object is being edited in place.
 *
 * Position is computed in screen space (obj.x * zoom + offsetX)
 * so the textarea follows the stage's pan/zoom transforms without
 * re-rendering the Konva tree. minWidth/minHeight mirror the
 * object's box so the textarea starts at the right size; the
 * font-size + font-family match the underlying Konva.Text so the
 * operator's experience is "what I type matches what I see".
 *
 * Keyboard: Enter saves, Escape cancels, blur saves. The hook
 * auto-focuses + selects the existing text on mount so the
 * operator can immediately overwrite.
 */
export function TextEditorOverlay({
  obj,
  zoom,
  offsetX,
  offsetY,
  onSave,
  onClose,
}: TextEditorOverlayProps) {
  const [text, setText] = React.useState(obj.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const screenPos = {
    x: obj.x * zoom + offsetX,
    y: obj.y * zoom + offsetY,
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenPos.x}px`,
    top: `${screenPos.y}px`,
    minWidth: `${Math.max(obj.width * zoom * (obj.scaleX || 1), 150)}px`,
    minHeight: `${Math.max(obj.height * zoom * (obj.scaleY || 1), 50)}px`,
    width: 'fit-content',
    height: 'fit-content',
    fontSize: `${(obj.fontSize || 24) * zoom * (obj.scaleY || 1)}px`,
    fontFamily: resolveFontFamily(obj.fontFamily),
    color: obj.fill || '#ffffff',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: `${(obj.padding ?? 0) * zoom}px`,
    lineHeight: obj.lineHeight || 1.1,
    zIndex: 100,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(text);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      style={style}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(text)}
    />
  );
}

export function DocumentCropOverlay({
  canvasWidth,
  canvasHeight,
  cropRect,
  onCropRectChange,
  guidesType = 'thirds',
  ratioPreset = 'free',
}: {
  canvasWidth: number;
  canvasHeight: number;
  cropRect: { x: number; y: number; width: number; height: number };
  onCropRectChange: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  guidesType?: 'none' | 'thirds' | 'grid';
  ratioPreset?: string;
}) {
  const rectRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (transformerRef.current && rectRef.current) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [cropRect]);

  const keepRatio = ratioPreset !== 'free' && ratioPreset !== 'custom';

  // Scurimento aree esterne
  const leftRect = { x: 0, y: 0, width: Math.max(0, cropRect.x), height: canvasHeight };
  const rightRect = {
    x: cropRect.x + cropRect.width,
    y: 0,
    width: Math.max(0, canvasWidth - (cropRect.x + cropRect.width)),
    height: canvasHeight,
  };
  const topRect = {
    x: cropRect.x,
    y: 0,
    width: cropRect.width,
    height: Math.max(0, cropRect.y),
  };
  const bottomRect = {
    x: cropRect.x,
    y: cropRect.y + cropRect.height,
    width: cropRect.width,
    height: Math.max(0, canvasHeight - (cropRect.y + cropRect.height)),
  };

  const handleTransform = () => {
    const node = rectRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const w = Math.round(node.width() * scaleX);
    const h = Math.round(node.height() * scaleY);
    const x = Math.round(node.x());
    const y = Math.round(node.y());

    node.scaleX(1);
    node.scaleY(1);
    node.width(w);
    node.height(h);
    node.position({ x, y });

    onCropRectChange({ x, y, width: w, height: h });
  };

  // Guide lines
  const lines: React.ReactNode[] = [];
  if (guidesType === 'thirds') {
    lines.push(
      <Line
        key="v1"
        points={[cropRect.x + cropRect.width / 3, cropRect.y, cropRect.x + cropRect.width / 3, cropRect.y + cropRect.height]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />,
    );
    lines.push(
      <Line
        key="v2"
        points={[cropRect.x + (cropRect.width * 2) / 3, cropRect.y, cropRect.x + (cropRect.width * 2) / 3, cropRect.y + cropRect.height]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />,
    );
    lines.push(
      <Line
        key="h1"
        points={[cropRect.x, cropRect.y + cropRect.height / 3, cropRect.x + cropRect.width, cropRect.y + cropRect.height / 3]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />,
    );
    lines.push(
      <Line
        key="h2"
        points={[cropRect.x, cropRect.y + (cropRect.height * 2) / 3, cropRect.x + cropRect.width, cropRect.y + (cropRect.height * 2) / 3]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />,
    );
  } else if (guidesType === 'grid') {
    for (let i = 1; i <= 3; i++) {
      const vx = cropRect.x + (cropRect.width * i) / 4;
      const hy = cropRect.y + (cropRect.height * i) / 4;
      lines.push(
        <Line
          key={`gv-${i}`}
          points={[vx, cropRect.y, vx, cropRect.y + cropRect.height]}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={0.5}
          listening={false}
        />,
      );
      lines.push(
        <Line
          key={`gh-${i}`}
          points={[cropRect.x, hy, cropRect.x + cropRect.width, hy]}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={0.5}
          listening={false}
        />,
      );
    }
  }

  return (
    <Group name="document-crop-overlay">
      <Rect {...leftRect} fill="rgba(0,0,0,0.65)" listening={false} />
      <Rect {...rightRect} fill="rgba(0,0,0,0.65)" listening={false} />
      <Rect {...topRect} fill="rgba(0,0,0,0.65)" listening={false} />
      <Rect {...bottomRect} fill="rgba(0,0,0,0.65)" listening={false} />

      {lines}

      <Rect
        ref={rectRef}
        x={cropRect.x}
        y={cropRect.y}
        width={cropRect.width}
        height={cropRect.height}
        stroke="rgba(255, 255, 255, 0.95)"
        strokeWidth={1.5}
        fill="rgba(56, 189, 248, 0.05)"
        draggable
        onDragMove={(e) => {
          const node = e.target;
          let x = node.x();
          let y = node.y();

          x = Math.max(0, Math.min(x, canvasWidth - cropRect.width));
          y = Math.max(0, Math.min(y, canvasHeight - cropRect.height));

          node.position({ x, y });
          onCropRectChange({ ...cropRect, x, y });
        }}
        onTransform={handleTransform}
        onTransformEnd={handleTransform}
      />

      <Transformer
        ref={transformerRef}
        rotateEnabled={false}
        keepRatio={keepRatio}
        centeredScaling={false}
        anchorStroke="#0ea5e9"
        anchorFill="#ffffff"
        anchorSize={8}
        borderStroke="#0ea5e9"
        borderStrokeWidth={1}
        boundBoxFunc={(oldBox, newBox) => {
          const minSize = 20;
          if (newBox.width < minSize || newBox.height < minSize) return oldBox;

          let { x, y, width: w, height: h } = newBox;
          if (x < 0) { w += x; x = 0; }
          if (y < 0) { h += y; y = 0; }
          if (x + w > canvasWidth) { w = canvasWidth - x; }
          if (y + h > canvasHeight) { h = canvasHeight - y; }

          if (keepRatio) {
            const ratio = oldBox.width / oldBox.height;
            if (w / h !== ratio) {
              const size = Math.min(w, h * ratio);
              return { ...newBox, x, y, width: size, height: size / ratio };
            }
          }

          return { ...newBox, x, y, width: w, height: h };
        }}
      />
    </Group>
  );
}

type CropDraft = { x: number; y: number; width: number; height: number };

export function CropSelectionOverlay({
  target,
  draft,
  mode,
  onDraftChange,
}: {
  target: import('@/stores/editorStore').CanvasObject;
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
  const cornerRadius =
    mode === 'circle'
      ? Math.min(draft.width * scaleX, draft.height * scaleY) / 2
      : 18;

  const clampDraft = useCallback(
    (next: CropDraft): CropDraft => {
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
    },
    [mode, scaleX, scaleY, target.width, target.height],
  );

  const syncFromNode = (node: Konva.Rect) => {
    const nextStageWidth = Math.max(20, node.width() * node.scaleX());
    const nextStageHeight = Math.max(20, node.height() * node.scaleY());
    const nextStageX = Math.min(
      Math.max(stageBounds.x, node.x()),
      Math.max(stageBounds.x, stageBounds.x + stageBounds.width - nextStageWidth),
    );
    const nextStageY = Math.min(
      Math.max(stageBounds.y, node.y()),
      Math.max(stageBounds.y, stageBounds.y + stageBounds.height - nextStageHeight),
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
      }),
    );
  };

  const stageRect = {
    x: stageBounds.x + draft.x * scaleX,
    y: stageBounds.y + draft.y * scaleY,
    width: draft.width * scaleX,
    height: draft.height * scaleY,
  };

  const cx = stageRect.x;
  const cy = stageRect.y;
  const cw = stageRect.width;
  const ch = stageRect.height;
  const bx = stageBounds.x;
  const by = stageBounds.y;
  const bw = stageBounds.width;
  const bh = stageBounds.height;

  return (
    <>
      {/* Dimming / Shield Areas (Photoshop style) */}
      <Rect x={bx} y={by} width={Math.max(0, cx - bx)} height={bh} fill="rgba(0, 0, 0, 0.55)" listening={false} />
      <Rect x={cx + cw} y={by} width={Math.max(0, bx + bw - (cx + cw))} height={bh} fill="rgba(0, 0, 0, 0.55)" listening={false} />
      <Rect x={cx} y={by} width={cw} height={Math.max(0, cy - by)} fill="rgba(0, 0, 0, 0.55)" listening={false} />
      <Rect x={cx} y={cy + ch} width={cw} height={Math.max(0, by + bh - (cy + ch))} fill="rgba(0, 0, 0, 0.55)" listening={false} />

      {/* Rule of Thirds Helper Grid lines */}
      <Line points={[cx + cw / 3, cy, cx + cw / 3, cy + ch]} stroke="rgba(255, 255, 255, 0.35)" strokeWidth={1} listening={false} />
      <Line points={[cx + (cw * 2) / 3, cy, cx + (cw * 2) / 3, cy + ch]} stroke="rgba(255, 255, 255, 0.35)" strokeWidth={1} listening={false} />
      <Line points={[cx, cy + ch / 3, cx + cw, cy + ch / 3]} stroke="rgba(255, 255, 255, 0.35)" strokeWidth={1} listening={false} />
      <Line points={[cx, cy + (ch * 2) / 3, cx + cw, cy + (ch * 2) / 3]} stroke="rgba(255, 255, 255, 0.35)" strokeWidth={1} listening={false} />

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
          let x = Math.max(stageBounds.x, newBox.x);
          let y = Math.max(stageBounds.y, newBox.y);
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
            rotation: 0,
          };
        }}
      />
    </>
  );
}

export function GridOverlay({ width, height, gridSize }: any) {
  const size = Math.max(4, Math.floor(gridSize || 40));
  const lines: React.ReactNode[] = [];
  const color = 'rgba(0,0,0,0.08)';

  for (let x = 0; x <= width; x += size) {
    lines.push(<Rect key={`gx-${x}`} x={x} y={0} width={1} height={height} fill={color} listening={false} />);
  }
  for (let y = 0; y <= height; y += size) {
    lines.push(<Rect key={`gy-${y}`} x={0} y={y} width={width} height={1} fill={color} listening={false} />);
  }

  return <>{lines}</>;
}
