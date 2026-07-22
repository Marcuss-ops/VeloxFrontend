import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { useMemo } from 'react';
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

/**
 * Returns a Map from object id to object, useful for O(1) lookups in components.
 */
export function useObjectsMap(): Map<string, CanvasObject> {
  return useEditorStore(
    useShallow((state) => {
      const map = new Map<string, CanvasObject>();
      for (const id of state.objectIds) {
        const obj = state.objects[id];
        if (obj) map.set(id, obj);
      }
      return map;
    })
  );
}
