'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Line, Rect, Text, TextPath, Transformer } from 'react-konva';
import Konva from 'konva';
import { applyAllFilters } from '@/lib/imageFilters';
import { censorText } from '@/lib/textCensorship';
import { fontFamilies, type FontKey } from '@/lib/fonts';
import { type CanvasObject } from '@/stores/editorStore';

function resolveFontFamily(name?: string): string {
  if (!name) return fontFamilies.Arial;
  return fontFamilies[name as FontKey] ?? name;
}

function useImageLoader(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src.startsWith('http') || src.startsWith('data:') ? src : `/dark_editor_v2/${src}`;
    img.onload = () => setImage(img);
  }, [src]);

  return image;
}

interface TextEditorOverlayProps {
  obj: CanvasObject;
  stage: Konva.Stage;
  zoom: number;
  offsetX: number;
  offsetY: number;
  onSave: (text: string) => void;
  onClose: () => void;
}

export function TextEditorOverlay({ obj, zoom, offsetX, offsetY, onSave, onClose }: TextEditorOverlayProps) {
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
  onCropRectChange: (rect: { x: number; y: number; width: number; height: number }) => void;
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
            rotation: 0
          };
        }}
      />
    </>
  );
}

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
    img.src = src.startsWith('http') || src.startsWith('data:') ? src : `/dark_editor_v2/${src}`;
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
        0, 0, width, height
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

export function ObjectRenderer({ obj, commonProps, shadowProps, editingId, handleTextDblClick }: { obj: CanvasObject, commonProps: any, shadowProps: any, editingId: string | null, handleTextDblClick: any }) {
  const imageFillElement = useImageLoader(obj.imageFill?.src);

  const fillProps = obj.imageFill?.src && imageFillElement
    ? {
        fillPatternImage: imageFillElement,
        fillPatternScaleX: obj.imageFill.scale,
        fillPatternScaleY: obj.imageFill.scale,
        fillPatternOffsetY: -obj.imageFill.offsetY,
        fillPatternOffsetX: -obj.imageFill.offsetX,
        fillPatternRepeat: 'no-repeat',
      }
    : { fill: obj.fill || '#ffffff' };

  switch (obj.type) {
    case 'image':
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
    case 'text':
      const rawText = obj.text || '';
      const maybeCensored = obj.useCensorship ? censorText(rawText) : rawText;
      const displayText = obj.allCaps ? maybeCensored.toUpperCase() : maybeCensored;

      return (
        <Group
          {...commonProps}
          onDblClick={(e) => handleTextDblClick(e, obj.id)}
        >
          {obj.backgroundFill ? (
            <Rect
              width={obj.width}
              height={obj.height}
              fill={obj.backgroundFill}
              opacity={obj.backgroundOpacity ?? 0.6}
              cornerRadius={obj.padding ?? 0}
            />
          ) : null}

          {obj.textCurve?.enabled ? (
            <TextPath
              id={obj.id}
              text={displayText}
              width={obj.width}
              height={obj.height}
              fontSize={obj.fontSize || 24}
              fontFamily={resolveFontFamily(obj.fontFamily)}
              fontStyle={obj.fontWeight ? `${obj.fontWeight}` : 'normal'}
              letterSpacing={obj.letterSpacing ?? 0}
              data={(() => {
                const r = obj.textCurve.radius || 200;
                const isUp = obj.textCurve.direction === 'up';
                return isUp
                  ? `M 0,${r} A ${r},${r} 0 0,1 ${obj.width},${r}`
                  : `M 0,0 A ${r},${r} 0 0,0 ${obj.width},0`;
              })()}
              visible={editingId !== obj.id}
              {...shadowProps}
              {...fillProps}
              shadowColor={obj.textShadow?.color}
              shadowBlur={obj.textShadow?.blur ?? 0}
              shadowOffsetX={obj.textShadow?.offsetX ?? 0}
              shadowOffsetY={obj.textShadow?.offsetY ?? 0}
              shadowOpacity={obj.textShadow ? 1 : 0}
            />
          ) : (
            <Text
              id={obj.id}
              text={displayText}
              padding={obj.padding ?? 0}
              fontSize={obj.fontSize || 24}
              fontFamily={resolveFontFamily(obj.fontFamily)}
              fontStyle={obj.fontWeight ? `${obj.fontWeight}` : 'normal'}
              lineHeight={obj.lineHeight ?? 1}
              letterSpacing={obj.letterSpacing ?? 0}
              stroke={obj.textStroke?.color}
              strokeWidth={obj.textStroke?.width ?? 0}
              visible={editingId !== obj.id}
              {...shadowProps}
              {...fillProps}
              shadowColor={obj.textShadow?.color}
              shadowBlur={obj.textShadow?.blur ?? 0}
              shadowOffsetX={obj.textShadow?.offsetX ?? 0}
              shadowOffsetY={obj.textShadow?.offsetY ?? 0}
              shadowOpacity={obj.textShadow ? 1 : 0}
            />
          )}
        </Group>
      );
    case 'rect':
      return (
        <Rect
          {...commonProps}
          {...shadowProps}
          width={obj.width}
          height={obj.height}
          stroke={obj.stroke}
          strokeWidth={obj.strokeWidth || 0}
          {...(obj.imageFill?.src && imageFillElement ? fillProps : { fill: obj.fill || '#3b82f6' })}
        />
      );
    case 'circle':
      return (
        <Circle
          {...commonProps}
          {...shadowProps}
          radius={obj.width / 2}
          stroke={obj.stroke}
          strokeWidth={obj.strokeWidth || 0}
          {...(obj.imageFill?.src && imageFillElement ? fillProps : { fill: obj.fill || '#3b82f6' })}
        />
      );
    default:
      return null;
  }
}
