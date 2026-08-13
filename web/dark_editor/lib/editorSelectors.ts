import type { CanvasObject } from '@/stores/editorStore';

export interface EditorStateLike {
  objects: Record<string, CanvasObject>;
  objectIds: string[];
  selectedIds: string[];
}

/**
 * Derive the ordered canvas array (index 0 = back, last = front) from the
 * normalized store state. Used by rendering, export and any consumer that
 * needs layer order without linear lookups.
 */
export function selectOrderedObjects(state: EditorStateLike): CanvasObject[] {
  return state.objectIds
    .map((id) => state.objects[id])
    .filter((obj): obj is CanvasObject => Boolean(obj));
}

export function selectCropTarget(
  state: EditorStateLike,
  cropEditingId: string | null
): CanvasObject | null {
  if (!cropEditingId) return null;
  const obj = state.objects[cropEditingId];
  return obj?.type === 'image' ? obj : null;
}

export function selectSingleSelectedObject(state: EditorStateLike): CanvasObject | null {
  if (state.selectedIds.length !== 1) return null;
  return state.objects[state.selectedIds[0]] ?? null;
}
