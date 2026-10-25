'use client';

import React, { useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer, Circle, Line, Group } from 'react-konva';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { useUIStore } from '@/stores/uiStore';
import type { CanvasHandle } from '@/lib/canvasHandle';
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
import { useCanvasPanZoom } from '@/hooks/useCanvasPanZoom';
import { keepTransformerAnchorsInsideStage } from '@/lib/konvaAnchorVisibility';
import { toStageCoords } from '@/lib/canvasCropMath';
import { v4 as uuidv4 } from 'uuid';

interface CanvasProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  canvasRef?: React.RefObject<CanvasHandle>;
}

const Canvas = React.forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const internalContainerRef = React.useRef<HTMLDivElement>(null);
  const containerRef = props.containerRef || internalContainerRef;

  const actualRef = ref || props.canvasRef;

  React.useImperativeHandle(actualRef, () => ({
    getStage: () => stageRef.current
  }));

  const transformerRef = useRef<Konva.Transformer>(null);

  const {
    canvasWidth,
    canvasHeight,
    selectObject,
    updateObject,
    addObject,
  } = useEditorStore();
  const objects = useObjectsArray();

  const {
    activeTool,
    setActiveTool,
    showGrid,
    gridSize,
    editingId,
    setEditingId,
    cropEditingId,
    cropEditingMode,
  } = useUIStore();


  const viewport = useCanvasViewport(containerRef);
  const { viewportSize, displayScale, displayOffsetX, displayOffsetY } = viewport;

  const {
    isPanning,
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,
    handleWheel,
  } = useCanvasPanZoom({ stageRef, viewport });

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

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
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
      const id = uuidv4();
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
        style={{ cursor: isPanning ? 'grab' : (cropEditingId && cropEditingMode === 'lasso' ? 'crosshair' : 'default') }}
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

            {cropTarget && cropDraft && cropEditingMode !== 'lasso' && (
              <CropSelectionOverlay
                target={cropTarget}
                draft={cropDraft}
                mode={cropEditingMode || 'free'}
                onDraftChange={setCropDraft}
              />
            )}
            {cropTarget && cropEditingMode === 'lasso' && (
              <>
              {lassoPoints.length > 0 && (
                <Line
                  points={[
                    ...lassoPoints.flatMap((p) => {
                      const point = toStageCoords(cropTarget, p);
                      return [point.x, point.y];
                    }),
                    ...(lassoPoints.length >= 3 ? [
                      toStageCoords(cropTarget, lassoPoints[0]).x,
                      toStageCoords(cropTarget, lassoPoints[0]).y,
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
                    x={toStageCoords(cropTarget, p).x}
                    y={toStageCoords(cropTarget, p).y}
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
              anchorStyleFunc={keepTransformerAnchorsInsideStage}
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
