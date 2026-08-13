import type { CanvasObject } from '@/stores/editorStore';

export const EDITOR_CLIPBOARD_VERSION = 1;
const STORAGE_KEY = 'instaeditor.canvas-clipboard.v1';

type StoredClipboard = {
  version: number;
  objects: CanvasObject[];
  copiedAt: string;
};

export function writeEditorClipboard(objects: CanvasObject[]): void {
  if (typeof window === 'undefined' || objects.length === 0) return;
  const payload: StoredClipboard = {
    version: EDITOR_CLIPBOARD_VERSION,
    objects: JSON.parse(JSON.stringify(objects)) as CanvasObject[],
    copiedAt: new Date().toISOString(),
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* clipboard remains in memory */ }
}

export function readEditorClipboard(): CanvasObject[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<StoredClipboard> | null;
    if (parsed?.version !== EDITOR_CLIPBOARD_VERSION || !Array.isArray(parsed.objects)) return [];
    return JSON.parse(JSON.stringify(parsed.objects)) as CanvasObject[];
  } catch {
    return [];
  }
}
