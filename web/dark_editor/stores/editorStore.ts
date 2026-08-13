import { create } from 'zustand';
import { enablePatches } from 'immer';
import { createObjectSlice, type ObjectSlice } from './slices/objectSlice';
import { createHistorySlice, type HistorySlice } from './slices/historySlice';
import { createEffectsSlice, type EffectsSlice } from './slices/effectsSlice';

// Canvas object domain model (types + type guards). Re-exported here so the
// ~37 consumers importing `type CanvasObject` (etc.) from `@/stores/editorStore`
// keep working unchanged; the slices import the types directly from
// './canvasObjectTypes' to avoid a type-level cycle through the registry.
export * from './canvasObjectTypes';

enablePatches();

/**
 * Composed editor store. The implementation lives in the cohesive slices
 * under stores/slices/ (objectSlice: CRUD + selection + clipboard +
 * layering; historySlice: undo/redo + immer patch machinery; effectsSlice:
 * filters + text/shape effects). This file is the registry/composition
 * point: it defines the canvas view state and how the slices are merged
 * into the single store the UI subscribes to. The canvas object domain
 * types live in stores/canvasObjectTypes.ts.
 *
 * Note: `removeBackground` no longer lives here — the network I/O belongs
 * to the application layer (lib/api/mediaClient).
 */
export interface EditorState extends ObjectSlice, HistorySlice, EffectsSlice {
  // Canvas view state
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;

  // Canvas view actions
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Slice state + actions (spread order is irrelevant — no key overlaps)
  ...createObjectSlice(set, get),
  ...createHistorySlice(set, get),
  ...createEffectsSlice(set, get),

  // Canvas view state
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
}));
