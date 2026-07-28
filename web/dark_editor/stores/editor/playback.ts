import type { StateCreator } from 'zustand';
import type { CanvasObject } from '../types';

/**
 * EditorPlaybackSlice owns the viewport state (canvas size, zoom, offsets)
 * + every visual-effect action (filter / text / shape) + the AI
 * `removeBackground` action.  Effect actions call `get().commitMutation` (on
 * the timeline slice) so they share the same history pipeline.
 */

export interface EditorPlaybackSlice {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;

  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;

  // Filter actions
  applyBlur: (id: string, intensity: number) => void;
  applySharpen: (id: string, intensity: number) => void;
  applyPixelation: (id: string, pixelSize: number) => void;
  applyAllFilters: (
    id: string,
    filters: { blur?: number; sharpen?: number; pixelation?: number },
  ) => void;
  clearFilters: (id: string) => void;

  // Advanced text effects actions
  applyTextShadow: (id: string, shadow: CanvasObject['textShadow']) => void;
  applyTextStroke: (id: string, stroke: CanvasObject['textStroke']) => void;
  applyTextGradient: (id: string, gradient: CanvasObject['textGradient']) => void;
  applyTextCurve: (id: string, curve: CanvasObject['textCurve']) => void;
  clearTextEffects: (id: string) => void;

  // Shape & image effects actions
  applyDropShadow: (id: string, shadow: CanvasObject['dropShadow']) => void;
  applyBorderRadius: (id: string, radius: number) => void;
  applyShapeGradient: (id: string, gradient: CanvasObject['shapeGradient']) => void;
  applyTexture: (id: string, texture: CanvasObject['texture']) => void;
  clearShapeEffects: (id: string) => void;

  // AI Actions
  removeBackground: (id: string) => Promise<void>;
}

import type { EditorStoreState } from './timeline';

export const createEditorPlaybackSlice: StateCreator<
  EditorStoreState,
  [],
  [],
  EditorPlaybackSlice
> = (set, get) => ({
  canvasWidth: 1920,
  canvasHeight: 1080,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,

  setCanvasSize: (width, height) => {
    set({ canvasWidth: width, canvasHeight: height });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setOffset: (x, y) => {
    set({ offsetX: x, offsetY: y });
  },

  applyBlur: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.blur = Math.max(0, Math.min(20, intensity));
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },

  applySharpen: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.sharpen = Math.max(0, Math.min(20, intensity));
        obj.blur = 0;
        obj.pixelation = 0;
      }
    });
  },

  applyPixelation: (id, pixelSize) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.pixelation = Math.max(0, Math.min(50, pixelSize));
        obj.blur = 0;
        obj.sharpen = 0;
      }
    });
  },

  applyAllFilters: (id, filters) => {
    const { updateObjectLive } = get();
    updateObjectLive(id, { ...filters });
  },

  clearFilters: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.blur = 0;
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },

  applyTextShadow: (id, shadow) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textShadow = shadow;
    });
  },

  applyTextStroke: (id, stroke) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textStroke = stroke;
    });
  },

  applyTextGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textGradient = gradient;
    });
  },

  applyTextCurve: (id, curve) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.textCurve = curve;
    });
  },

  clearTextEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.textShadow = undefined;
        obj.textStroke = undefined;
        obj.textGradient = undefined;
        obj.textCurve = undefined;
      }
    });
  },

  applyDropShadow: (id, shadow) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.dropShadow = shadow;
    });
  },

  applyBorderRadius: (id, radius) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.borderRadius = Math.max(0, radius);
    });
  },

  applyShapeGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.shapeGradient = gradient;
    });
  },

  applyTexture: (id, texture) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) obj.texture = texture;
    });
  },

  clearShapeEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) {
        obj.dropShadow = undefined;
        obj.borderRadius = undefined;
        obj.shapeGradient = undefined;
        obj.texture = undefined;
      }
    });
  },

  removeBackground: async (id) => {
    const { objects, updateObject } = get();
    const obj = objects[id];
    if (!obj || obj.type !== 'image' || !obj.src) return;

    updateObject(id, { processing: true });

    try {
      const { removeBackground, extractFilenameFromPath } = await import('@/lib/api');
      const filename = extractFilenameFromPath(obj.src);

      const response = await removeBackground({ filename, async: false });

      if (response.filename) {
        updateObject(id, { src: response.filename, processing: false });
      } else {
        throw new Error(response.error || 'Failed to remove background');
      }
    } catch (error) {
      console.error('Background removal failed:', error);
      updateObject(id, { processing: false });
    }
  },
});