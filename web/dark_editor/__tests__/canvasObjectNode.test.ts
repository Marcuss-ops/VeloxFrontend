import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { CanvasObject } from '@/stores/editorStore';

const ObjectRenderer = vi.fn(() => null);

vi.mock('@/components/editor/canvas/CanvasRenderers', () => ({
  ObjectRenderer,
}));

const makeObject = (overrides: Partial<CanvasObject> = {}): CanvasObject => ({
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
  name: 'object',
  ...overrides,
});

const makeProps = () => ({
  obj: makeObject(),
  isSelected: false,
  isEditing: false,
  isCropEditingObject: false,
  activeTool: 'select',
  isPanning: false,
  handleTextDblClick: vi.fn(),
  selectObject: vi.fn(),
  updateObject: vi.fn(),
  stageRef: { current: null } as React.RefObject<any>,
});

describe('CanvasObjectNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is exported as a React.memo component', async () => {
    const { default: CanvasObjectNode } = await import('@/components/editor/CanvasObjectNode');
    expect(CanvasObjectNode.$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('does not re-render ObjectRenderer when the same props are passed', async () => {
    const { default: CanvasObjectNode } = await import('@/components/editor/CanvasObjectNode');
    const props = makeProps();

    const root = TestRenderer.create(
      React.createElement(CanvasObjectNode, props)
    );
    expect(ObjectRenderer).toHaveBeenCalledTimes(1);

    root.update(React.createElement(CanvasObjectNode, props));
    expect(ObjectRenderer).toHaveBeenCalledTimes(1);

    root.update(
      React.createElement(CanvasObjectNode, { ...props, isSelected: true })
    );
    expect(ObjectRenderer).toHaveBeenCalledTimes(2);
  });
});
