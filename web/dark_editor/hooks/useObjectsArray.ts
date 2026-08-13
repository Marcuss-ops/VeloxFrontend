'use client';

import { useEditorStore, type CanvasObject } from '@/stores/editorStore';
import { selectOrderedObjects } from '@/lib/editorSelectors';
import { useShallow } from 'zustand/react/shallow';

/**
 * Returns the editor objects as an ordered array, derived from the
 * normalized store state (objects Record + objectIds order). Memoized via
 * useShallow so components only re-render when an object reference actually
 * changes, not on every store write.
 */
export function useObjectsArray(): CanvasObject[] {
  return useEditorStore(useShallow(selectOrderedObjects));
}
