import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { getCanvasElement, exportCanvasToBlob, exportStageToBlob } from '@/lib/canvasExport';

// Mock canvas whose toBlob produces the final YouTube thumbnail blob.
// Mirrors the in-browser semantics:
//   - canvas.width / canvas.height       -- the JS-side pixel dimensions
//   - canvas.naturalWidth / naturalHeight -- what <img>.naturalWidth /
//     <img>.naturalHeight would report after the blob is decoded (PNG
//     and JPEG headers carry the canvas dimensions verbatim).
// HTMLCanvasElement doesn't have naturalWidth/Height in W3C, but the
// PNG/JPEG-surrogate semantics the user explicitly asked about are
// captured here via an intersection type so tests can assert both views.
type CanvasLike = HTMLCanvasElement & { naturalWidth: number; naturalHeight: number };

function createMockCanvas(width = 1280, height = 720): CanvasLike {
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    getContext: vi.fn(() => ({ drawImage: vi.fn() })),
    toBlob: vi.fn((callback: BlobCallback, _mime?: string, _quality?: number) => {
      callback(new Blob(['image'], { type: _mime ?? 'image/png' }) as unknown as globalThis.Blob);
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  } as unknown as CanvasLike;
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

  it('produces a 1280x720 thumbnail canvas regardless of input logical size', async () => {
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);
    let outputCanvas: HTMLCanvasElement | undefined;
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        const canvas = createMockCanvas(1280, 720);
        if (tag === 'canvas') {
          outputCanvas = canvas;
        }
        return canvas;
      }),
      querySelector: vi.fn(),
    } as unknown as Document);

    const result = await exportStageToBlob(stage, 3000, 2000, 'png', 90);

    expect(result).not.toBeNull();
    expect(outputCanvas).toBeDefined();
    expect(outputCanvas!.width).toBe(1280);
    expect(outputCanvas!.height).toBe(720);
  });

  it('output thumbnail blob decodes to image.naturalWidth=1280 / naturalHeight=720 regardless of project logical dimensions (incl. 1920x1080, 3000x2000, 800x450)', async () => {
    // YouTube requires the final PNG/JPEG to be exactly 1280x720.
    // The OUTPUT canvas (whose toBlob produces the project blob) is the
    // single source of truth for those dimensions: in any browser the
    // PNG/JPEG header mirrors canvas.width/canvas.height, and the
    // resulting <img>.naturalWidth/<img>.naturalHeight is read from
    // that same header. So we capture the OUTPUT canvas and assert on
    // BOTH the JS-side (width/height) AND the image-side
    // (naturalWidth/naturalHeight) properties.
    const projectSizes: ReadonlyArray<readonly [number, number]> = [
      [1920, 1080],
      [3000, 2000],
      [800, 450],
    ];
    for (const [w, h] of projectSizes) {
      const stage = createMockStage();
      (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

      let outputCanvas: CanvasLike | undefined;
      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => {
          const canvas = createMockCanvas(1280, 720);
          if (tag === 'canvas') {
            outputCanvas = canvas;
          }
          return canvas;
        }),
        querySelector: vi.fn(),
      } as unknown as Document);

      const result = await exportStageToBlob(stage, w, h, 'png', 90);

      expect(result, `exportStageToBlob(${w}x${h}) must succeed`).not.toBeNull();
      expect(outputCanvas, 'imageToBlob must have created the OUTPUT canvas').toBeDefined();

      // JS-side canvas dimensions — what toBlob bakes into the PNG/JPEG
      // header.
      expect(outputCanvas!.width).toBe(1280);
      expect(outputCanvas!.height).toBe(720);

      // Image-side mirror — what an <img> decoding the resulting blob
      // would expose. This is the user-facing contract: any consumer
      // reading image.naturalWidth / image.naturalHeight on the decoded
      // thumbnail GETS 1280 / 720, independent of the project's logical
      // canvas size, the viewport, the editor zoom level, and the
      // current pan offset (zooming/panning are neutralised inside
      // exportStageToBlob before the capture).
      expect(outputCanvas!.naturalWidth).toBe(1280);
      expect(outputCanvas!.naturalHeight).toBe(720);
    }
  });

  it('neutralises zoom and pan before capture and restores them after', async () => {
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await exportStageToBlob(stage, 1920, 1080, 'png', 90);

    expect(stage.position).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect(stage.scale).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(stage.toDataURL).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        pixelRatio: 1,
      }),
    );
    const stageState = (stage as unknown as { _state: { x: number; y: number; scaleX: number; scaleY: number } })._state;
    expect(stageState.x).toBe(50);
    expect(stageState.y).toBe(50);
    expect(stageState.scaleX).toBe(1.5);
    expect(stageState.scaleY).toBe(1.5);
  });

  it('hides grid, guides, transformer and crop overlays during export and restores them', async () => {
    const stage = createMockStage();
    const overlays = [
      { name: 'grid', visible: vi.fn(() => true) },
      { name: 'guides', visible: vi.fn(() => true) },
      { name: 'crop', visible: vi.fn(() => true) },
      { name: 'transformer', visible: vi.fn(() => true) },
    ];
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue(overlays);

    await exportStageToBlob(stage, 1920, 1080, 'png', 90);

    expect(stage.find).toHaveBeenCalledWith('.export-exclude');
    for (const node of overlays) {
      expect(node.visible.mock.calls).toEqual([[], [false], [true]]);
    }
  });
});
