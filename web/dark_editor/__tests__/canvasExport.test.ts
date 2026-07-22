import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCanvasElement, exportCanvasToBlob } from '@/lib/canvasExport';

describe('canvasExport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getCanvasElement returns null when document is undefined', () => {
    vi.stubGlobal('document', undefined);
    expect(getCanvasElement()).toBeNull();
  });

  it('getCanvasElement queries the DOM for the canvas', () => {
    const mockCanvas = { toBlob: vi.fn() } as unknown as HTMLCanvasElement;
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(mockCanvas),
    } as unknown as Document);
    expect(getCanvasElement()).toBe(mockCanvas);
  });

  it('exportCanvasToBlob returns null when no canvas is found', async () => {
    vi.stubGlobal('document', undefined);
    const result = await exportCanvasToBlob('png', 90);
    expect(result).toBeNull();
  });
});
