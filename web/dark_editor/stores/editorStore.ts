// Backward-compat shim — keeps the legacy `import { ... } from
// '@/stores/editorStore'` surface working.  All new logic lives in the
// per-slice modules under ./editor/*; this file is a pure delegation layer.
import type { EditorStoreState } from './editor';

export {
  useEditorStore,
  editorStore,
  selectObjectsArray,
  selectSelectedIds,
  selectCanvasSize,
  type EditorStoreState,
} from './editor';
export type { CanvasObject } from './types';
export { getObjectsArrayFromState } from './editor/helpers';

// Legacy type alias used by some consumers that referenced EditorState in the
// pre-refactor API.
export type EditorState = EditorStoreState;