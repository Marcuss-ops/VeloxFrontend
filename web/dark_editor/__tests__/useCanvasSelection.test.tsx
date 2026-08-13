// @vitest-environment jsdom
//
// Unit tests for useCanvasSelection: pins the geometry commit on drag and
// transform end (rounded) and the Transformer↔selection synchronisation,
// including the crop-target exclusion.

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useCanvasSelection } from '@/hooks/useCanvasSelection';
import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import type Konva from 'konva';

function makeObject(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'obj-1',
    type: 'text',
    x: 10,
    y: 20,
    width: 100,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    name: 'obj',
    ...overrides,
  };
}

beforeEach(() => {
  useEditorStore.getState().clearCanvas();
  useUIStore.getState().cancelCropEditing();
});

afterEach(() => {
  cleanup();
});

describe('useCanvasSelection', () => {
  it('commits rounded geometry on drag end', () => {
    act(() => {
      useEditorStore.getState().addObject(makeObject({ id: 'obj-1' }));
    });
    const { result } = renderHook(() =>
      useCanvasSelection(
        { current: null } as unknown as React.RefObject<Konva.Stage | null>,
        { current: null } as unknown as React.RefObject<Konva.Transformer | null>,
      ),
    );

    const node = { x: () => 10.6, y: () => 20.4 };
    act(() => {
      result.current.handleDragEnd(
        makeObject({ id: 'obj-1' }),
        { target: node } as unknown as Konva.KonvaEventObject<DragEvent>,
      );
    });

    const obj = useEditorStore.getState().objects['obj-1'];
    expect(obj.x).toBe(11); // Math.round(10.6)
    expect(obj.y).toBe(20); // Math.round(20.4)
  });

  it('commits rounded transform geometry on transform end', () => {
    act(() => {
      useEditorStore.getState().addObject(makeObject({ id: 'obj-1' }));
    });
    const node = {
      x: () => 10.6,
      y: () => 20.4,
      scaleX: () => 1.5,
      scaleY: () => 2.5,
      rotation: () => 30.4,
    };
    const stageRef = {
      current: { findOne: () => node },
    } as unknown as React.RefObject<Konva.Stage | null>;
    const { result } = renderHook(() =>
      useCanvasSelection(stageRef, { current: null } as unknown as React.RefObject<Konva.Transformer | null>),
    );

    act(() => {
      result.current.handleTransformEnd(makeObject({ id: 'obj-1' }));
    });

    const obj = useEditorStore.getState().objects['obj-1'];
    expect(obj).toMatchObject({ x: 11, y: 20, scaleX: 1.5, scaleY: 2.5, rotation: 30 });
  });

  it('syncs the transformer to the selection and excludes the crop target', () => {
    act(() => {
      useEditorStore.getState().addObject(makeObject({ id: 'obj-1' }));
      useEditorStore.getState().addObject(makeObject({ id: 'obj-2' }));
    });
    act(() => {
      useEditorStore.getState().selectObject('obj-1');
      useEditorStore.getState().selectObject('obj-2', true);
    });
    useUIStore.getState().startCropEditing('obj-2', 'free');

    const node1 = { id: 'obj-1' };
    const node2 = { id: 'obj-2' };
    const findOne = vi.fn((selector: string) =>
      selector === '#obj-1' ? node1 : selector === '#obj-2' ? node2 : undefined,
    );
    const stageRef = {
      current: { findOne },
    } as unknown as React.RefObject<Konva.Stage | null>;
    const nodes = vi.fn();
    const batchDraw = vi.fn();
    const transformerRef = {
      current: { nodes, getLayer: () => ({ batchDraw }) },
    } as unknown as React.RefObject<Konva.Transformer | null>;

    renderHook(() => useCanvasSelection(stageRef, transformerRef));

    // obj-2 is the crop target → excluded from the transformer
    expect(nodes).toHaveBeenCalledWith([node1]);
    expect(batchDraw).toHaveBeenCalled();
  });
});
