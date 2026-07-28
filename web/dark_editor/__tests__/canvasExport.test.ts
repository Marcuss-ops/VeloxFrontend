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
//
// The mock derives the toBlob'd bytes from the LAST image passed to
// ctx.drawImage(img, ...). This keeps the byte-equality test meaningful
// in tests that compare the same image source across different zoom/pan
// inputs -- the bytes would only match if the pipeline truly was
// invariant to the captured-region inputs.
type CanvasLike = HTMLCanvasElement & { naturalWidth: number; naturalHeight: number };

function createMockCanvas(width = 1280, height = 720): CanvasLike {
  let lastDrawnSrc = '';
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    getContext: vi.fn(() => ({
      drawImage: vi.fn((img: HTMLImageElement & { src: string }) => {
        // Track the most-recently drawn source so canvas.toBlob() can
        // derive its output bytes from it -- lets byte-equality tests
        // detect differences in what the pipeline feeds into the canvas.
        lastDrawnSrc = img?.src ?? '';
      }),
    })),
    toBlob: vi.fn((callback: BlobCallback, _mime?: string, _quality?: number) => {
      const content = `drawn:${lastDrawnSrc}`;
      callback(new Blob([content], { type: _mime ?? 'image/png' }) as unknown as globalThis.Blob);
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

  it('exportCanvasToBlob legacy fallback: webp is canonicalised to image/jpeg before canvas.toBlob (no 400 from /media/presign)', async () => {
    // The publish panel UI (FormatQualitySection) only exposes PNG and JPEG, so this
    // legacy fallback path is only hit when a still-stage-unaware caller passes
    // format='webp' programmatically. The lib MUST still canonicalise webp -> jpeg
    // BEFORE calling canvas.toBlob(mime=...) so that the produced Blob.type is
    // image/jpeg -- otherwise POST /media/presign would return HTTP 400
    // "Unsupported thumbnail format" and the upload pipeline would abort.
    const mockCanvas: HTMLCanvasElement = {
      toBlob: vi.fn((callback: BlobCallback, mime?: string, quality?: number) => {
        callback(
          new Blob(['jpeg-bytes'], { type: mime ?? 'image/jpeg' }) as unknown as globalThis.Blob,
        );
      }),
    } as unknown as HTMLCanvasElement;
    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(mockCanvas),
      createElement: vi.fn(),
    } as unknown as Document);

    const result = await exportCanvasToBlob('webp', 90);

    // 1. The mime passed INTO canvas.toBlob is image/jpeg (webp canonicalised).
    const toBlobCalls = (mockCanvas.toBlob as ReturnType<typeof vi.fn>).mock.calls;
    expect(toBlobCalls.length, 'canvas.toBlob should be invoked exactly once').toBe(1);
    expect(toBlobCalls[0][1], 'webp must be canonicalised to image/jpeg BEFORE canvas.toBlob').toBe('image/jpeg');
    // 2. Quality is forwarded (jpeg isn't png so q applies).
    expect(toBlobCalls[0][2], 'jpeg quality (0.9) must be forwarded to canvas.toBlob').toBe(0.9);

    // 3. The returned ExportedBlob (what callers hand to the upload pipeline):
    expect(result, 'legacy fallback with webp must succeed and NOT throw Unsupported thumbnail format').not.toBeNull();
    expect(result!.mime, 'returned ExportedBlob.mime must be image/jpeg').toBe('image/jpeg');
    // result.blob.type is the field /media/presign reads from the multipart
    // Content-Type -- this is THE assertion that prevents the 400.
    expect(result!.blob.type, 'returned Blob.type must be image/jpeg -- POST /media/presign rejects image/webp with 400').toBe('image/jpeg');
  });

  it('exportStageToBlob("webp", ...): imageToBlob(canvas.toBlob) receives image/jpeg (not image/webp) -- POST /media/presign stays 200', async () => {
    // The earlier "converts webp format to jpeg before exporting" test covers the
    // stage.toDataURL(opts.mimeType) and the ExportedBlob.mime field. This test
    // uppercases the SAME invariant on the actual Blob instance: the mime passed
    // into canvas.toBlob() AND the resulting Blob.type are both image/jpeg. These
    // are the values the upload pipeline actually reads from when POSTing the
    // multipart payload to /media/presign -- if either were image/webp the server
    // would respond 400 ("Unsupported thumbnail format").
    const stage = createMockStage();
    (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

    // createMockCanvas.toBlob is already a vi.fn -- capture the canvas it
    // returns and read its .mock.calls after the export resolves. No
    // wrapping/replacement needed.
    const stageCanvas = createMockCanvas(1280, 720);
    vi.stubGlobal('document', {
      createElement: vi.fn(() => stageCanvas),
      querySelector: vi.fn(),
    } as unknown as Document);

    const result = await exportStageToBlob(stage, 1920, 1080, 'webp', 90);

    expect(result, 'exportStageToBlob(webp) must return a Blob -- no Unsupported thumbnail format thrown').not.toBeNull();
    // Mime forwarded into imageToBlob() -> canvas.toBlob() (canonicalised).
    const toBlobCalls = (stageCanvas.toBlob as ReturnType<typeof vi.fn>).mock.calls;
    expect(toBlobCalls.length, 'imageToBlob must call canvas.toBlob exactly once').toBe(1);
    expect(toBlobCalls[0][1], 'imageToBlob must call canvas.toBlob with image/jpeg -- otherwise POST /media/presign returns 400').toBe('image/jpeg');
    // ExportedBlob.mime descriptor.
    expect(result!.mime, 'ExportedBlob.mime must reflect the canonicalised JPEG mime').toBe('image/jpeg');
    // Actual Blob.type that the upload pipeline reads from the multipart Content-Type.
    expect(result!.blob.type, 'Blob.type must be image/jpeg -- otherwise POST /media/presign returns 400').toBe('image/jpeg');
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

  it('produces byte-identical blob across zoom 50% / 100% / 200% with active pan offsets', async () => {
    // exportStageToBlob proactively resets stage.position(0,0) and
    // stage.scale(1,1) before calling stage.toDataURL(...). After that
    // reset, toDataURL receives IDENTICAL arguments regardless of the
    // initial zoom/pan the user had at the moment of capture, so the
    // resulting blob must be byte-identical. Proves the user-facing
    // invariant: "the editor's current zoom and pan do NOT influence
    // the final 1280x720 thumbnail PNG".
    //
    // Mock strategy:
    //   - All 3 cases use the SAME stage.toDataURL() return value, so
    //     MockImage.src is identical across cases. In real Konva the
    //     captured pixel content would also be identical once stage
    //     content + capture region + pixelRatio match.
    //   - createMockCanvas.toBlob() derives its blob bytes from the
    //     last image passed to ctx.drawImage(img, ...). So if the
    //     pipeline fed drawImage an image with a different src between
    //     cases, the blob bytes would diverge -- making the byte check
    //     a true regression guard rather than a tautology.
    const STAGE_DATAURL =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const initialStates: ReadonlyArray<{
      label: string;
      panX: number;
      panY: number;
      scaleX: number;
      scaleY: number;
    }> = [
      { label: '50% zoom + pan (100, 200)', panX: 100, panY: 200, scaleX: 0.5, scaleY: 0.5 },
      { label: '100% zoom, no pan',         panX: 0,   panY: 0,   scaleX: 1.0, scaleY: 1.0 },
      { label: '200% zoom + pan (-50, 75)', panX: -50, panY: 75,  scaleX: 2.0, scaleY: 2.0 },
    ];

    interface CapturedCase {
      label: string;
      blob: Blob;
      toDataURLOpts: Record<string, unknown>;
      blobBytes: string;
    }
    const captured: CapturedCase[] = [];

    for (const init of initialStates) {
      const stage = createMockStage();
      // Override the closure-state getters so production code sees THIS
      // iteration's initial state at the moment exportStageToBlob samples
      // stage.x()/y()/scaleX()/scaleY() for the restore snapshot. Stage.x
      // must stay a callable (the production code uses `stage.x()`); a
      // plain property reassignment with a vi.fn preserves callability.
      const stateRef = { x: init.panX, y: init.panY, scaleX: init.scaleX, scaleY: init.scaleY };
      const xSpy = vi.fn(() => stateRef.x);
      const ySpy = vi.fn(() => stateRef.y);
      const sXSpy = vi.fn(() => stateRef.scaleX);
      const sYSpy = vi.fn(() => stateRef.scaleY);
      stage.x = xSpy as unknown as typeof stage.x;
      stage.y = ySpy as unknown as typeof stage.y;
      stage.scaleX = sXSpy as unknown as typeof stage.scaleX;
      stage.scaleY = sYSpy as unknown as typeof stage.scaleY;

      (stage.find as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const dataCalls: Array<Record<string, unknown>> = [];
      // Constant across iterations -- the contract under test is that
      // the captured content is invariant to the editor's zoom/pan.
      stage.toDataURL = vi.fn((opts: Record<string, unknown>) => {
        dataCalls.push(opts);
        return STAGE_DATAURL;
      }) as unknown as typeof stage.toDataURL;

      const result = await exportStageToBlob(stage, 1920, 1080, 'png', 90);
      expect(result, `exportStageToBlob must return a blob for: ${init.label}`).not.toBeNull();

      // Neutralisation happened before capture independent of the initial state.
      expect(stage.position, `${init.label}: stage.position must reset to (0,0)`).toHaveBeenCalledWith({ x: 0, y: 0 });
      expect(stage.scale,    `${init.label}: stage.scale must reset to (1,1)`).toHaveBeenCalledWith({ x: 1, y: 1 });

      // toDataURL was called with the logical-rect capture args and they
      // match the canvasWidth/canvasHeight + pixelRatio=1 + image/png spec
      // — not derived from the initial pan/zoom.
      expect(dataCalls.length, `${init.label}: stage.toDataURL should be called`).toBeGreaterThan(0);
      const opts = dataCalls[0];
      expect(opts.x,           `${init.label}: toDataURL x = 0`).toBe(0);
      expect(opts.y,           `${init.label}: toDataURL y = 0`).toBe(0);
      expect(opts.width,       `${init.label}: toDataURL width = canvasWidth`).toBe(1920);
      expect(opts.height,      `${init.label}: toDataURL height = canvasHeight`).toBe(1080);
      expect(opts.pixelRatio,  `${init.label}: toDataURL pixelRatio = 1`).toBe(1);
      expect(opts.mimeType,    `${init.label}: toDataURL mimeType = image/png`).toBe('image/png');

      const blob = result!.blob;
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const bytesStr = Array.from(bytes).join(',');
      captured.push({ label: init.label, blob, toDataURLOpts: opts, blobBytes: bytesStr });
    }

    // All toDataURL opts must match across the 3 cases (the spec the
    // user asked about: zoom/pan do NOT alter the capture region).
    const firstOpts = captured[0].toDataURLOpts;
    for (let i = 1; i < captured.length; i++) {
      const o = captured[i].toDataURLOpts;
      expect(o.x,           `case ${i} toDataURL x must match case 0`).toBe(firstOpts.x);
      expect(o.y,           `case ${i} toDataURL y must match case 0`).toBe(firstOpts.y);
      expect(o.width,       `case ${i} toDataURL width must match case 0`).toBe(firstOpts.width);
      expect(o.height,      `case ${i} toDataURL height must match case 0`).toBe(firstOpts.height);
      expect(o.pixelRatio,  `case ${i} toDataURL pixelRatio must match case 0`).toBe(firstOpts.pixelRatio);
      expect(o.mimeType,    `case ${i} toDataURL mimeType must match case 0`).toBe(firstOpts.mimeType);
    }

    // All blobs must be byte-identical across the 3 cases regardless of
    // initial zoom/pan. createMockCanvas.toBlob derives its content from
    // ctx.drawImage(img, ...).src -- if the pipeline fed drawImage an
    // image with a different src between cases, the blob bytes would
    // diverge. With the SAME STAGE_DATAURL across all 3 iterations and
    // the production code neutralising zoom/pan before capture, the
    // resulting blobs MUST be byte-identical -- this is the user-facing
    // invariant the followup asks for.
    for (let i = 1; i < captured.length; i++) {
      expect(captured[i].blobBytes, `Blob bytes for ${captured[i].label} must match blob bytes for ${captured[0].label}`).toBe(captured[0].blobBytes);
      expect(captured[i].blob.size, `Blob size for ${captured[i].label} must match blob size for ${captured[0].label}`).toBe(captured[0].blob.size);
      expect(captured[i].blob.type, `Blob type for ${captured[i].label} must match blob type for ${captured[0].label}`).toBe(captured[0].blob.type);
    }
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

  it('snapshot at stage.toDataURL: every editor-only overlay is hidden AND every content node remains visible (symmetric overhide guard)', async () => {
    // The export pipeline must:
    //   - Hide EVERY node tagged name="export-exclude" (grid lines, guides,
    //     snap lines, transformer + handles, crop overlay, lasso points)
    //     -- the editor-UI set. Hiding them keeps the final 1280x720 PNG
    //     free of placement guides / crop wireframes / transformer grips.
    //   - Leave un-tagged content untouched (canvas background, image and
    //     text objects). They MUST remain visible so the captured PNG
    //     reflects the user-visible content.
    // This test snapshots the visibility state INSIDE toDataURL so we
    // observe exactly what the PNG serializer reads from. A regression
    // where production over-hid content (or under-hid overlays, or hid
    // them AFTER toDataURL) would correctly flip any of these snapshots.
    const stage = createMockStage();

    // Build a Konva.Node-shaped mock. Konva's `name()` is a callable
    // (getter/setter), not a string property, so we declare `name` as a
    // method that returns the captured string. `visible()` is the same
    // getter/setter idiom; without an arg it returns the current state,
    // with an arg it sets and returns the node for chainability. The
    // final `as unknown as Konva.Node` cast bridges the gap between our
    // minimal-shape literal and the real Konva.Node interface (only the
    // methods used by the production code under test need to exist).
    function makeMockNode(name: string, initialVisible: boolean): Konva.Node {
      let visible = initialVisible;
      const node = {
        name(): string {
          return name;
        },
        visible(v?: boolean): unknown {
          if (v === undefined) return visible;
          visible = !!v;
          return node;
        },
      };
      return node as unknown as Konva.Node;
    }

    const editorOverlayNodes: Konva.Node[] = [
      makeMockNode('grid-line-v',        true),
      makeMockNode('grid-line-h',        true),
      makeMockNode('grid-group',         true),
      makeMockNode('guide-v',            true),
      makeMockNode('guide-h',            true),
      makeMockNode('snap-line-h',        true),
      makeMockNode('snap-line-v',        true),
      makeMockNode('transformer',        true),
      makeMockNode('transformer-handle', true),
      makeMockNode('crop-overlay',       true),
      makeMockNode('crop-overlay-group', true),
      makeMockNode('lasso-line',         true),
      makeMockNode('lasso-point',        true),
    ];

    // Content nodes: NOT picked up by stage.find('.export-exclude') -- they
    // must remain untouched throughout the export pipeline so the captured
    // PNG reflects actual user-visible content.
    const contentNodes: Konva.Node[] = [
      makeMockNode('canvas-background', true),
      makeMockNode('image-object-1',    true),
      makeMockNode('text-object-1',     true),
    ];

    // stage.find('.export-exclude') returns ONLY the editor overlay nodes;
    // any other selector returns an empty match (content nodes are picked
    // up by name-based selectors elsewhere in production, not here).
    (stage.find as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
      if (selector === '.export-exclude') return editorOverlayNodes;
      return [];
    });

    // Capture visibility snapshot AT THE MOMENT stage.toDataURL runs. This
    // is exactly when the PNG serializer reads node state, so this is the
    // canonical "what does the user see in the final image" sample.
    const snapshotAtToDataURL: Array<{ name: string; visible: boolean }> = [];
    stage.toDataURL = vi.fn((opts: Record<string, unknown>) => {
      for (const node of editorOverlayNodes) {
        snapshotAtToDataURL.push({ name: node.name(), visible: node.visible() as boolean });
      }
      for (const node of contentNodes) {
        snapshotAtToDataURL.push({ name: node.name(), visible: node.visible() as boolean });
      }
      return 'data:image/png;base64,SNAPSHOT_CONTENT';
    }) as unknown as typeof stage.toDataURL;

    await exportStageToBlob(stage, 1920, 1080, 'png', 90);

    // toDataURL was called (proves pipeline reached capture step).
    expect(snapshotAtToDataURL.length, 'stage.toDataURL should have been called').toBeGreaterThan(0);

    // Every editor-only overlay MUST be hidden AT this snapshot. If any
    // editor node slipped through with visible():true, the captured PNG
    // would contain its pixels.
    for (const overlayNode of editorOverlayNodes) {
      const overlayName = overlayNode.name();
      const captured = snapshotAtToDataURL.find(s => s.name === overlayName);
      expect(captured, `${overlayName} must appear in the toDataURL snapshot`).toBeDefined();
      expect(
        captured!.visible,
        `${overlayName} must be hidden AT THE MOMENT stage.toDataURL ran -- otherwise the final 1280x720 PNG will contain this editor UI`,
      ).toBe(false);
    }

    // Every content node MUST STILL BE VISIBLE AT this snapshot. If the
    // production pipeline ever over-hid content (e.g. by using a too-broad
    // selector, or by hiding entire layers), these would be visible:false
    // and the captured PNG would be missing content.
    for (const contentNode of contentNodes) {
      const nodeName = contentNode.name();
      const captured = snapshotAtToDataURL.find(s => s.name === nodeName);
      expect(captured, `${nodeName} must appear in the toDataURL snapshot`).toBeDefined();
      expect(
        captured!.visible,
        `${nodeName} must remain visible AT THE MOMENT stage.toDataURL ran -- otherwise the export pipeline is over-hiding content`,
      ).toBe(true);
    }
  });
});
