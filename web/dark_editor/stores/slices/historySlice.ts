// stores/slices/historySlice.ts — Undo/redo machinery + the immer
// produceWithPatches helpers that the other slices call via get() to
// commit state changes. Extracted from stores/editorStore.ts (P1 of the
// editor-store-slices refactor).
//
// The slice factory signature keeps set/get fully typed against the
// COMPOSED EditorState — the slice doesn't need to know what other slices
// exist; it just hands patches back to immer and asks set/get to commit
// them. Cross-slice calls like `get().commitMutation(...)` inside
// objectSlice's addObject resolve at invocation time against the
// fully-composed store, which is the idiomatic Zustand pattern.

import type { StoreApi } from 'zustand';
import { produceWithPatches, applyPatches } from 'immer';
import type { Patch } from 'immer';
import type { EditorState } from '../editorStore';
import type { CanvasObject } from '../canvasObjectTypes';

export interface HistorySlice {
  // History patches (capped at 50 entries — pastPatches[0] is dropped on overflow)
  pastPatches: { patches: Patch[]; inversePatches: Patch[] }[];
  futurePatches: { patches: Patch[]; inversePatches: Patch[] }[];
  // Live-mutation buffer: while a drag/transform is in flight, patches
  // accumulate here; on commit (mouseup) they roll into pastPatches via
  // saveToHistory; on undo they get flushed by inversePatches replay.
  pendingPatches: Patch[];
  pendingInversePatches: Patch[];

  // Mutation commit hooks consumed by objectSlice + effectsSlice
  commitMutation: (recipe: (draft: CanvasObject[]) => void) => void;
  commitLiveMutation: (recipe: (draft: CanvasObject[]) => void) => void;

  // Standard undo/redo + the manual commit point for live-mutation cycles
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

const HISTORY_LIMIT = 50;

// Factory takes (set, get) directly so the parent can spread
// `...createHistorySlice(set, get)` inside its create<T>() body. set/get
// are typed against the COMPOSED EditorState — not just HistorySlice —
// which is what makes cross-slice calls like `get().commitMutation(...)`
// from objectSlice and effectsSlice work natively.
export const createHistorySlice = (
  set: StoreApi<EditorState>['setState'],
  get: StoreApi<EditorState>['getState']
): HistorySlice => ({
  pastPatches: [],
  futurePatches: [],
  pendingPatches: [],
  pendingInversePatches: [],

  commitMutation: (recipe) => {
    const { objects, pastPatches, pendingPatches, pendingInversePatches } = get();
    const [nextObjects, patches, inversePatches] = produceWithPatches(objects, recipe);

    if (patches.length === 0 && pendingPatches.length === 0) return;

    const finalPatches = [...pendingPatches, ...patches];
    const finalInversePatches = [...inversePatches, ...pendingInversePatches];

    const newPast = [...pastPatches, { patches: finalPatches, inversePatches: finalInversePatches }];
    if (newPast.length > HISTORY_LIMIT) newPast.shift();

    set({
      objects: nextObjects,
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },

  commitLiveMutation: (recipe) => {
    const { objects, pendingPatches, pendingInversePatches } = get();
    const [nextObjects, patches, inversePatches] = produceWithPatches(objects, recipe);

    if (patches.length === 0) return;

    set({
      objects: nextObjects,
      pendingPatches: [...pendingPatches, ...patches],
      pendingInversePatches: [...inversePatches, ...pendingInversePatches],
    });
  },

  undo: () => {
    const { pastPatches, futurePatches, objects, pendingPatches, pendingInversePatches } = get();
    let currentObjects = objects;

    if (pendingPatches.length > 0) {
      currentObjects = applyPatches(currentObjects, pendingInversePatches);
      set({ objects: currentObjects, pendingPatches: [], pendingInversePatches: [] });
      return;
    }

    if (pastPatches.length === 0) return;

    const lastEntry = pastPatches[pastPatches.length - 1];
    const prevObjects = applyPatches(currentObjects, lastEntry.inversePatches);

    set({
      objects: prevObjects,
      pastPatches: pastPatches.slice(0, -1),
      futurePatches: [lastEntry, ...futurePatches],
      selectedIds: [],
    });
  },

  redo: () => {
    const { futurePatches, pastPatches, objects, pendingPatches } = get();
    if (futurePatches.length === 0 || pendingPatches.length > 0) return;

    const nextEntry = futurePatches[0];
    const nextObjects = applyPatches(objects, nextEntry.patches);

    set({
      objects: nextObjects,
      pastPatches: [...pastPatches, nextEntry],
      futurePatches: futurePatches.slice(1),
    });
  },

  saveToHistory: () => {
    const { pendingPatches, pendingInversePatches, pastPatches } = get();
    if (pendingPatches.length === 0) return;
    const newPast = [...pastPatches, { patches: pendingPatches, inversePatches: pendingInversePatches }];
    if (newPast.length > HISTORY_LIMIT) newPast.shift();
    set({
      pastPatches: newPast,
      futurePatches: [],
      pendingPatches: [],
      pendingInversePatches: [],
    });
  },
});
