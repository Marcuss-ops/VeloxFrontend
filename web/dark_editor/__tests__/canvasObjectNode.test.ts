import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/editor/canvas/CanvasRenderers', () => ({
  ObjectRenderer: () => null,
}));

describe('CanvasObjectNode', () => {
  it('is exported as a React.memo component', async () => {
    const { default: CanvasObjectNode } = await import('@/components/editor/CanvasObjectNode');
    expect(CanvasObjectNode.$$typeof).toBe(Symbol.for('react.memo'));
  });
});
