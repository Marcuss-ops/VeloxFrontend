// stores/slices/selectionSlice.ts — Canvas selection and clipboard.
// Extracted from stores/slices/objectSlice.ts so the object CRUD slice
// stays focused on data + layer order.
//
// Selection is plain `set` state (not undoable); the clipboard keeps an
// in-memory copy AND mirrors to localStorage so paste survives a reload.

import type { StoreApi } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { readEditorClipboard, writeEditorClipboard } from '@/lib/editorClipboard';
import type { EditorState } from '../editorStore';
import type { CanvasObject } from '../canvasObjectTypes';

export interface SelectionSlice {
  selectedIds: string[];
  clipboard: CanvasObject[];

  // Clipboard
  copySelected: () => void;
  pasteClipboard: () => void;

  // Selection
  selectObject: (id: string | null, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

export const createSelectionSlice = (
  set: StoreApi<EditorState>['setState'],
  get: StoreApi<EditorState>['getState']
): SelectionSlice => ({
  selectedIds: [],
  clipboard: [],

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
});
