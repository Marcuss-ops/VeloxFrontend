'use client';

import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import {
  Undo,
  Redo,
  Grid3x3,
  Magnet,
  ZoomIn,
} from 'lucide-react';
import { DockItem } from './DockItem';

/**
 * ZoomSection — history & view controls of the toolbar dock: undo, redo,
 * grid toggle, snap toggle and the zoom indicator/step. Extracted from
 * ToolbarDock.tsx.
 */
export function ZoomSection() {
  const {
    undo,
    redo,
    pastPatches,
    futurePatches,
    zoom,
    setZoom,
  } = useEditorStore();
  const {
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnapToGrid,
  } = useUIStore();

  const canUndo = pastPatches.length > 0;
  const canRedo = futurePatches.length > 0;

  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 ring-1 ring-black/[0.05] dark:bg-[#242832] dark:ring-white/10">
      <DockItem
        icon={<Undo className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label="Undo"
        onClick={undo}
        disabled={!canUndo}
      />
      <DockItem
        icon={<Redo className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label="Redo"
        onClick={redo}
        disabled={!canRedo}
      />
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
        icon={<ZoomIn className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        label={`${Math.round(zoom * 100)}%`}
        onClick={() => setZoom(zoom >= 1.5 ? 1 : Math.min(5, zoom * 1.25))}
        active={zoom !== 1}
      />
    </div>
  );
}
