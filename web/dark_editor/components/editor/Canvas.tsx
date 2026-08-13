'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Transformer, Circle, Line, Group } from 'react-konva';
import { useEditorStore, type CanvasObject, type ImageObject } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import Konva from 'konva';
import {
  CropSelectionOverlay,
  GridOverlay,
  ObjectRenderer,
  TextEditorOverlay,
} from '@/components/editor/canvas/CanvasRenderers';
import { requestEditorSave } from '@/lib/editorEvents';

interface CanvasProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  canvasRef?: React.Ref<any>;
}

const Canvas = React.forwardRef<any, CanvasProps>((props, ref) => {
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const internalContainerRef = React.useRef<HTMLDivElement>(null);
  const containerRef = props.containerRef || internalContainerRef;

  const actualRef = ref || props.canvasRef;

  React.useImperativeHandle(actualRef, () => ({
    getStage: () => stageRef.current
  }));

  const transformerRef = useRef<Konva.Transformer>(null);
  
  const {
    objects,
    selectedIds,
    canvasWidth,
    canvasHeight,
    zoom,
    offsetX,
    offsetY,
    selectObject,
    updateObject,
    addObject,
    setZoom,
    setOffset,
  } = useEditorStore();
  
  const {
    activeTool,
    setActiveTool,
    showGrid,
    snapToGrid,
    gridSize,
    editingId,
    setEditingId,
    cropEditingId,
    cropEditingMode,
    cancelCropEditing,
  } = useUIStore();

  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [cropDraft, setCropDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);

  // The Konva stage is a viewport, not the document. Fit the logical
  // 1920x1080 document into the actual 16:9 editor container and keep the
  // user's zoom as a multiplier over that fit scale. The old implementation
  // sized the stage from window.innerWidth/innerHeight, so the container
  // clipped a different coordinate system than the exporter captured.
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

  useEffect(() => {
    setLassoPoints([]);
  }, [cropEditingId]);

  const snap = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      const size = gridSize > 0 ? gridSize : 1;
      return Math.round(value / size) * size;
    },
    [gridSize, snapToGrid]
  );
  
  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    
    const nodes = selectedIds
      .filter((id) => id !== cropEditingId)
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter((node): node is Konva.Node => node !== undefined);
    
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, cropEditingId]);

  const cropTarget = React.useMemo<ImageObject | null>(() => {
    if (!cropEditingId) return null;
    const found = objects.find((obj) => obj.id === cropEditingId);
    return found && found.type === 'image' ? found : null;
  }, [cropEditingId, objects]);

  // Initialize crop selection to cover 100% of the image size (maintaining aspect ratio)
  useEffect(() => {
    if (!cropTarget) {
      setCropDraft(null);
      return;
    }

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const mode = cropEditingMode || 'free';

    if (mode === 'free') {
      setCropDraft({ x: 0, y: 0, width: baseWidth, height: baseHeight });
      return;
    }

    // For square and circle crop: start at the maximum centered 1:1 area so user has full control
    const size = Math.max(1, Math.min(baseWidth, baseHeight));
    setCropDraft({
      x: (baseWidth - size) / 2,
      y: (baseHeight - size) / 2,
      width: size,
      height: size,
    });
  }, [cropTarget, cropEditingMode]);
  
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
  }, [isPanning, offsetX, offsetY]);

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
  }, [displayScale, displayOffsetX, displayOffsetY, fitOffsetX, fitOffsetY, fitScale, setOffset, setZoom, zoom]);

  const commitLassoCrop = useCallback(() => {
    if (!cropTarget || lassoPoints.length < 3) return;

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;

    // Get bounding box of the selected polygon path
    const minX = Math.min(...lassoPoints.map(p => p.x));
    const maxX = Math.max(...lassoPoints.map(p => p.x));
    const minY = Math.min(...lassoPoints.map(p => p.y));
    const maxY = Math.max(...lassoPoints.map(p => p.y));

    // Clamp to image dimensions
    const clampMinX = Math.max(0, Math.min(minX, baseWidth));
    const clampMaxX = Math.max(0, Math.min(maxX, baseWidth));
    const clampMinY = Math.max(0, Math.min(minY, baseHeight));
    const clampMaxY = Math.max(0, Math.min(maxY, baseHeight));

    const w = Math.max(20, clampMaxX - clampMinX);
    const h = Math.max(20, clampMaxY - clampMinY);

    // Calculate next relative cropRect relative to previous crops to prevent aspect stretching
    const prev = cropTarget.cropRect || { x: 0, y: 0, width: 1, height: 1 };
    const nextCropRect = {
      x: prev.x + (clampMinX / baseWidth) * prev.width,
      y: prev.y + (clampMinY / baseHeight) * prev.height,
      width: (w / baseWidth) * prev.width,
      height: (h / baseHeight) * prev.height,
    };

    // Calculate relative path points mapped to the new bounding box (0 to 1)
    const relativePoints = lassoPoints.map(p => [
      Math.max(0, Math.min(1, (p.x - clampMinX) / w)),
      Math.max(0, Math.min(1, (p.y - clampMinY) / h))
    ]).flat();

    updateObject(cropTarget.id, {
      x: cropTarget.x + clampMinX * scaleX,
      y: cropTarget.y + clampMinY * scaleY,
      width: w,
      height: h,
      cropRect: nextCropRect,
      cropMode: 'lasso',
      cropPathPoints: relativePoints,
    });

    selectObject(cropTarget.id);
    cancelCropEditing();
    setActiveTool('select');
    setLassoPoints([]);
  }, [cancelCropEditing, cropTarget, lassoPoints, selectObject, setActiveTool, updateObject]);

  const getLocalCoords = useCallback((pointer: { x: number; y: number }) => {
    if (!cropTarget) return null;
    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;
    const stageX = (pointer.x - displayOffsetX) / displayScale;
    const stageY = (pointer.y - displayOffsetY) / displayScale;
    return {
      x: (stageX - cropTarget.x) / scaleX,
      y: (stageY - cropTarget.y) / scaleY
    };
  }, [cropTarget, displayOffsetX, displayOffsetY, displayScale]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isPanning) return;
    if (cropEditingId && cropEditingMode === 'free' && cropTarget) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const local = getLocalCoords(pointer);
      if (local) {
        setIsDrawingLasso(true);
        setLassoPoints([local]);
      }
    }
  }, [cropEditingId, cropEditingMode, cropTarget, isPanning, getLocalCoords]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawingLasso || !cropTarget) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const local = getLocalCoords(pointer);
    if (local) {
      const last = lassoPoints[lassoPoints.length - 1];
      if (last) {
        const dist = Math.hypot(local.x - last.x, local.y - last.y);
        if (dist < 3) return;
      }
      setLassoPoints((prev) => [...prev, local]);
    }
  }, [isDrawingLasso, cropTarget, lassoPoints, getLocalCoords]);

  const handleStageMouseUp = useCallback(() => {
    if (!isDrawingLasso) return;
    setIsDrawingLasso(false);
    if (lassoPoints.length >= 3) {
      commitLassoCrop();
    } else {
      setLassoPoints([]);
    }
  }, [isDrawingLasso, lassoPoints, commitLassoCrop]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<any>) => {
    if (isPanning) return;
    if (cropEditingId) return;
    const isBackground = e.target === stageRef.current || e.target.name() === 'canvas-background';
    if (!isBackground) return;

    if (activeTool === 'text' || activeTool === 'rect' || activeTool === 'circle') {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;
      const x = (pointer.x - displayOffsetX) / displayScale;
      const y = (pointer.y - displayOffsetY) / displayScale;
      const id = `${activeTool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const base = {
        id,
        x: Math.max(0, x - 120),
        y: Math.max(0, y - 40),
        width: activeTool === 'text' ? 360 : 240,
        height: activeTool === 'text' ? 80 : 160,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        name: activeTool === 'text' ? 'Text' : activeTool === 'rect' ? 'Shape' : 'Circle',
      };
      addObject(activeTool === 'text'
        ? { ...base, type: 'text', text: 'Testo', translate: true, fill: '#111111', fontSize: 48, fontFamily: 'Arial', fontWeight: 'bold', lineHeight: 1.1, padding: 4 }
        : { ...base, type: activeTool, fill: activeTool === 'rect' ? '#2563eb' : '#7c3aed', stroke: '#ffffff', strokeWidth: 2 });
      selectObject(id);
      setActiveTool('select');
      return;
    }

    // Deselect if clicking on empty background
    selectObject(null);
  }, [activeTool, addObject, cropEditingId, displayOffsetX, displayOffsetY, displayScale, isPanning, selectObject, setActiveTool]);

  const handleTextDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    e.cancelBubble = true;
    const obj = objects.find((o) => o.id === id);
    if (obj && obj.type === 'text') {
      setEditingId(id);
      selectObject(id);
    }
  }, [objects, selectObject, setEditingId]);

  const commitCrop = useCallback(() => {
    if (!cropTarget || !cropDraft) return;

    const baseWidth = Math.max(1, cropTarget.width);
    const baseHeight = Math.max(1, cropTarget.height);
    const scaleX = cropTarget.scaleX || 1;
    const scaleY = cropTarget.scaleY || 1;

    // Calculate crop relative to previous crops to prevent aspect stretching
    const prev = cropTarget.cropRect || { x: 0, y: 0, width: 1, height: 1 };
    const nextCropRect = {
      x: prev.x + (cropDraft.x / baseWidth) * prev.width,
      y: prev.y + (cropDraft.y / baseHeight) * prev.height,
      width: (cropDraft.width / baseWidth) * prev.width,
      height: (cropDraft.height / baseHeight) * prev.height,
    };

    updateObject(cropTarget.id, {
      x: cropTarget.x + cropDraft.x * scaleX,
      y: cropTarget.y + cropDraft.y * scaleY,
      width: cropDraft.width,
      height: cropDraft.height,
      cropRect: nextCropRect,
      cropMode: cropEditingMode || 'free',
    });

    selectObject(cropTarget.id);
    cancelCropEditing();
    setActiveTool('select');
    setCropDraft(null);
  }, [cancelCropEditing, cropDraft, cropEditingMode, cropTarget, selectObject, setActiveTool, updateObject]);

  const discardCrop = useCallback(() => {
    cancelCropEditing();
    setCropDraft(null);
    setLassoPoints([]);
    setActiveTool('select');
  }, [cancelCropEditing, setActiveTool]);

  // Global Enter and Escape keyboard listeners for Crop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cropEditingId) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (cropEditingMode === 'free') {
          commitLassoCrop();
        } else {
          commitCrop();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        discardCrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropEditingId, cropEditingMode, commitCrop, commitLassoCrop, discardCrop]);

  const renderObject = (obj: CanvasObject) => {
    const isSelected = selectedIds.includes(obj.id);
    const isEditing = editingId === obj.id;
    const isCropTarget = cropEditingId === obj.id && obj.type === 'image' && cropDraft;
    
    // Hide standard transformer bounding box controls when image crop editing is active
    const isTransformable = isSelected && !isEditing && !isCropTarget && !obj.locked;

    const commonProps = {
      id: obj.id,
      x: obj.x,
      y: obj.y,
      rotation: obj.rotation,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      opacity: obj.opacity,
      visible: obj.visible,
      draggable: !obj.locked && activeTool !== 'pan' && !isPanning && !(cropEditingId === obj.id && obj.type === 'image'),
      listening: !(cropEditingId === obj.id && obj.type === 'image'),
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === 'pan' || isPanning) return;
        e.cancelBubble = true;
        
        // Multi-select with Shift
        const isShift = e.evt.shiftKey;
        selectObject(obj.id, isShift);
      },
      onDragStart: () => {
        // Clear selection or perform actions on drag start
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        updateObject(obj.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
        });
      },
      onTransformEnd: () => {
        const node = stageRef.current?.findOne(`#${obj.id}`);
        if (!node) return;
        
        updateObject(obj.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: Math.round(node.rotation()),
        });
      },
    };

    const shadowProps = obj.dropShadow ? {
      shadowColor: obj.dropShadow.color,
      shadowBlur: obj.dropShadow.blur,
      shadowOffset: { x: obj.dropShadow.offsetX, y: obj.dropShadow.offsetY },
      shadowOpacity: 0.5,
    } : {};
    
    return (
      <ObjectRenderer
        key={obj.id}
        obj={obj}
        commonProps={commonProps}
        shadowProps={shadowProps}
        editingId={editingId}
        handleTextDblClick={handleTextDblClick}
      />
    );
  };

  const editingObject = objects.find((o) => o.id === editingId);

  return (
    <div ref={containerRef} className="canvas-container relative w-full h-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={viewportSize.width}
        height={viewportSize.height}
        scaleX={displayScale}
        scaleY={displayScale}
        x={displayOffsetX}
        y={displayOffsetY}
        draggable={isPanning}
        onDragStart={handleStageDragStart}
        onDragMove={handleStageDragMove}
        onDragEnd={handleStageDragEnd}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onTouchMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchEnd={handleStageMouseUp}
        style={{ cursor: isPanning ? 'grab' : (cropEditingId && cropEditingMode === 'free' ? 'crosshair' : 'default') }}
      >
        <Layer>
          {/* Canvas background */}
          <Rect
            name="canvas-background"
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="#FFFFFF"
          />

          {objects.map(renderObject)}
          <Group name="export-exclude">
            {showGrid ? (
              <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={gridSize} />
            ) : null}

            {guides.v.map((x, i) => (
              <Rect key={`gvline-${i}`} x={x} y={0} width={1} height={canvasHeight} fill="rgba(59,130,246,0.8)" listening={false} />
            ))}
            {guides.h.map((y, i) => (
              <Rect key={`ghline-${i}`} x={0} y={y} width={canvasWidth} height={1} fill="rgba(59,130,246,0.8)" listening={false} />
            ))}

            {cropTarget && cropDraft && cropEditingMode !== 'free' && (
              <CropSelectionOverlay
                target={cropTarget}
                draft={cropDraft}
                mode={cropEditingMode || 'free'}
                onDraftChange={setCropDraft}
              />
            )}
            {cropTarget && cropEditingMode === 'free' && (
              <>
              {lassoPoints.length > 0 && (
                <Line
                  points={[
                    ...lassoPoints.map(p => [
                      cropTarget.x + p.x * (cropTarget.scaleX || 1),
                      cropTarget.y + p.y * (cropTarget.scaleY || 1)
                    ]).flat(),
                    ...(lassoPoints.length >= 3 ? [
                      cropTarget.x + lassoPoints[0].x * (cropTarget.scaleX || 1),
                      cropTarget.y + lassoPoints[0].y * (cropTarget.scaleY || 1)
                    ] : [])
                  ]}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dash={lassoPoints.length >= 3 ? undefined : [6, 4]}
                />
              )}
              {lassoPoints.map((p, idx) => {
                const isStart = idx === 0;
                return (
                  <Circle
                    key={idx}
                    x={cropTarget.x + p.x * (cropTarget.scaleX || 1)}
                    y={cropTarget.y + p.y * (cropTarget.scaleY || 1)}
                    radius={isStart ? 8 : 5}
                    fill={isStart ? "#10b981" : "#38bdf8"}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    onClick={(e) => {
                      if (isStart && lassoPoints.length >= 3) {
                        e.cancelBubble = true;
                        commitLassoCrop();
                      }
                    }}
                    onTap={(e) => {
                      if (isStart && lassoPoints.length >= 3) {
                        e.cancelBubble = true;
                        commitLassoCrop();
                      }
                    }}
                  />
                );
              })}
              </>
            )}

            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
            />
          </Group>
        </Layer>
      </Stage>

      {/* Inline Text Editor Overlay */}
      {editingObject && editingObject.type === 'text' && (
        <TextEditorOverlay
          obj={editingObject}
          stage={stageRef.current!}
          zoom={displayScale}
          offsetX={displayOffsetX}
          offsetY={displayOffsetY}
          onSave={(text) => {
            updateObject(editingObject.id, { text });
            setEditingId(null);
            // Enter closes the inline editor; persist the mutation immediately
            // instead of waiting for the debounce timer.
            requestEditorSave();
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
