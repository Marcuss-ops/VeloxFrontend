// stores/slices/layerSlice.ts — Canvas layer ordering (z-order via the
// objectIds array: index 0 = back, last = front). Extracted from
// stores/slices/objectSlice.ts so the object CRUD slice stays focused on
// data. Each reorder is a commitMutation so it lands in undo history.

import type { StoreApi } from 'zustand';
import type { EditorState } from '../editorStore';

export interface LayerSlice {
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
}

export const createLayerSlice = (
  set: StoreApi<EditorState>['setState'],
  get: StoreApi<EditorState>['getState']
): LayerSlice => ({
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
