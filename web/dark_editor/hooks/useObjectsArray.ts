import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * Returns the editor objects as an ordered array, derived from the
 * normalized store state (objects Record + objectIds order).
 * Memoized to avoid re-renders when only a single object changes.
 */
export function useObjectsArray(): CanvasObject[] {
  return useEditorStore(
    useShallow((state) => {
      return state.objectIds.map((id) => state.objects[id]).filter((obj): obj is CanvasObject => !!obj);
    })
  );
}
