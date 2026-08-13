'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export const SIDEBAR_WIDTH_KEY = 'instaeditor.editor-sidebar.width';
export const SIDEBAR_DEFAULT_WIDTH = 400;
export const SIDEBAR_MIN_WIDTH = 300;
export const SIDEBAR_MAX_WIDTH = 560;

export type EditorSidebarTab = 'design' | 'assets';

export interface UseEditorSidebarReturn {
  sidebarTab: EditorSidebarTab;
  setSidebarTab: React.Dispatch<React.SetStateAction<EditorSidebarTab>>;
  sidebarWidth: number;
  updateSidebarWidth: (width: number) => void;
  handleSidebarResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleSidebarResizeKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  handleSidebarEnter: () => void;
  handleSidebarLeave: () => void;
}

/**
 * Owns the right sidebar behavior: width (persisted, clamped, resizable via
 * pointer drag or keyboard), the auto-open/auto-hide cycle driven by canvas
 * selection, and the (currently dormant) Design/Asset tab state.
 *
 * The sidebar surface is anchored on the right, so dragging left makes it
 * wider (handleSidebarResizeStart mirrors the pointer delta accordingly).
 */
export function useEditorSidebar(): UseEditorSidebarReturn {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const sidebarTimerRef = useRef<number | null>(null);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<EditorSidebarTab>('design');

  const clearSidebarHideTimer = useCallback(() => {
    if (sidebarTimerRef.current) {
      window.clearTimeout(sidebarTimerRef.current);
      sidebarTimerRef.current = null;
    }
  }, []);

  const scheduleSidebarAutoHide = useCallback(() => {
    clearSidebarHideTimer();
    sidebarTimerRef.current = window.setTimeout(() => {
      setSidebarPinned(false);
      sidebarTimerRef.current = null;
    }, 5000);
  }, [clearSidebarHideTimer]);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (Number.isFinite(stored)) {
        setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, stored)));
      }
    } catch {
      // localStorage is optional in private browsing.
    }
  }, []);

  const updateSidebarWidth = useCallback((width: number) => {
    const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
    setSidebarWidth(next);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
    } catch {
      // Keep the resize usable when storage is unavailable.
    }
  }, []);

  const handleSidebarResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    clearSidebarHideTimer();
    setSidebarPinned(true);
    sidebarResizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: PointerEvent) => {
      const start = sidebarResizeRef.current;
      if (!start) return;
      // The sidebar is anchored on the right, so dragging left makes it wider.
      updateSidebarWidth(start.startWidth + start.startX - moveEvent.clientX);
    };
    const handleEnd = () => {
      sidebarResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
  }, [clearSidebarHideTimer, sidebarWidth, updateSidebarWidth]);

  const handleSidebarResizeKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 20;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateSidebarWidth(sidebarWidth + step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateSidebarWidth(sidebarWidth - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateSidebarWidth(SIDEBAR_MIN_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateSidebarWidth(SIDEBAR_MAX_WIDTH);
    }
  }, [sidebarWidth, updateSidebarWidth]);

  // Auto-open sidebar when an object is selected, then hide it after five
  // seconds without pointer interaction. Hovering the visible handle/sidebar
  // cancels the timer and keeps it open while the user works.
  useEffect(() => {
    if (selectedIds.length > 0) {
      clearSidebarHideTimer();
      setSidebarPinned(true);
      scheduleSidebarAutoHide();
    } else {
      clearSidebarHideTimer();
      setSidebarPinned(false);
    }
    return () => {
      clearSidebarHideTimer();
    };
  }, [clearSidebarHideTimer, scheduleSidebarAutoHide, selectedIds]);

  const handleSidebarEnter = () => {
    clearSidebarHideTimer();
    setSidebarPinned(true);
  };

  const handleSidebarLeave = () => {
    scheduleSidebarAutoHide();
  };

  return {
    sidebarTab,
    setSidebarTab,
    sidebarWidth,
    updateSidebarWidth,
    handleSidebarResizeStart,
    handleSidebarResizeKeyDown,
    handleSidebarEnter,
    handleSidebarLeave,
  };
}
