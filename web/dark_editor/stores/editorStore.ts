import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { enablePatches } from 'immer';

import { createHistorySlice } from './slices/historySlice';
import type { HistorySlice } from './slices/historySlice';

enablePatches();

import type { CanvasObject } from './types';
export type { CanvasObject };

export interface EditorState extends HistorySlice {
  // Canvas state
  objects: Record<string, CanvasObject>; // O(1) lookup by id
  objectIds: string[]; // layer order
  selectedIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;

  // Clipboard
  clipboard: CanvasObject[];

  // Actions
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  selectObject: (id: string | null, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;


  // Canvas actions
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;

  // Bulk actions
  loadObjects: (objects: CanvasObject[]) => void;
  clearCanvas: () => void;

  // Layer actions
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Filter actions
  applyBlur: (id: string, intensity: number) => void;
  applySharpen: (id: string, intensity: number) => void;
  applyPixelation: (id: string, pixelSize: number) => void;
  applyAllFilters: (id: string, filters: { blur?: number, sharpen?: number, pixelation?: number }) => void;
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

  // Custom additions
  updateObjectLive: (id: string, updates: Partial<CanvasObject>) => void;
}

// Helper to derive an ordered array from the normalized state
export function getObjectsArrayFromState(
  objects: Record<string, CanvasObject>,
  objectIds: string[]
): CanvasObject[] {
  return objectIds.map((id) => objects[id]).filter((obj): obj is CanvasObject => !!obj);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  objects: {},
  objectIds: [],
  selectedIds: [],
  canvasWidth: 1920,
  canvasHeight: 1080,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  clipboard: [],

  // Spread from historySlice (commit 1 of the editor-store-slices refactor).
  // Owns pastPatches/futurePatches/pendingPatches/pendingInversePatches +
  // commitMutation, commitLiveMutation, undo, redo, saveToHistory.
  ...createHistorySlice(set, get),

  // Actions
  addObject: (obj) => {
    get().commitMutation((draft) => {
      draft.objects[obj.id] = obj;
      draft.objectIds.push(obj.id);
    });
  },

  updateObject: (id, updates) => {
    get().commitMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) Object.assign(obj, updates);
    });
  },

  updateObjectLive: (id, updates) => {
    get().commitLiveMutation((draft) => {
      const obj = draft.objects[id];
      if (obj) Object.assign(obj, updates);
    });
  },

  deleteObject: (id) => {
    get().commitMutation((draft) => {
      delete draft.objects[id];
      const index = draft.objectIds.indexOf(id);
      if (index !== -1) draft.objectIds.splice(index, 1);
    });
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
    }
  },

  deleteSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    get().commitMutation((draft) => {
      const selectedSet = new Set(selectedIds);
      for (const id of selectedIds) {
        delete draft.objects[id];
      }
      draft.objectIds = draft.objectIds.filter((objId) => !selectedSet.has(objId));
    });
    set({ selectedIds: [] });
  },

  duplicateSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    const newIds: string[] = [];

    get().commitMutation((draft) => {
      for (const id of selectedIds) {
        const o = draft.objects[id];
        if (!o) continue;
        const newId = uuidv4();
        newIds.push(newId);
        draft.objects[newId] = {
          ...o,
          id: newId,
          x: o.x + 20,
          y: o.y + 20,
          name: o.name ? `${o.name} Copy` : 'Copy',
        };
        draft.objectIds.push(newId);
      }
    });
    set({ selectedIds: newIds });
  },

  copySelected: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;

    // Copy the selected objects, decoupling them from the current state
    const copiedObjects = selectedIds
      .map((id) => objects[id])
      .filter((obj): obj is CanvasObject => !!obj)
      .map((obj) => JSON.parse(JSON.stringify(obj)));

    set({ clipboard: copiedObjects });
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;

    const newIds: string[] = [];
    get().commitMutation((draft) => {
      for (const obj of clipboard) {
        const newId = uuidv4();
        newIds.push(newId);
        draft.objects[newId] = {
          ...obj,
          id: newId,
          x: obj.x + 20,
          y: obj.y + 20,
        };
        draft.objectIds.push(newId);
      }
    });

    set({ selectedIds: newIds });
  },

  selectObject: (id, addToSelection = false) => {
    const { selectedIds } = get();
    if (id === null) {
      set({ selectedIds: [] });
    } else if (addToSelection) {
      if (selectedIds.includes(id)) {
        set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
      } else {
        set({ selectedIds: [...selectedIds, id] });
      }
    } else {
      set({ selectedIds: [id] });
    }
  },

  selectAll: () => {
    const { objectIds } = get();
    set({ selectedIds: [...objectIds] });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  setCanvasSize: (width, height) => {
    set({ canvasWidth: width, canvasHeight: height });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setOffset: (x, y) => {
    set({ offsetX: x, offsetY: y });
  },

  loadObjects: (objects) => {
    const nextIds = objects.map((obj) => obj.id);
    const nextObjects: Record<string, CanvasObject> = {};
    for (const obj of objects) {
      nextObjects[obj.id] = obj;
    }
    set({
      objects: nextObjects,
      objectIds: nextIds,
      selectedIds: [],
      pastPatches: [],
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  clearCanvas: () => {
    set({
      objects: {},
      objectIds: [],
      selectedIds: [],
      pastPatches: [],
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  moveLayerUp: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index < draft.objectIds.length - 1 && index !== -1) {
        [draft.objectIds[index], draft.objectIds[index + 1]] = [draft.objectIds[index + 1], draft.objectIds[index]];
      }
    });
  },

  moveLayerDown: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index > 0 && index !== -1) {
        [draft.objectIds[index], draft.objectIds[index - 1]] = [draft.objectIds[index - 1], draft.objectIds[index]];
      }
    });
  },

  bringToFront: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index < draft.objectIds.length - 1 && index !== -1) {
        const [objId] = draft.objectIds.splice(index, 1);
        draft.objectIds.push(objId);
      }
    });
  },

  sendToBack: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index > 0 && index !== -1) {
        const [objId] = draft.objectIds.splice(index, 1);
        draft.objectIds.unshift(objId);
      }
    });
  },

  // Filter actions
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

  // Advanced text effects actions
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

  // Shape & image effects actions
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

    // Set processing state
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

      // You could show a toast here if you had a toast store
    }
  },

}));
