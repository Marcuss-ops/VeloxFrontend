import { exportStageToBlob } from '@/lib/canvasExport';
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

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    };
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, 5000);
  });
}

async function waitForCanvasAssets(stage: ExportStage): Promise<void> {
  await Promise.all(
    (stage.find?.('Image') ?? []).map((node) => {
      const image = node.image?.();
      return image instanceof HTMLImageElement ? waitForImage(image) : Promise.resolve();
    }),
  );
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
    const original = {
      x: stage.x?.() ?? 0,
      y: stage.y?.() ?? 0,
      scaleX: stage.scaleX?.() ?? 1,
      scaleY: stage.scaleY?.() ?? 1,
    };
    const stageWithSize = stage as ExportStage;
    const originalWidth = stageWithSize.width?.();
    const originalHeight = stageWithSize.height?.();
    const layerTransforms = (stage.find?.('Layer') ?? [])
      .filter((node) => node.x && node.y && node.scaleX && node.scaleY && node.rotation)
      .map((node) => ({
        node,
        x: node.x!(),
        y: node.y!(),
        scaleX: node.scaleX!(),
        scaleY: node.scaleY!(),
        rotation: node.rotation!() ?? 0,
      }));
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
      stageWithSize.size?.({ width, height });
      for (const { node } of layerTransforms) {
        node.position?.({ x: 0, y: 0 });
        node.scale?.({ x: 1, y: 1 });
        node.rotation?.(0);
      }
      stage.position?.({ x: 0, y: 0 });
      stage.scale?.({ x: 1, y: 1 });
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
      for (const { node, x, y, scaleX, scaleY, rotation } of layerTransforms) {
        node.position?.({ x, y });
        node.scale?.({ x: scaleX, y: scaleY });
        node.rotation?.(rotation);
      }
      stage.position?.({ x: original.x, y: original.y });
      stage.scale?.({ x: original.scaleX, y: original.scaleY });
      if (originalWidth != null && originalHeight != null) {
        stageWithSize.size?.({ width: originalWidth, height: originalHeight });
      }
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
