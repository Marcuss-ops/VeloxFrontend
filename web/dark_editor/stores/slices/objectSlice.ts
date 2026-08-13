// stores/slices/objectSlice.ts — Canvas object CRUD, selection, clipboard
// and layer ordering. Extracted from stores/editorStore.ts (P1 of the
// editor-store-slices refactor).
//
// All mutations go through get().commitMutation / commitLiveMutation
// (historySlice) so every edit is undoable. Selection and clipboard are
// plain `set` updates.
//
// The canvas is normalized: `objects` is a Record keyed by id (O(1) lookup)
// and `objectIds` holds the layer order (index 0 = back, last = front).
// Mutations operate on the combined { objects, objectIds } draft handed to
// them by commitMutation, so data and order stay in lockstep.

import type { StoreApi } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { readEditorClipboard, writeEditorClipboard } from '@/lib/editorClipboard';
import type { EditorState } from '../editorStore';
import type { CanvasObject } from '../canvasObjectTypes';

export interface ObjectSlice {
  objects: Record<string, CanvasObject>;
  objectIds: string[];
  selectedIds: string[];
  clipboard: CanvasObject[];

  // Object CRUD
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  updateObjectLive: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;

  // Clipboard
  copySelected: () => void;
  pasteClipboard: () => void;

  // Selection
  selectObject: (id: string | null, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Bulk actions
  loadObjects: (objects: CanvasObject[]) => void;
  clearCanvas: () => void;

  // Layer actions
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
}

export const createObjectSlice = (
  set: StoreApi<EditorState>['setState'],
  get: StoreApi<EditorState>['getState']
): ObjectSlice => ({
  objects: {},
  objectIds: [],
  selectedIds: [],
  clipboard: [],

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

    // O(1) Record lookup per selected id — no linear scan of the canvas.
    const copiedObjects = selectedIds
      .map((id) => objects[id])
      .filter((obj): obj is CanvasObject => Boolean(obj))
      .map((obj) => JSON.parse(JSON.stringify(obj)) as CanvasObject);

    set({ clipboard: copiedObjects });
    writeEditorClipboard(copiedObjects);
  },

  pasteClipboard: () => {
    const storedClipboard = readEditorClipboard();
    const clipboard = storedClipboard.length > 0 ? storedClipboard : get().clipboard;
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
});
