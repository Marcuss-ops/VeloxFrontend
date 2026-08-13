// stores/slices/objectSlice.ts — Canvas object CRUD + bulk lifecycle.
// Extracted from stores/editorStore.ts (P1 of the editor-store-slices
// refactor); selection/clipboard now live in selectionSlice and layer
// ordering in layerSlice.
//
// All mutations go through get().commitMutation / commitLiveMutation
// (historySlice) so every edit is undoable. Selection is updated inline
// (plain `set`) by the CRUD actions that affect it.
//
// The canvas is normalized: `objects` is a Record keyed by id (O(1) lookup)
// and `objectIds` holds the layer order (index 0 = back, last = front).
// Mutations operate on the combined { objects, objectIds } draft handed to
// them by commitMutation, so data and order stay in lockstep.

import type { StoreApi } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { EditorState } from '../editorStore';
import type { CanvasObject } from '../canvasObjectTypes';

export interface ObjectSlice {
  objects: Record<string, CanvasObject>;
  objectIds: string[];

  // Object CRUD
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  updateObjectLive: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;

  // Bulk actions
  loadObjects: (objects: CanvasObject[]) => void;
  clearCanvas: () => void;
}

export const createObjectSlice = (
  set: StoreApi<EditorState>['setState'],
  get: StoreApi<EditorState>['getState']
): ObjectSlice => ({
  objects: {},
  objectIds: [],

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

  loadObjects: (objects) => {
    const objectIds = objects.map((obj) => obj.id);
    const nextObjects: Record<string, CanvasObject> = {};
    for (const obj of objects) {
      nextObjects[obj.id] = obj;
    }
    set({
      objects: nextObjects,
      objectIds,
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
});
