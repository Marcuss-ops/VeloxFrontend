import type { CanvasObject } from '@/stores/editorStore';

export interface EditorStateLike {
  objects: Record<string, CanvasObject>;
  selectedIds: string[];
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
