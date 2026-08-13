'use client';

import React, { useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Group, Line, Rect, Transformer } from 'react-konva';

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
  onCropRectChange: (rect: { x: number; y: number; width: number; height: number }) => void;
  guidesType?: 'none' | 'thirds' | 'grid';
  ratioPreset?: string;
}) {
  const rectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

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
      />
    );
    lines.push(
      <Line
        key="v2"
        points={[cropRect.x + (cropRect.width * 2) / 3, cropRect.y, cropRect.x + (cropRect.width * 2) / 3, cropRect.y + cropRect.height]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />
    );
    lines.push(
      <Line
        key="h1"
        points={[cropRect.x, cropRect.y + cropRect.height / 3, cropRect.x + cropRect.width, cropRect.y + cropRect.height / 3]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />
    );
    lines.push(
      <Line
        key="h2"
        points={[cropRect.x, cropRect.y + (cropRect.height * 2) / 3, cropRect.x + cropRect.width, cropRect.y + (cropRect.height * 2) / 3]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1}
        listening={false}
      />
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
        />
      );
      lines.push(
        <Line
          key={`gh-${i}`}
          points={[cropRect.x, hy, cropRect.x + cropRect.width, hy]}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
  }

  return (
    <Group name="export-exclude">
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
