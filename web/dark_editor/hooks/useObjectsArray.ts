import { useEditorStore, type CanvasObject } from '@/stores/editorStore';

/**
 * Returns the editor objects as an ordered array, derived from the
 * normalized store state (objects Record + objectIds order).
 * Memoized to avoid re-renders when only a single object changes.
 */
export function useObjectsArray(): CanvasObject[] {
  return useEditorStore((state) => state.objects);
}
