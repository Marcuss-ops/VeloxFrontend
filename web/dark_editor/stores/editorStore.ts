import { create } from 'zustand';
import { enablePatches } from 'immer';
import { createObjectSlice, type ObjectSlice } from './slices/objectSlice';
import { createHistorySlice, type HistorySlice } from './slices/historySlice';
import { createEffectsSlice, type EffectsSlice } from './slices/effectsSlice';
import { createViewSlice, type ViewSlice } from './slices/viewSlice';

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
 * filters + text/shape effects; viewSlice: canvas size/zoom/offset). This
 * file is the registry/composition point only. The canvas object domain
 * types live in stores/canvasObjectTypes.ts.
 *
 * Note: `removeBackground` no longer lives here — the network I/O belongs
 * to the application layer (lib/api/mediaClient).
 */
export interface EditorState extends ObjectSlice, HistorySlice, EffectsSlice, ViewSlice {}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Slice state + actions (spread order is irrelevant — no key overlaps)
  ...createObjectSlice(set, get),
  ...createHistorySlice(set, get),
  ...createEffectsSlice(set, get),
  ...createViewSlice(set, get),
}));
