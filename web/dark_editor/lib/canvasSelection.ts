import type { CanvasObject } from '@/stores/editorStore';

/**
 * Build a Set from selected ids so per-object lookup in render loops is O(1).
 */
export function buildSelectedIdSet(selectedIds: string[]): Set<string> {
  return new Set(selectedIds);
}

/**
 * Find the object currently being edited from the ordered array of objects.
 */
export function findEditingObject(
  objects: CanvasObject[],
  editingId: string | null
): CanvasObject | null {
  if (!editingId) return null;
  return objects.find((obj) => obj.id === editingId) ?? null;
}
