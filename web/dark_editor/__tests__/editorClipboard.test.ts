import { beforeEach, describe, expect, it } from 'vitest';
import { readEditorClipboard, writeEditorClipboard } from '@/lib/editorClipboard';
import type { CanvasObject } from '@/stores/editorStore';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}, configurable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });

const object: CanvasObject = {
  id: 'source', type: 'text', name: 'Titolo', x: 10, y: 20, width: 100, height: 40,
  rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
  text: 'Copia', fontSize: 40, fill: '#111111',
};

describe('editor clipboard', () => {
  beforeEach(() => storage.clear());

  it('persists a versioned deep copy between editor documents', () => {
    writeEditorClipboard([object]);
    const pasted = readEditorClipboard();
    expect(pasted).toEqual([object]);
    pasted[0].text = 'Modificato';
    expect(readEditorClipboard()[0].text).toBe('Copia');
  });

  it('rejects an incompatible clipboard version', () => {
    storage.set('instaeditor.canvas-clipboard.v1', JSON.stringify({ version: 999, objects: [object] }));
    expect(readEditorClipboard()).toEqual([]);
  });
});
