import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { getCanvasElement, exportCanvasToBlob, exportStageToBlob } from '@/lib/canvasExport';

// Minimal HTMLCanvasElement mock for a Node test environment.
function createMockCanvas(width = 1280, height = 720): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: vi.fn(() => ({ drawImage: vi.fn() })),
    toBlob: vi.fn((callback: BlobCallback, _mime?: string, _quality?: number) => {
      callback(new Blob(['image'], { type: _mime ?? 'image/png' }) as unknown as globalThis.Blob);
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  } as unknown as HTMLCanvasElement;
}

// Minimal Konva stage mock for the new export path.
function createMockStage() {
  const state = {
    x: 50,
    y: 50,
    scaleX: 1.5,
    scaleY: 1.5,
  };

  const find = vi.fn(() => []);
  const position = vi.fn((pos: { x: number; y: number }) => {
    state.x = pos.x;
    state.y = pos.y;
  });
  const scale = vi.fn((s: { x: number; y: number }) => {
    state.scaleX = s.x;
    state.scaleY = s.y;
  });
  const batchDraw = vi.fn();
  const toDataURL = vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

  return {
    find,
    position,
    scale,
    batchDraw,
    toDataURL,
    x: () => state.x,
    y: () => state.y,
    scaleX: () => state.scaleX,
    scaleY: () => state.scaleY,
    _state: state,
  } as unknown as Konva.Stage;
}

describe('canvasExport', () => {
  beforeEach(() => {
    // Provide minimal DOM APIs required by the export path in a Node test environment.
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      _src = '';
      set src(value: string) {
        this._src = value;
        Promise.resolve().then(() => {
          if (this.onload) this.onload();
        });
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', MockImage);

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return createMockCanvas(1280, 720);
        }
        return createMockCanvas(1280, 720);
      }),
      querySelector: vi.fn(),
    } as unknown as Document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it('exportCanvasToBlob returns null when no canvas is found (legacy fallback)', async () => {
    vi.stubGlobal('document', undefined);
    const result = await exportCanvasToBlob('png', 90);
    expect(result).toBeNull();
  });

  it('exportStageToBlob hides overlay nodes, resets stage transform, and restores them', async () => {
    const stage = createMockStage();
    const visibleCalls: (boolean | undefined)[] = [];
    const node = {
      visible: vi.fn((value?: boolean) => {
        visibleCalls.push(value);
        return true;
      }),
    } as unknown as any;
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([node]);

    const result = await exportStageToBlob(stage, 1920, 1080, 'png', 90);

    expect(stage.find).toHaveBeenCalledWith('.export-exclude');
    expect(visibleCalls).toContain(false);
    expect(visibleCalls).toContain(true);
    expect(stage.position).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect(stage.scale).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(stage.toDataURL).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      mimeType: 'image/png',
      quality: 0.9,
    });
    expect(result).not.toBeNull();
    expect(result?.mime).toBe('image/png');
    expect(result?.blob).toBeInstanceOf(Blob);
  });

  it('exportCanvasToBlob uses the stage path when stage and dimensions are provided', async () => {
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const result = await exportCanvasToBlob('jpeg', 90, stage, 1920, 1080);

    expect(stage.toDataURL).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.mime).toBe('image/jpeg');
  });

  it('produces a 1280x720 thumbnail blob from a 1920x1080 logical canvas', async () => {
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const createdCanvases: { width: number; height: number }[] = [];
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        const canvas = createMockCanvas(1280, 720);
        if (tag === 'canvas') {
          createdCanvases.push({ width: canvas.width, height: canvas.height });
        }
        return canvas;
      }),
      querySelector: vi.fn(),
    } as unknown as Document);

    const result = await exportStageToBlob(stage, 1920, 1080, 'png', 90);

    expect(stage.toDataURL).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      mimeType: 'image/png',
      quality: 0.9,
    });
    expect(createdCanvases).toContainEqual({ width: 1280, height: 720 });
    expect(result).not.toBeNull();
    expect(result?.blob).toBeInstanceOf(Blob);
    expect(result?.mime).toBe('image/png');
  });

  it('converts webp format to jpeg before exporting', async () => {
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const result = await exportCanvasToBlob('webp', 90, stage, 1920, 1080);

    expect(stage.toDataURL).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/jpeg',
      })
    );
    expect(result).not.toBeNull();
    expect(result?.mime).toBe('image/jpeg');
  });

  it('rejects unsupported formats when a stage is provided', async () => {
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await expect(exportCanvasToBlob('gif', 90, stage, 1920, 1080)).rejects.toThrow(
      'Unsupported thumbnail format: gif'
    );
  });

  it('rejects unsupported formats in the legacy fallback', async () => {
    const mockCanvas = { toBlob: vi.fn() } as unknown as HTMLCanvasElement;
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(mockCanvas),
    } as unknown as Document);

    await expect(exportCanvasToBlob('gif', 90)).rejects.toThrow(
      'Unsupported thumbnail format: gif'
    );
  });
});
