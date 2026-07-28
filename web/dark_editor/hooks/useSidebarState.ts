// hooks/useSidebarState.ts — Sidebar slide-out + tab state, extracted from
// EditorSidebar.tsx (commit 1 of 3 in the sidebar refactor). Subscribes only
// to selectedIds in useEditorStore to drive the auto-pin effect; all other
// state is local. Consumed by EditorSidebar.tsx (commit 1) and will pass
// through SidebarTabRouter (commit 2) without re-subscription.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export type SidebarTab = 'design' | 'templates' | 'assets';

// 4s keeps auto-hide parity with the hover-on pinned state, so a user
// returning to the canvas after a selection doesn't snap-shut mid-edit.
const SIDEBAR_AUTO_HIDE_MS = 4000;

export interface UseSidebarStateReturn {
  sidebarTab: SidebarTab;
  setSidebarTab: React.Dispatch<React.SetStateAction<SidebarTab>>;
  sidebarPinned: boolean;
  handleSidebarEnter: () => void;
  handleSidebarLeave: () => void;
}

export function useSidebarState(): UseSidebarStateReturn {
  // Subscribe only to selectedIds (not the whole editor store) — selection
  // is the only trigger for the auto-pin effect; saving whole-store
  // subscribes would re-render the sidebar on every property edit / undo.
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('design');
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-open sidebar when an object is selected, close after 4s idle.
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSidebarPinned(true);
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
      sidebarTimerRef.current = setTimeout(
        () => setSidebarPinned(false),
        SIDEBAR_AUTO_HIDE_MS
      );
    } else {
      setSidebarPinned(false);
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    }
    return () => {
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    };
  }, [selectedIds]);

  // Pointer-only — touches only the ref, so a plain fn is enough.
  const handleSidebarEnter = () => {
    if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
  };

  const handleSidebarLeave = useCallback(() => {
    if (selectedIds.length > 0) {
      sidebarTimerRef.current = setTimeout(
        () => setSidebarPinned(false),
        SIDEBAR_AUTO_HIDE_MS
      );
    } else {
      setSidebarPinned(false);
    }
  }, [selectedIds]);

  // Memoize the result so consumers don't re-render on every parent render;
  // zustand returns a new selectedIds array on each mutation unless shallow
  // equality is opt-in, so an unmemoised object would defeat the selector.
  // setSidebarTab is omitted by React convention (useState dispatchers are
  // guaranteed stable); handleSidebarEnter is a plain fn recreated each
  // render and only touches a ref, so it is intentionally excluded too.
  return useMemo(
    () => ({
      sidebarTab,
      setSidebarTab,
      sidebarPinned,
      handleSidebarEnter,
      handleSidebarLeave,
    }),
    [sidebarTab, sidebarPinned, handleSidebarLeave]
  );
}
