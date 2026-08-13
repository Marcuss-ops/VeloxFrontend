'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorTabsStore, type EditorTab } from '@/stores/editorTabsStore';
import { requestEditorFlush } from '@/lib/editorEvents';
import { editorReturnToPath, editorRuntimePath } from '@/lib/editor-runtime';

export interface UseEditorTabsReturn {
  openTabs: EditorTab[];
  switchEditorTab: (id: string) => Promise<void>;
  closeEditorTab: (id: string) => Promise<void>;
}

/**
 * Owns the editor multi-tab behavior:
 *   - hydration of the persisted tab list (localStorage).
 *   - switching tabs (flushes pending saves, then navigates to the sibling
 *     editor route with the current return_to context).
 *   - closing tabs (confirms unsaved changes for the active tab, flushes,
 *     then navigates to the last remaining tab or back to Copertine).
 *   - keeping the active tab label in sync with the project name pill.
 */
export function useEditorTabs(projectId: string, returnUrl: string): UseEditorTabsReturn {
  const router = useRouter();
  const { tabs: openTabs, hydrate: hydrateTabs, closeTab, renameTab } = useEditorTabsStore();
  const { currentProject, isDirty } = useProjectStore();

  useEffect(() => { hydrateTabs(); }, [hydrateTabs]);

  useEffect(() => {
    if (currentProject) renameTab(currentProject.id, currentProject.name || 'Senza nome');
  }, [currentProject, renameTab]);

  const switchEditorTab = useCallback(async (id: string) => {
    if (id === projectId) return;
    await requestEditorFlush();
    router.push(`${editorRuntimePath(`/editor/${encodeURIComponent(id)}`)}?return_to=${encodeURIComponent(editorReturnToPath())}`);
  }, [projectId, router]);

  const closeEditorTab = useCallback(async (id: string) => {
    if (id === projectId && isDirty && !window.confirm('Questa copertina ha modifiche non salvate. Chiuderla comunque?')) return;
    if (id === projectId) {
      await requestEditorFlush();
      const next = openTabs.filter((tab) => tab.id !== id);
      closeTab(id);
      const fallback = next[next.length - 1];
      if (fallback) {
        router.push(`${editorRuntimePath(`/editor/${encodeURIComponent(fallback.id)}`)}?return_to=${encodeURIComponent(editorReturnToPath())}`);
      } else {
        window.location.assign(returnUrl);
      }
    } else {
      closeTab(id);
    }
  }, [closeTab, isDirty, openTabs, projectId, returnUrl, router]);

  return {
    openTabs,
    switchEditorTab,
    closeEditorTab,
  };
}
