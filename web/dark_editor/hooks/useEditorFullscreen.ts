'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

export interface UseEditorFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

/**
 * useEditorFullscreen — owns the editor's fullscreen layer.
 *
 * Tracks whether the browser is in fullscreen (via the `fullscreenchange`
 * event, which also covers the Escape key and OS chrome) and exposes a
 * toggle that flips in and out of fullscreen, surfacing a toast when the
 * browser refuses (e.g. an iframe without `allowfullscreen`).
 */
export function useEditorFullscreen(): UseEditorFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { addToast } = useUIStore();

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen is not available', error);
      addToast({ type: 'warning', message: 'Fullscreen non disponibile in questo browser' });
    }
  }, [addToast]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  return { isFullscreen, toggleFullscreen };
}
