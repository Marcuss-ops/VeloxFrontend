'use client';

import { useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import Konva from 'konva';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

export interface CanvasSelectionApi {
  /** Commit a drag (move) to the object's geometry. */
  handleDragEnd: (obj: CanvasObject, e: Konva.KonvaEventObject<DragEvent>) => void;
  /** Commit a resize/rotate to the object's geometry. */
  handleTransformEnd: (obj: CanvasObject) => void;
}

/**
 * useCanvasSelection — owns the Transformer↔selection synchronisation and the
 * geometry commit on drag/transform end.
 *
 * The Konva Transformer must follow the current `selectedIds` (minus the crop
 * target, which renders its own crop overlay), and object edits are persisted
 * to the store when a drag or transform gesture ends. Extracted from
 * Canvas.tsx to shrink the composition root.
 */
export function useCanvasSelection(
  stageRef: RefObject<Konva.Stage | null>,
  transformerRef: RefObject<Konva.Transformer | null>
): CanvasSelectionApi {
  const { selectedIds, updateObject } = useEditorStore();
  const { cropEditingId } = useUIStore();

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const nodes = selectedIds
      .filter((id) => id !== cropEditingId)
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter((node): node is Konva.Node => node !== undefined);

    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, cropEditingId, stageRef, transformerRef]);

  const handleDragEnd = useCallback(
    (obj: CanvasObject, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateObject(obj.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
      });
    },
    [updateObject]
  );

  const handleTransformEnd = useCallback(
    (obj: CanvasObject) => {
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
    [stageRef, updateObject]
  );

  return { handleDragEnd, handleTransformEnd };
}
