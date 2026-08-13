// lib/editorCanvasNormalize.ts — Pure normalization of a persisted project
// canvas to the canonical YouTube-thumbnail document. Extracted from
// hooks/useEditorProjectSession.ts so the 1280x720 → 1920x1080 migration,
// the "source thumbnail" background fixup and the "Layer 0" placeholder
// purge can be unit-tested without the session/gate machinery.

import { isScopedProjectId } from '@/lib/project-scope';
import type { CanvasObject } from '@/stores/canvasObjectTypes';

export interface RawEditorCanvas {
  objects?: unknown[];
  width?: number;
  height?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface NormalizeEditorCanvasOptions {
  projectId: string;
  projectType?: string;
  projectName: string;
  sessionSourceThumbnail?: string;
}

export interface NormalizedEditorCanvas {
  objects: CanvasObject[];
  width: number;
  height: number;
}

/** The canonical YouTube thumbnail document size used by every export. */
export const CANONICAL_CANVAS_WIDTH = 1920;
export const CANONICAL_CANVAS_HEIGHT = 1080;

export function normalizeEditorCanvas(
  canvas: RawEditorCanvas,
  opts: NormalizeEditorCanvasOptions,
): NormalizedEditorCanvas {
  const { projectId, projectType, projectName, sessionSourceThumbnail = '' } = opts;
  const sourceObjects = Array.isArray(canvas.objects) ? canvas.objects : [];

  // Editor sessions created by InstaEdit use a scoped (`ve_*`/`vx_*`)
  // id and may have an arbitrary E2E/draft title (for example
  // `InstaEdit E2E ...`). Do not use the display title as the
  // document-type discriminator: those sessions still need the
  // canonical 1920x1080 migration.
  const isYouTubeThumbnail = isScopedProjectId(projectId)
    || projectType === 'youtube_thumbnail'
    || /^YouTube thumbnail\b/i.test(projectName)
    || sourceObjects.some((value) => {
      const object = value as { type?: string; name?: string };
      return object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail');
    });

  const storedWidth = Number(canvas.canvasWidth ?? canvas.width);
  const storedHeight = Number(canvas.canvasHeight ?? canvas.height);
  const normalizedWidth = isYouTubeThumbnail ? CANONICAL_CANVAS_WIDTH : storedWidth;
  const normalizedHeight = isYouTubeThumbnail ? CANONICAL_CANVAS_HEIGHT : storedHeight;

  const legacyThumbnail = isYouTubeThumbnail && (
    (storedWidth === 1280 && storedHeight === 720)
    || sourceObjects.some((value) => {
      const object = value as { type?: string; name?: string; width?: number; height?: number };
      return object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail') && object.width === 1280 && object.height === 720;
    })
  );

  const scaleLegacyObject = (value: unknown): Record<string, unknown> => {
    const object = value as Record<string, unknown>;
    const isSourceThumbnail = object.type === 'image'
      && String(object.name || '').toLowerCase().includes('source thumbnail');
    // The source thumbnail is the document background. Older saved
    // sessions can contain a bad pan (for example x=-62/y=-411) even
    // though their document is already 1920x1080; that pan is exactly
    // what produces the visible blank band below the image.
    if (!legacyThumbnail && !(isYouTubeThumbnail && isSourceThumbnail)) return object;
    const scale = (key: string) => typeof object[key] === 'number' ? (object[key] as number) * 1.5 : object[key];
    const scaleNested = (key: string, keys: string[]) => {
      const nested = object[key];
      if (!nested || typeof nested !== 'object') return nested;
      return Object.fromEntries(Object.entries(nested as Record<string, unknown>).map(([name, nestedValue]) => [name, keys.includes(name) && typeof nestedValue === 'number' ? nestedValue * 1.5 : nestedValue]));
    };
    const next: Record<string, unknown> = {
      ...object,
      x: scale('x'), y: scale('y'), width: scale('width'), height: scale('height'),
      fontSize: scale('fontSize'), padding: scale('padding'), letterSpacing: scale('letterSpacing'), strokeWidth: scale('strokeWidth'),
      textShadow: scaleNested('textShadow', ['offsetX', 'offsetY', 'blur']),
      textStroke: scaleNested('textStroke', ['width']),
      dropShadow: scaleNested('dropShadow', ['offsetX', 'offsetY', 'blur', 'spread']),
    };
    if (isYouTubeThumbnail && isSourceThumbnail) {
      next.x = 0; next.y = 0; next.width = CANONICAL_CANVAS_WIDTH; next.height = CANONICAL_CANVAS_HEIGHT; next.scaleX = 1; next.scaleY = 1;
      if (sessionSourceThumbnail) next.src = sessionSourceThumbnail;
    }
    return next;
  };

  // Never carry the previous cover's canvas into a newly opened project.
  // Empty sessions must explicitly clear the store as well.
  const objects = sourceObjects
    .filter((value) => {
      const object = value as { id?: unknown; name?: unknown };
      const id = String(object.id || '').trim().toLowerCase();
      const name = String(object.name || '').trim().toLowerCase();
      // The old bootstrap document created an unwanted purple placeholder
      // called "Layer 0". It is not user artwork and must not be restored.
      return !(/^(layer[ _-]*0|layer0)$/.test(name) || /^(layer[ _-]*0|layer0)$/.test(id));
    })
    .map(scaleLegacyObject) as unknown as CanvasObject[];

  return { objects, width: normalizedWidth, height: normalizedHeight };
}
