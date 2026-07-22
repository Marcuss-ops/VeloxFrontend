import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCanvasObjectCommonProps, getCanvasObjectShadowProps } from '@/lib/canvasObjectHelpers';
import type { CanvasObject } from '@/stores/editorStore';

const makeObject = (overrides: Partial<CanvasObject> = {}): CanvasObject => ({
  id: 'obj-1',
  type: 'text',
  x: 10,
  y: 20,
  width: 100,
  height: 100,
  rotation: 5,
  scaleX: 1.5,
  scaleY: 1.5,
  opacity: 0.8,
  visible: true,
  locked: false,
  name: 'object',
  ...overrides,
});

describe('getCanvasObjectCommonProps', () => {
  let selectObject: (id: string | null, addToSelection?: boolean) => void;
  let updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  let stageRef: React.RefObject<any>;

  beforeEach(() => {
    selectObject = vi.fn() as unknown as (id: string | null, addToSelection?: boolean) => void;
    updateObject = vi.fn() as unknown as (id: string, updates: Partial<CanvasObject>) => void;
    stageRef = { current: { findOne: vi.fn() } } as unknown as React.RefObject<any>;
  });

  it('maps base object properties to stable props', () => {
    const obj = makeObject({ locked: true });
    const props = getCanvasObjectCommonProps({
      obj,
      activeTool: 'select',
      isPanning: false,
      isCropEditingObject: false,
      selectObject,
      updateObject,
      stageRef,
    });

    expect(props.id).toBe(obj.id);
    expect(props.x).toBe(obj.x);
    expect(props.y).toBe(obj.y);
    expect(props.rotation).toBe(obj.rotation);
    expect(props.opacity).toBe(obj.opacity);
  });

  it('disables dragging when the object is locked, panning, or being crop-edited', () => {
    const obj = makeObject();
    const base = { obj, activeTool: 'select', isPanning: false, isCropEditingObject: false, selectObject, updateObject, stageRef };
    expect(getCanvasObjectCommonProps(base).draggable).toBe(true);
    expect(getCanvasObjectCommonProps({ ...base, isPanning: true }).draggable).toBe(false);
    expect(getCanvasObjectCommonProps({ ...base, obj: { ...obj, locked: true } }).draggable).toBe(false);
    expect(getCanvasObjectCommonProps({ ...base, isCropEditingObject: true }).draggable).toBe(false);
    expect(getCanvasObjectCommonProps({ ...base, activeTool: 'pan' }).draggable).toBe(false);
  });

  it('calls selectObject with shift key flag on click', () => {
    const obj = makeObject();
    const props = getCanvasObjectCommonProps({
      obj,
      activeTool: 'select',
      isPanning: false,
      isCropEditingObject: false,
      selectObject,
      updateObject,
      stageRef,
    });

    const event = { cancelBubble: false, evt: { shiftKey: true } } as any;
    props.onClick(event);
    expect(event.cancelBubble).toBe(true);
    expect(selectObject).toHaveBeenCalledWith(obj.id, true);
  });

  it('ignores clicks while panning', () => {
    const obj = makeObject();
    const props = getCanvasObjectCommonProps({
      obj,
      activeTool: 'select',
      isPanning: true,
      isCropEditingObject: false,
      selectObject,
      updateObject,
      stageRef,
    });

    const event = { cancelBubble: false, evt: { shiftKey: false } } as any;
    props.onClick(event);
    expect(event.cancelBubble).toBe(false);
    expect(selectObject).not.toHaveBeenCalled();
  });

  it('updates position on drag end', () => {
    const obj = makeObject();
    const props = getCanvasObjectCommonProps({
      obj,
      activeTool: 'select',
      isPanning: false,
      isCropEditingObject: false,
      selectObject,
      updateObject,
      stageRef,
    });

    const event = { target: { x: () => 12.7, y: () => 23.4 } } as any;
    props.onDragEnd(event);
    expect(updateObject).toHaveBeenCalledWith(obj.id, { x: 13, y: 23 });
  });

  it('updates scale and rotation on transform end', () => {
    const obj = makeObject();
    const node = { x: () => 1.1, y: () => 2.9, scaleX: () => 2.0, scaleY: () => 3.0, rotation: () => 44.6 };
    stageRef.current.findOne = vi.fn().mockReturnValue(node);

    const props = getCanvasObjectCommonProps({
      obj,
      activeTool: 'select',
      isPanning: false,
      isCropEditingObject: false,
      selectObject,
      updateObject,
      stageRef,
    });

    props.onTransformEnd();
    expect(updateObject).toHaveBeenCalledWith(obj.id, {
      x: 1,
      y: 3,
      scaleX: 2.0,
      scaleY: 3.0,
      rotation: 45,
    });
  });
});

describe('getCanvasObjectShadowProps', () => {
  it('returns an empty object when the object has no drop shadow', () => {
    const obj = makeObject();
    expect(getCanvasObjectShadowProps(obj)).toEqual({});
  });

  it('returns shadow props derived from the object drop shadow', () => {
    const dropShadow = { offsetX: 2, offsetY: 4, blur: 8, color: '#000000', spread: 0 };
    const obj = makeObject({ dropShadow } as any);
    expect(getCanvasObjectShadowProps(obj)).toEqual({
      shadowColor: '#000000',
      shadowBlur: 8,
      shadowOffset: { x: 2, y: 4 },
      shadowOpacity: 0.5,
    });
  });
});
