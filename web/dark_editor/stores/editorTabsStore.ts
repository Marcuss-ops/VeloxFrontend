import { create } from 'zustand';

export interface EditorTab {
  id: string;
  name: string;
  openedAt: number;
  lastActiveAt: number;
}

interface EditorTabsState {
  tabs: EditorTab[];
  hydrate: () => void;
  openTab: (tab: Pick<EditorTab, 'id' | 'name'>) => void;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
}

const STORAGE_KEY = 'instaeditor.open-editor-tabs.v1';

function persist(tabs: EditorTab[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch { /* optional */ }
}

export const useEditorTabsStore = create<EditorTabsState>((set, get) => ({
  tabs: [],
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const tabs = raw ? JSON.parse(raw) as EditorTab[] : [];
      if (Array.isArray(tabs)) set({ tabs: tabs.filter((tab) => tab?.id && tab?.name) });
    } catch { /* ignore corrupt browser state */ }
  },
  openTab: ({ id, name }) => {
    const now = Date.now();
    const tabs = get().tabs;
    const existing = tabs.find((tab) => tab.id === id);
    const next = existing
      ? tabs.map((tab) => tab.id === id ? { ...tab, name, lastActiveAt: now } : tab)
      : [...tabs, { id, name, openedAt: now, lastActiveAt: now }];
    set({ tabs: next });
    persist(next);
  },
  closeTab: (id) => {
    const next = get().tabs.filter((tab) => tab.id !== id);
    set({ tabs: next });
    persist(next);
  },
  renameTab: (id, name) => {
    const next = get().tabs.map((tab) => tab.id === id ? { ...tab, name } : tab);
    set({ tabs: next });
    persist(next);
  },
}));
