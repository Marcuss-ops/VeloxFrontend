import type Konva from 'konva';
import type { CanvasObject } from '@/stores/editorStore';

export interface CommonPropsInput {
  obj: CanvasObject;
  activeTool: string;
  isPanning: boolean;
  isCropEditingObject: boolean;
  selectObject: (id: string | null, addToSelection?: boolean) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function getCanvasObjectCommonProps(input: CommonPropsInput) {
  const { obj, activeTool, isPanning, isCropEditingObject, selectObject, updateObject, stageRef } = input;

  return {
    id: obj.id,
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    opacity: obj.opacity,
    visible: obj.visible,
    draggable: !obj.locked && activeTool !== 'pan' && !isPanning && !isCropEditingObject,
    listening: !isCropEditingObject,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'pan' || isPanning) return;
      e.cancelBubble = true;
      selectObject(obj.id, e.evt.shiftKey);
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
}

export function getCanvasObjectShadowProps(obj: CanvasObject) {
  return obj.dropShadow
    ? {
        shadowColor: obj.dropShadow.color,
        shadowBlur: obj.dropShadow.blur,
        shadowOffset: { x: obj.dropShadow.offsetX, y: obj.dropShadow.offsetY },
        shadowOpacity: 0.5,
      }
    : {};
}
