import { describe, expect, it } from 'vitest';
import { canvasStateSignature } from '@/lib/canvasPreview';

describe('canvas preview state identity', () => {
  it('changes when a live layer changes', () => {
    const before = canvasStateSignature([{ id: 'text-1', text: 'AAAA', visible: true }], 1920, 1080);
    const after = canvasStateSignature([{ id: 'text-1', text: 'BBBB', visible: true }], 1920, 1080);

    expect(after).not.toBe(before);
  });

  it('includes visibility and canvas dimensions', () => {
    const visible = canvasStateSignature([{ id: 'layer-1', visible: true }], 1920, 1080);
    const hidden = canvasStateSignature([{ id: 'layer-1', visible: false }], 1920, 1080);
    const differentSize = canvasStateSignature([{ id: 'layer-1', visible: true }], 1280, 720);

    expect(hidden).not.toBe(visible);
    expect(differentSize).not.toBe(visible);
  });
});
