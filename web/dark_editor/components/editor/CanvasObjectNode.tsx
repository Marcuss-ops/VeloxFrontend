import React, { useMemo } from 'react';
import type Konva from 'konva';
import { ObjectRenderer } from '@/components/editor/canvas/CanvasRenderers';
import { CanvasObject } from '@/stores/editorStore';
import { getCanvasObjectCommonProps, getCanvasObjectShadowProps } from '@/lib/canvasObjectHelpers';

export interface CanvasObjectNodeProps {
  obj: CanvasObject;
  isSelected: boolean;
  isEditing: boolean;
  isCropEditingObject: boolean;
  activeTool: string;
  isPanning: boolean;
  handleTextDblClick: (e: Konva.KonvaEventObject<MouseEvent>, id: string) => void;
  selectObject: (id: string | null, addToSelection?: boolean) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

const CanvasObjectNode = React.memo(function CanvasObjectNode({
  obj,
  isEditing,
  isCropEditingObject,
  activeTool,
  isPanning,
  handleTextDblClick,
  selectObject,
  updateObject,
  stageRef,
}: CanvasObjectNodeProps) {
  const commonProps = useMemo(
    () =>
      getCanvasObjectCommonProps({
        obj,
        activeTool,
        isPanning,
        isCropEditingObject,
        selectObject,
        updateObject,
        stageRef,
      }),
    [obj, activeTool, isPanning, isCropEditingObject, selectObject, updateObject, stageRef]
  );

  const shadowProps = useMemo(() => getCanvasObjectShadowProps(obj), [obj.dropShadow]);

  return (
    <ObjectRenderer
      obj={obj}
      commonProps={commonProps}
      shadowProps={shadowProps}
      editingId={isEditing ? obj.id : null}
      handleTextDblClick={handleTextDblClick}
    />
  );
});

export default CanvasObjectNode;
