'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Transformer, Circle, Line, Group } from 'react-konva';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
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
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { useCanvasSelection } from '@/hooks/useCanvasSelection';
import { useCanvasCrop } from '@/hooks/useCanvasCrop';

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
  } = useUIStore();

  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const {
    viewportSize,
    fitScale,
    displayScale,
    fitOffsetX,
    fitOffsetY,
    displayOffsetX,
    displayOffsetY,
  } = useCanvasViewport(containerRef);

  const { handleDragEnd, handleTransformEnd } = useCanvasSelection(stageRef, transformerRef);

  const {
    cropTarget,
    cropDraft,
    setCropDraft,
    lassoPoints,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    commitLassoCrop,
  } = useCanvasCrop({
    stageRef,
    displayScale,
    displayOffsetX,
    displayOffsetY,
    isPanning,
  });

  const snap = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      const size = gridSize > 0 ? gridSize : 1;
      return Math.round(value / size) * size;
    },
    [gridSize, snapToGrid]
  );

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
        handleDragEnd(obj, e);
      },
      onTransformEnd: () => {
        handleTransformEnd(obj);
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
