import Konva from 'konva';

export interface ExportedBlob {
  blob: Blob;
  mime: string;
}

/** Fallback legacy helper: finds the first visible Konva canvas in the DOM.
 *  Kept only for backwards compatibility; prefer passing a Konva stage ref. */
export function getCanvasElement(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const selectors = [
    '.canvas-container .konvajs-content canvas',
    '.konvajs-content canvas',
    '.canvas-container canvas',
    'canvas.konvajs-content',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLCanvasElement | null;
    if (el) return el;
  }
  return null;
}

const YOUTUBE_THUMBNAIL_WIDTH = 1920;
const YOUTUBE_THUMBNAIL_HEIGHT = 1080;

/** Convert any legacy/accidental WebP request to JPEG so the produced
 *  blob is always publishable on YouTube. */
function canonicalFormat(format: string): string {
  return format === 'webp' ? 'jpeg' : format;
}

function normalizeFormat(format: string): { mime: string; valid: boolean } {
  switch (canonicalFormat(format)) {
    case 'jpeg':
      return { mime: 'image/jpeg', valid: true };
    case 'png':
      return { mime: 'image/png', valid: true };
    default:
      return { mime: 'image/png', valid: false };
  }
}

function dataURLToImage(dataURL: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

function imageToBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  mime: string,
  quality: number
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.resolve(null);
  }
  ctx.drawImage(image, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b),
      mime,
      mime === 'image/png' ? undefined : quality
    );
  });
}

/** Renders the logical project canvas from a Konva stage as a 1920x1080 thumbnail blob.
 *  Temporarily hides nodes marked with `name="export-exclude"` (grid, guides,
 *  transformer handles, crop overlays) and neutralises zoom/pan while capturing. */
export async function exportStageToBlob(
  stage: Konva.Stage,
  canvasWidth: number,
  canvasHeight: number,
  format: string,
  quality: number
): Promise<ExportedBlob | null> {
  const { mime, valid } = normalizeFormat(format);
  if (!valid) {
    throw new Error(`Unsupported thumbnail format: ${format}`);
  }
  const q = Math.max(0.01, Math.min(1, quality / 100));

  // The Stage is normally sized to the editor viewport, while the artwork
  // lives in logical document coordinates. Capturing a 1920x1080 crop from a
  // shorter viewport leaves the part outside the backing canvas transparent
  // (and it is later displayed as white). Resize the same Stage temporarily
  // so the real background Rect and every object are rendered on a complete
  // logical surface.
  const logicalWidth = Math.max(1, canvasWidth);
  const logicalHeight = Math.max(1, canvasHeight);
  const stageWithSize = stage as Konva.Stage & {
    size?: (size?: { width: number; height: number }) => { width: number; height: number } | void;
  };
  const originalWidth = typeof stageWithSize.width === 'function' ? stageWithSize.width() : undefined;
  const originalHeight = typeof stageWithSize.height === 'function' ? stageWithSize.height() : undefined;

  // 1. Identify and hide editor-only overlays.
  const excludeNodes = stage.find('.export-exclude');
  const previousVisibility = new Map<Konva.Node, boolean>();
  for (const node of excludeNodes) {
    previousVisibility.set(node, node.visible());
    node.visible(false);
  }

  // 2. Neutralise pan/zoom so the exported region is the logical project rectangle.
  const originalX = stage.x();
  const originalY = stage.y();
  const originalScaleX = stage.scaleX();
  const originalScaleY = stage.scaleY();
  const layerTransforms = stage.find('Layer')
    .filter((layer) => {
      const candidate = layer as unknown as Record<string, unknown>;
      return typeof candidate.x === 'function'
        && typeof candidate.y === 'function'
        && typeof candidate.scaleX === 'function'
        && typeof candidate.scaleY === 'function'
        && typeof candidate.rotation === 'function';
    })
    .map((layer) => ({
    layer,
    x: layer.x(),
    y: layer.y(),
    scaleX: layer.scaleX(),
    scaleY: layer.scaleY(),
    rotation: layer.rotation(),
  }));

  if (stageWithSize.size) {
    stageWithSize.size({ width: logicalWidth, height: logicalHeight });
  }
  for (const { layer } of layerTransforms) {
    layer.position({ x: 0, y: 0 });
    layer.scale({ x: 1, y: 1 });
    layer.rotation(0);
  }
  stage.position({ x: 0, y: 0 });
  stage.scale({ x: 1, y: 1 });
  stage.batchDraw();

  let dataURL: string;
  try {
    dataURL = stage.toDataURL({
      x: 0,
      y: 0,
      width: logicalWidth,
      height: logicalHeight,
      pixelRatio: 1,
      mimeType: mime,
      quality: q,
    });
    // Capture is synchronous from Konva's point of view. Restore the visible
    // editor before awaiting image decoding/blob encoding so the UI never
    // spends an async interval in export dimensions.
  } finally {
    // 3. Restore stage state and overlay visibility exactly once.
    stage.position({ x: originalX, y: originalY });
    stage.scale({ x: originalScaleX, y: originalScaleY });
    for (const { layer, x, y, scaleX, scaleY, rotation } of layerTransforms) {
      layer.position({ x, y });
      layer.scale({ x: scaleX, y: scaleY });
      layer.rotation(rotation);
    }
    if (stageWithSize.size && originalWidth != null && originalHeight != null) {
      stageWithSize.size({ width: originalWidth, height: originalHeight });
    }
    for (const [node, wasVisible] of previousVisibility) {
      node.visible(wasVisible);
    }
    stage.batchDraw();
  }

  const image = await dataURLToImage(dataURL);
  const blob = await imageToBlob(
    image,
    YOUTUBE_THUMBNAIL_WIDTH,
    YOUTUBE_THUMBNAIL_HEIGHT,
    mime,
    q
  );

  if (!blob) return null;
  return { blob, mime };
}

/** Public export entry point. When a Konva stage and the project logical
 *  dimensions are provided the export is overlay-free and sized to
 *  1920x1080; otherwise it degrades to the legacy DOM querySelector behaviour. */
export function exportCanvasToBlob(
  format: string,
  quality: number,
  stage?: Konva.Stage | null,
  canvasWidth?: number,
  canvasHeight?: number
): Promise<ExportedBlob | null> {
  // WebP is not accepted by YouTube; transparently produce JPEG instead.
  const outputFormat = canonicalFormat(format);

  if (stage && canvasWidth != null && canvasHeight != null) {
    return exportStageToBlob(stage, canvasWidth, canvasHeight, outputFormat, quality);
  }

  // Legacy fallback — kept only for callers that still lack a stage ref.
  const canvasEl = getCanvasElement();
  if (!canvasEl) {
    return Promise.resolve(null);
  }

  const { mime, valid } = normalizeFormat(outputFormat);
  if (!valid) {
    return Promise.reject(new Error(`Unsupported thumbnail format: ${format}`));
  }
  const q = Math.max(0.01, Math.min(1, quality / 100));

  return new Promise<ExportedBlob | null>((resolve) => {
    canvasEl.toBlob(
      (b) => {
        if (!b) return resolve(null);
        resolve({ blob: b, mime });
      },
      mime,
      mime === 'image/png' ? undefined : q
    );
  });
}
