import { create } from 'zustand';

import {
  createEditorTimelineSlice,
  type EditorStoreState,
  type HistoryEntry,
} from './timeline';
import {
  createEditorPlaybackSlice,
  type EditorPlaybackSlice,
} from './playback';
import {
  createEditorSelectionSlice,
  type EditorSelectionSlice,
} from './selection';
import { getObjectsArrayFromState } from './helpers';

export type { EditorStoreState, HistoryEntry };
export type { EditorPlaybackSlice };
export type { EditorSelectionSlice };

/**
 * Composed editor store hook. The three slices are merged into one
 * `EditorStoreState` so consumers can call `useEditorStore((s) => s.objects)`
 * exactly as before. Cross-slice reads/writes work via `get()` typed against
 * the merged state.
 */
export const useEditorStore = create<EditorStoreState>()((set, get, api) => ({
  ...createEditorTimelineSlice(set, get, api),
  ...createEditorPlaybackSlice(set, get, api),
  ...createEditorSelectionSlice(set, get, api),
}));

// Backward-compat alias (some callers may reference the camelCase name)
export const editorStore = useEditorStore;

// Selector helpers (pure functions — handy for components that prefer
// selectors over per-call hook subscriptions).
export const selectObjectsArray = (s: EditorStoreState) =>
  getObjectsArrayFromState(s.objects, s.objectIds);

export const selectSelectedIds = (s: EditorStoreState) => s.selectedIds;
export const selectCanvasSize = (s: EditorStoreState) => ({
  width: s.canvasWidth,
  height: s.canvasHeight,
});