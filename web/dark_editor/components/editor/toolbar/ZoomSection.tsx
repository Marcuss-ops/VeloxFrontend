'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import {
  Grid3x3,
  Magnet,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DockItem } from './DockItem';

/**
 * ZoomSection — view controls of the toolbar dock: grid toggle, snap toggle
 * and fit-to-screen. Undo/redo intentionally use the keyboard
 * shortcuts Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z instead of dock buttons.
 * Extracted from
 * ToolbarDock.tsx.
 */
export function ZoomSection() {
  const {
    setZoom,
  } = useEditorStore();
  const {
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnapToGrid,
  } = useUIStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const handleFitToScreen = async () => {
    setZoom(1);
    useEditorStore.getState().setOffset(0, 0);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Some embedded browsers deny fullscreen; the fit/reset still applies.
    }
  };

  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 ring-1 ring-black/[0.05] dark:bg-[#242832] dark:ring-white/10">
      <span
        className="hidden select-none px-2 text-[10px] font-semibold tracking-tight text-black/40 sm:inline dark:text-white/35"
        title="Annulla: Ctrl/Cmd+Z · Ripristina: Ctrl/Cmd+Shift+Z"
        aria-label="Scorciatoie annulla e ripristina: Ctrl o Command Z, Ctrl o Command Shift Z"
      >
        Ctrl/Cmd Z · ⇧Z
      </span>
      <DockItem
        icon={<Grid3x3 className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label="Grid"
        onClick={toggleGrid}
        active={showGrid}
      />
      <DockItem
        icon={<Magnet className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label="Snap"
        onClick={toggleSnapToGrid}
        active={snapToGrid}
      />
      <DockItem
        icon={isFullscreen
          ? <Minimize2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
          : <Maximize2 className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label={isFullscreen ? 'Esci schermo intero' : 'Copertina a schermo intero'}
        onClick={() => void handleFitToScreen()}
        active={isFullscreen}
      />
    </div>
  );
}
