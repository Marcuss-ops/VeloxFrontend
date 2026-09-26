import { exportStageToBlob } from '@/lib/canvasExport';
import { isImageSrcFailed } from '@/lib/imageLoadTracker';
import { sha256Hex } from '@/lib/hash';

// Single hashing authority (lib/hash.ts); this module keeps re-exporting
// the name for the export hooks and their test mocks.
export { sha256Hex };
import {
  neutralizeStageTransforms,
  restoreStageTransforms,
  snapshotStageTransforms,
  type CaptureStage,
} from '@/lib/canvasCaptureGeometry';
import Konva from 'konva';

type ExportStage = {
  draw: () => void;
  toDataURL?: (config?: Record<string, unknown>) => string;
  x?: () => number;
  y?: () => number;
  scaleX?: () => number;
  scaleY?: () => number;
  position?: (position?: { x: number; y: number }) => { x: number; y: number } | void;
  scale?: (scale?: { x: number; y: number }) => { x: number; y: number } | void;
  width?: () => number;
  height?: () => number;
  size?: (size?: { width: number; height: number }) => { width: number; height: number } | void;
  rotation?: (value?: number) => number | void;
  getChildren?: () => ExportStage[];
  find?: (selector: string) => ExportStage[];
  visible?: (value?: boolean) => boolean | void;
  text?: (value?: string) => string | void;
  image?: () => HTMLImageElement | HTMLCanvasElement | null;
  destroy?: () => void;
};

export type CanvasRenderOptions = {
  textOverrides?: Record<string, string>;
};

export function canvasStateSignature(
  objects: unknown[],
  width: number,
  height: number,
): string {
  return JSON.stringify({ width, height, objects });
}

/**
 * Wait for every Image node's bitmap to be decodable before capturing.
 *
 * Failure semantics (the previous implementation resolved on `error` AND
 * on timeout, so an export "succeeded" with holes where missing assets
 * should be and the broken frame was even persisted as a snapshot):
 *   - an image whose load FAILED is reported by rejecting with the src,
 *   - a timed-out load (stall, no load/error event) is reported too, but
 *     only after every other image had its chance — one slow CDN must not
 *     mask three healthy ones,
 *   - already-loaded images resolve immediately.
 * The callers own the policy: they can fail the capture or mark the
 * snapshot degraded instead of fixing a silently incomplete frame.
 */
const IMAGE_LOAD_TIMEOUT_MS = 5000;

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finishResolve = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', finishResolve);
      image.removeEventListener('error', finishReject);
      resolve();
    };
    const finishReject = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', finishResolve);
      image.removeEventListener('error', finishReject);
      reject(new Error(`image failed to load: ${image.src}`));
    };
    image.addEventListener('load', finishResolve, { once: true });
    image.addEventListener('error', finishReject, { once: true });
    window.setTimeout(finishReject, IMAGE_LOAD_TIMEOUT_MS);
  });
}

async function waitForCanvasAssets(stage: ExportStage): Promise<void> {
  const images = stage.find?.('Image') ?? [];
  const pending = images
    .map((node) => {
      const image = node.image?.();
      return image instanceof HTMLImageElement ? image : null;
    })
    .filter((image): image is HTMLImageElement => image !== null)
    // Skip assets already known to have failed this session: their load
    // event will never come, so waiting on them would burn the timeout and
    // block the capture on an unrecoverable source. The capture proceeds
    // and the caller decides how to surface the degraded frame.
    .filter((image) => !isImageSrcFailed(image.src));

  if (pending.length > 0) {
    // Every image gets its own timeout; one rejection aborts the wait.
    await Promise.all(pending.map((image) => waitForImage(image)));
  }
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      window.setTimeout(resolve, 0);
    }
  });
}

function findTextNode(stage: ExportStage, objectId: string): ExportStage | undefined {
  const candidates = stage.find?.(`#${objectId}`) ?? [];
  return candidates.find((candidate) => {
    if (typeof candidate.text !== 'function') return false;
    return typeof candidate.text() === 'string';
  });
}

export async function flushEditorCanvas(stage?: ExportStage): Promise<void> {
  stage?.draw();
  if (stage) await waitForCanvasAssets(stage);
  stage?.draw();
}

export async function captureEditorCanvasBlob(
  stage: ExportStage | undefined,
  width: number,
  height: number,
  mimeType = 'image/png',
  quality?: number,
  options?: CanvasRenderOptions,
): Promise<Blob | null> {
  await flushEditorCanvas(stage);

  // Normal preview/export and the feed simulator all use this same
  // canonical stage path. Keeping one byte-producing path is important: the
  // visible viewport must never become a second renderer whose zoom/pan or
  // backing-canvas size can leak into the PNG.
  if (stage?.toDataURL && !options?.textOverrides && mimeType === 'image/png') {
    const result = await exportStageToBlob(
      stage as unknown as Konva.Stage,
      width,
      height,
      'png',
      quality === undefined ? 100 : quality * 100,
    );
    return result?.blob ?? null;
  }

  // The visible Konva canvas is the editor viewport, not the document. It
  // can be wider/taller than the 1920x1080 artwork and contain empty black or
  // white space. Export the scene rectangle explicitly so the whole canvas
  // is rendered at its real document dimensions.
  if (stage?.toDataURL) {
    const captureStage = stage as CaptureStage;
    const snapshot = snapshotStageTransforms(captureStage);
    const hiddenNodes: ExportStage[] = [];
    const editorOnlyNodes = [
      ...(stage.find?.('.export-exclude') ?? []),
      ...(stage.find?.('.document-crop-overlay') ?? []),
      ...(stage.find?.('.grid-overlay') ?? []),
    ];
    const transformers = stage.find?.('Transformer') ?? [];
    for (const node of [...editorOnlyNodes, ...transformers]) {
      if (node.visible?.()) {
        node.visible?.(false);
        hiddenNodes.push(node);
      }
    }
    const previousText = new Map<ExportStage, string>();
    for (const [id, text] of Object.entries(options?.textOverrides ?? {})) {
      // The object id is present on both the outer Group and the inner Konva
      // Text/TextPath node. The Group has no text setter, so selecting the
      // first match silently left the original language in the PNG.
      const node = findTextNode(stage, id);
      const current = node?.text?.();
      if (node && typeof current === 'string') {
        previousText.set(node, current);
        node.text?.(text);
      }
    }
    try {
      // The stage itself is the canonical renderer used by the editor. Make
      // its backing surface match the logical document while capturing; the
      // viewport's CSS size is restored immediately afterwards.
      neutralizeStageTransforms(captureStage, width, height, snapshot.layers);
      stage.draw();
      const dataUrl = stage.toDataURL({
        x: 0, y: 0, width, height, pixelRatio: 1, mimeType,
        ...(quality === undefined ? {} : { quality }),
      });
      const response = await fetch(dataUrl);
      return response.blob();
    } finally {
      for (const [node, text] of previousText) node.text?.(text);
      for (const node of hiddenNodes) node.visible?.(true);
      restoreStageTransforms(captureStage, snapshot);
      stage.draw();
    }
  }

  const canvas = document.querySelector('.canvas-container .konvajs-content canvas') as HTMLCanvasElement | null;
  if (!canvas) return null;
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

export async function captureEditorCanvasPreviewFile(
  stage?: ExportStage,
  width = 1920,
  height = 1080,
): Promise<File | null> {
  // Konva can have a pending draw after a text edit or transform. Flush it
  // before reading the bitmap so the persisted preview and the export use the
  // same frame that the user currently sees.
  const blob = await captureEditorCanvasBlob(stage, width, height);
  if (!blob) return null;

  return new File([blob], 'preview.png', { type: 'image/png' });
}
