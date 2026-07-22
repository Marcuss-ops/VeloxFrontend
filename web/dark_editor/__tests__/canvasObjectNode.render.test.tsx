// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type Konva from 'konva';
import type { CanvasObject } from '@/stores/editorStore';
import CanvasObjectNode from '@/components/editor/CanvasObjectNode';

vi.mock('@/components/editor/canvas/CanvasRenderers', () => ({
  ObjectRenderer: vi.fn(() => <div data-testid="object-renderer" />),
}));

import { ObjectRenderer } from '@/components/editor/canvas/CanvasRenderers';

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

const makeProps = () => {
  const stageRef = { current: null };
  return {
    obj: makeObject(),
    isSelected: false,
    isEditing: false,
    isCropEditingObject: false,
    activeTool: 'select',
    isPanning: false,
    handleTextDblClick: vi.fn(),
    selectObject: vi.fn(),
    updateObject: vi.fn(),
    stageRef: stageRef as React.RefObject<Konva.Stage | null>,
  };
};

describe('CanvasObjectNode jsdom rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders ObjectRenderer on first mount', () => {
    render(<CanvasObjectNode {...makeProps()} />);
    expect(ObjectRenderer).toHaveBeenCalledTimes(1);
  });

  it('does not re-render ObjectRenderer when the same props are passed', () => {
    const props = makeProps();
    const { rerender } = render(<CanvasObjectNode {...props} />);
    expect(ObjectRenderer).toHaveBeenCalledTimes(1);

    rerender(<CanvasObjectNode {...props} />);
    expect(ObjectRenderer).toHaveBeenCalledTimes(1);
  });

  it('re-renders ObjectRenderer when a prop changes', () => {
    const props = makeProps();
    const { rerender } = render(<CanvasObjectNode {...props} />);
    rerender(<CanvasObjectNode {...props} isSelected />);
    expect(ObjectRenderer).toHaveBeenCalledTimes(2);
  });
});
