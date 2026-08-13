// stores/slices/effectsSlice.ts — Per-object visual effects: focus filters
// (blur/sharpen/pixelation), advanced text effects (shadow, stroke,
// gradient, curve) and shape/image effects (drop shadow, radius, gradient,
// texture). Extracted from stores/editorStore.ts (P1 of the
// editor-store-slices refactor).
//
// Every effect is a commitMutation on the target object so it lands in
// undo history. applyAllFilters intentionally routes through
// updateObjectLive (no history entry per slider tick).

import type { StoreApi } from 'zustand';
import type { EditorState } from '../editorStore';
import type { CanvasObject, TextObject } from '../canvasObjectTypes';

export interface EffectsSlice {
  // Filter actions
  applyBlur: (id: string, intensity: number) => void;
  applySharpen: (id: string, intensity: number) => void;
  applyPixelation: (id: string, pixelSize: number) => void;
  applyAllFilters: (id: string, filters: { blur?: number; sharpen?: number; pixelation?: number }) => void;
  clearFilters: (id: string) => void;

  // Advanced text effects actions
  applyTextShadow: (id: string, shadow: TextObject['textShadow']) => void;
  applyTextStroke: (id: string, stroke: TextObject['textStroke']) => void;
  applyTextGradient: (id: string, gradient: TextObject['textGradient']) => void;
  applyTextCurve: (id: string, curve: TextObject['textCurve']) => void;
  clearTextEffects: (id: string) => void;

  // Shape & image effects actions
  applyDropShadow: (id: string, shadow: CanvasObject['dropShadow']) => void;
  applyBorderRadius: (id: string, radius: number) => void;
  applyShapeGradient: (id: string, gradient: CanvasObject['shapeGradient']) => void;
  applyTexture: (id: string, texture: CanvasObject['texture']) => void;
  clearShapeEffects: (id: string) => void;
}

export const createEffectsSlice = (
  set: StoreApi<EditorState>['setState'],
  get: StoreApi<EditorState>['getState']
): EffectsSlice => ({
  applyBlur: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.blur = Math.max(0, Math.min(20, intensity));
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },

  applySharpen: (id, intensity) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.sharpen = Math.max(0, Math.min(20, intensity));
        obj.blur = 0;
        obj.pixelation = 0;
      }
    });
  },

  applyPixelation: (id, pixelSize) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
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
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.blur = 0;
        obj.sharpen = 0;
        obj.pixelation = 0;
      }
    });
  },

  applyTextShadow: (id, shadow) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj && obj.type === 'text') obj.textShadow = shadow;
    });
  },

  applyTextStroke: (id, stroke) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj && obj.type === 'text') obj.textStroke = stroke;
    });
  },

  applyTextGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj && obj.type === 'text') obj.textGradient = gradient;
    });
  },

  applyTextCurve: (id, curve) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj && obj.type === 'text') obj.textCurve = curve;
    });
  },

  clearTextEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj && obj.type === 'text') {
        obj.textShadow = undefined;
        obj.textStroke = undefined;
        obj.textGradient = undefined;
        obj.textCurve = undefined;
      }
    });
  },

  applyDropShadow: (id, shadow) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.dropShadow = shadow;
    });
  },

  applyBorderRadius: (id, radius) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.borderRadius = Math.max(0, radius);
    });
  },

  applyShapeGradient: (id, gradient) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.shapeGradient = gradient;
    });
  },

  applyTexture: (id, texture) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) obj.texture = texture;
    });
  },

  clearShapeEffects: (id) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) {
        obj.dropShadow = undefined;
        obj.borderRadius = undefined;
        obj.shapeGradient = undefined;
        obj.texture = undefined;
      }
    });
  },
});
