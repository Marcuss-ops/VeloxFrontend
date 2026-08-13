import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorTabsStore } from '@/stores/editorTabsStore';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
}, configurable: true });

describe('editor tabs store', () => {
  beforeEach(() => {
    storage.clear();
    useEditorTabsStore.setState({ tabs: [] });
  });

  it('keeps projects isolated and persists open tabs', () => {
    const { openTab, renameTab, closeTab } = useEditorTabsStore.getState();
    openTab({ id: 've-one', name: 'Uno' });
    openTab({ id: 've-two', name: 'Due' });
    renameTab('ve-one', 'Uno modificato');
    expect(useEditorTabsStore.getState().tabs.map((tab) => tab.id)).toEqual(['ve-one', 've-two']);
    expect(JSON.parse(storage.get('instaeditor.open-editor-tabs.v1') || '[]')[0].name).toBe('Uno modificato');
    closeTab('ve-one');
    expect(useEditorTabsStore.getState().tabs.map((tab) => tab.id)).toEqual(['ve-two']);
  });
});
