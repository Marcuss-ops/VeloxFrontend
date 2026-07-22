'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Transformer, Circle, Line } from 'react-konva';
import { useEditorStore, CanvasObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { useUIStore } from '@/stores/uiStore';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import Konva from 'konva';
import { buildSelectedIdSet, findEditingObject } from '@/lib/canvasSelection';
import { selectCropTarget } from '@/lib/editorSelectors';
import CanvasObjectNode from './CanvasObjectNode';
import {
  CropSelectionOverlay,
  GridOverlay,
  ObjectRenderer,
  TextEditorOverlay,
} from '@/components/editor/canvas/CanvasRenderers';

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
    selectedIds,
    canvasWidth,
    canvasHeight,
    zoom,
    offsetX,
    offsetY,
    selectObject,
    updateObject,
    setZoom,
    setOffset,
  } = useEditorStore();

  const objects = useObjectsArray();
  
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
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [cropDraft, setCropDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);

  // Build a Set from selectedIds so per-object lookup in the render loop is O(1)
  const selectedIdSet = useMemo(() => buildSelectedIdSet(selectedIds), [selectedIds]);

  // Memo the object currently being edited to avoid repeated linear scans
  const editingObject = useMemo(
    () => findEditingObject(objects, editingId),
    [objects, editingId]
  );

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

  const cropTarget = useEditorStore((state) => selectCropTarget(state, cropEditingId));

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
    
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - offsetX) / oldScale,
      y: (pointer.y - offsetY) / oldScale,
    };

    const speed = 1.05;
    const nextScale = e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;
    const clampedScale = Math.max(0.1, Math.min(5, nextScale));
    
    setZoom(clampedScale);
    setOffset(pointer.x - mousePointTo.x * clampedScale, pointer.y - mousePointTo.y * clampedScale);
  }, [zoom, offsetX, offsetY, setZoom, setOffset]);

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
    const stageX = (pointer.x - offsetX) / zoom;
    const stageY = (pointer.y - offsetY) / zoom;
    return {
      x: (stageX - cropTarget.x) / scaleX,
      y: (stageY - cropTarget.y) / scaleY
    };
  }, [cropTarget, offsetX, offsetY, zoom]);

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

    // Deselect if clicking on empty background
    selectObject(null);
  }, [cropEditingId, isPanning, selectObject]);

  const handleTextDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    e.cancelBubble = true;
    const obj = useEditorStore.getState().objects[id];
    if (obj && obj.type === 'text') {
      setEditingId(id);
      selectObject(id);
    }
  }, [selectObject, setEditingId]);

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



  return (
    <div className="canvas-container w-full h-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={typeof window !== 'undefined' ? window.innerWidth - 400 : 800}
        height={typeof window !== 'undefined' ? window.innerHeight - 100 : 600}
        scaleX={zoom}
        scaleY={zoom}
        x={offsetX}
        y={offsetY}
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
            fill="#e5e7eb"
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.2}
          />

          {showGrid ? (
            <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={gridSize} />
          ) : null}

          {guides.v.map((x, i) => (
            <Rect key={`gvline-${i}`} x={x} y={0} width={1} height={canvasHeight} fill="rgba(59,130,246,0.8)" listening={false} />
          ))}
          {guides.h.map((y, i) => (
            <Rect key={`ghline-${i}`} x={0} y={y} width={canvasWidth} height={1} fill="rgba(59,130,246,0.8)" listening={false} />
          ))}
          
          {objects.map((obj) => (
            <CanvasObjectNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIdSet.has(obj.id)}
              isEditing={editingId === obj.id}
              isCropEditingObject={cropEditingId === obj.id && obj.type === 'image'}
              activeTool={activeTool}
              isPanning={isPanning}
              handleTextDblClick={handleTextDblClick}
              selectObject={selectObject}
              updateObject={updateObject}
              stageRef={stageRef}
            />
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
        </Layer>
      </Stage>

      {/* Inline Text Editor Overlay */}
      {editingObject && (
        <TextEditorOverlay
          obj={editingObject}
          stage={stageRef.current!}
          zoom={zoom}
          offsetX={offsetX}
          offsetY={offsetY}
          onSave={(text) => {
            updateObject(editingObject.id, { text });
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
