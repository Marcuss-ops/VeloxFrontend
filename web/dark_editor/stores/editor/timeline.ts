import { v4 as uuidv4 } from 'uuid';
import { produceWithPatches, applyPatches, Patch, enablePatches } from 'immer';
import type { StateCreator } from 'zustand';
import type { CanvasObject } from '../types';

enablePatches();

/**
 * EditorTimelineSlice owns the canonical timeline surface:
 *   - normalized object storage (Record<id, CanvasObject> for O(1) lookups)
 *   - layer order (objectIds)
 *   - Immer-style commit recipes (commitMutation / commitLiveMutation / saveToHistory)
 *   - undo / redo
 *   - bulk load + clear
 *   - layer ordering (moveLayerUp/Down, bringToFront, sendToBack)
 *
 * Action signatures mirror the pre-refactor editorStore.ts so the existing
 * 30+ consumer components keep working without changes.
 */

export type HistoryEntry = { patches: Patch[]; inversePatches: Patch[] };

export interface EditorTimelineSlice {
  // Normalized canvas state
  objects: Record<string, CanvasObject>;
  objectIds: string[];

  // History
  pastPatches: HistoryEntry[];
  futurePatches: HistoryEntry[];
  pendingPatches: Patch[];
  pendingInversePatches: Patch[];

  // Bulk / per-object actions
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  updateObjectLive: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;

  // History actions
  commitMutation: (recipe: (draft: {
    objects: Record<string, CanvasObject>;
    objectIds: string[];
  }) => void) => void;
  commitLiveMutation: (recipe: (draft: {
    objects: Record<string, CanvasObject>;
    objectIds: string[];
  }) => void) => void;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Bulk actions
  loadObjects: (objects: CanvasObject[]) => void;
  clearCanvas: () => void;

  // Layer actions
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
}

// The combined store state. Slices cross-reference each other via get() —
// every slice's StateCreator is typed against this full state shape.
import type { EditorPlaybackSlice } from './playback';
import type { EditorSelectionSlice } from './selection';
export type EditorStoreState = EditorTimelineSlice & EditorPlaybackSlice & EditorSelectionSlice;

const HISTORY_LIMIT = 50;

export const createEditorTimelineSlice: StateCreator<
  EditorStoreState,
  [],
  [],
  EditorTimelineSlice
> = (set, get) => ({
  objects: {},
  objectIds: [],
  pastPatches: [],
  futurePatches: [],
  pendingPatches: [],
  pendingInversePatches: [],

  commitMutation: (recipe) => {
    const { objects, objectIds, pastPatches, pendingPatches, pendingInversePatches } = get();
    const [nextState, patches, inversePatches] = produceWithPatches(
      { objects, objectIds },
      recipe,
    );

    if (patches.length === 0 && pendingPatches.length === 0) return;

    const finalPatches = [...pendingPatches, ...patches];
    const finalInversePatches = [...inversePatches, ...pendingInversePatches];

    const newPast: HistoryEntry[] = [
      ...pastPatches,
      { patches: finalPatches, inversePatches: finalInversePatches },
    ];
    if (newPast.length > HISTORY_LIMIT) newPast.shift();

    set({
      objects: nextState.objects,
      objectIds: nextState.objectIds,
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  commitLiveMutation: (recipe) => {
    const { objects, objectIds, pendingPatches, pendingInversePatches } = get();
    const [nextState, patches, inversePatches] = produceWithPatches(
      { objects, objectIds },
      recipe,
    );

    if (patches.length === 0) return;

    set({
      objects: nextState.objects,
      objectIds: nextState.objectIds,
      pendingPatches: [...pendingPatches, ...patches],
      pendingInversePatches: [...inversePatches, ...pendingInversePatches],
    });
  },

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

  undo: () => {
    const { pastPatches, futurePatches, objects, objectIds, pendingPatches, pendingInversePatches } = get();
    const currentState = { objects, objectIds };

    if (pendingPatches.length > 0) {
      const nextState = applyPatches(currentState, pendingInversePatches);
      set({
        objects: nextState.objects,
        objectIds: nextState.objectIds,
        pendingPatches: [],
        pendingInversePatches: [],
      });
      return;
    }

    if (pastPatches.length === 0) return;

    const lastEntry = pastPatches[pastPatches.length - 1];
    const prevState = applyPatches(currentState, lastEntry.inversePatches);

    set({
      objects: prevState.objects,
      objectIds: prevState.objectIds,
      pastPatches: pastPatches.slice(0, -1),
      futurePatches: [lastEntry, ...futurePatches],
      selectedIds: [],
    });
  },

  redo: () => {
    const { futurePatches, pastPatches, objects, objectIds, pendingPatches } = get();
    if (futurePatches.length === 0 || pendingPatches.length > 0) return;

    const nextEntry = futurePatches[0];
    const currentState = { objects, objectIds };
    const nextState = applyPatches(currentState, nextEntry.patches);

    set({
      objects: nextState.objects,
      objectIds: nextState.objectIds,
      pastPatches: [...pastPatches, nextEntry],
      futurePatches: futurePatches.slice(1),
    });
  },

  saveToHistory: () => {
    const { pendingPatches, pendingInversePatches, pastPatches } = get();
    if (pendingPatches.length === 0) return;
    const newPast: HistoryEntry[] = [
      ...pastPatches,
      { patches: pendingPatches, inversePatches: pendingInversePatches },
    ];
    if (newPast.length > HISTORY_LIMIT) newPast.shift();
    set({
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  moveLayerUp: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index < draft.objectIds.length - 1 && index !== -1) {
        [draft.objectIds[index], draft.objectIds[index + 1]] = [
          draft.objectIds[index + 1],
          draft.objectIds[index],
        ];
      }
    });
  },

  moveLayerDown: (id) => {
    get().commitMutation((draft) => {
      const index = draft.objectIds.indexOf(id);
      if (index > 0 && index !== -1) {
        [draft.objectIds[index], draft.objectIds[index - 1]] = [
          draft.objectIds[index - 1],
          draft.objectIds[index],
        ];
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