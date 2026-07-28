import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { CanvasObject } from '../types';

/**
 * EditorSelectionSlice owns the selection + clipboard surface.
 *
 * Cross-slice reads: `copySelected` reads `objects` (timeline), `pasteClipboard`
 * invokes `commitMutation` (timeline) to insert new ids into the object
 * Record. TypeScript is happy because both slices are typed against the
 * combined `EditorStoreState`.
 */

export interface EditorSelectionSlice {
  selectedIds: string[];
  clipboard: CanvasObject[];

  selectObject: (id: string | null, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
}

import type { EditorStoreState } from './timeline';

export const createEditorSelectionSlice: StateCreator<
  EditorStoreState,
  [],
  [],
  EditorSelectionSlice
> = (set, get) => ({
  selectedIds: [],
  clipboard: [],

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

  copySelected: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;

    // Deep-clone via JSON to fully decouple from store state
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
});