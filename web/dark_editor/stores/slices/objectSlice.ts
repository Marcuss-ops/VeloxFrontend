// stores/slices/objectSlice.ts — Canvas object CRUD, selection, clipboard
// and layer ordering. Extracted from stores/editorStore.ts (P1 of the
// editor-store-slices refactor).
//
// All mutations go through get().commitMutation / commitLiveMutation
// (historySlice) so every edit is undoable. Selection and clipboard are
// plain `set` updates.

import type { StoreApi } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { readEditorClipboard, writeEditorClipboard } from '@/lib/editorClipboard';
import type { EditorState, CanvasObject } from '../editorStore';

export interface ObjectSlice {
  objects: CanvasObject[];
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
  objects: [],
  selectedIds: [],
  clipboard: [],

  addObject: (obj) => {
    get().commitMutation((draft) => {
      draft.push(obj);
    });
  },

  updateObject: (id, updates) => {
    get().commitMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) Object.assign(obj, updates);
    });
  },

  updateObjectLive: (id, updates) => {
    get().commitLiveMutation((draft) => {
      const obj = draft.find((o) => o.id === id);
      if (obj) Object.assign(obj, updates);
    });
  },

  deleteObject: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex(o => o.id === id);
      if (index !== -1) draft.splice(index, 1);
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
      for (let i = draft.length - 1; i >= 0; i--) {
        if (selectedSet.has(draft[i].id)) {
          draft.splice(i, 1);
        }
      }
    });
    set({ selectedIds: [] });
  },

  duplicateSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    const newIds: string[] = [];

    get().commitMutation((draft) => {
      const selectedSet = new Set(selectedIds);
      const toDuplicate = draft.filter((o) => selectedSet.has(o.id));
      for (const o of toDuplicate) {
        const newId = uuidv4();
        newIds.push(newId);
        draft.push({
          ...o,
          id: newId,
          x: o.x + 20,
          y: o.y + 20,
          name: o.name ? `${o.name} Copy` : 'Copy',
        });
      }
    });
    set({ selectedIds: newIds });
  },

  copySelected: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;

    // Copy the selected objects, decoupling them from the current state
    const copiedObjects = objects
      .filter((obj) => selectedIds.includes(obj.id))
      .map((obj) => JSON.parse(JSON.stringify(obj)));

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
        draft.push({
          ...obj,
          id: newId,
          x: obj.x + 20,
          y: obj.y + 20,
        });
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
    const { objects } = get();
    set({ selectedIds: objects.map((obj) => obj.id) });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  loadObjects: (objects) => {
    set({ objects, selectedIds: [], pastPatches: [], futurePatches: [], pendingPatches: [], pendingInversePatches: [] });
  },

  clearCanvas: () => {
    set({ objects: [], selectedIds: [], pastPatches: [], futurePatches: [], pendingPatches: [], pendingInversePatches: [] });
  },

  moveLayerUp: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index < draft.length - 1 && index !== -1) {
        [draft[index], draft[index + 1]] = [draft[index + 1], draft[index]];
      }
    });
  },

  moveLayerDown: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index > 0 && index !== -1) {
        [draft[index], draft[index - 1]] = [draft[index - 1], draft[index]];
      }
    });
  },

  bringToFront: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index < draft.length - 1 && index !== -1) {
        const [obj] = draft.splice(index, 1);
        draft.push(obj);
      }
    });
  },

  sendToBack: (id) => {
    get().commitMutation((draft) => {
      const index = draft.findIndex((obj) => obj.id === id);
      if (index > 0 && index !== -1) {
        const [obj] = draft.splice(index, 1);
        draft.unshift(obj);
      }
    });
  },
});
