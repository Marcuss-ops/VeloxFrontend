'use client';

import React from 'react';
import { Upload } from 'lucide-react';

/**
 * Full-screen drop overlay shown while a file drag is in progress.
 * Pure presentational — visibility is driven by the `isDragging` flag
 * owned by `useDragDropUpload`.
 */
export default function DragDropOverlay({ isDragging }: { isDragging: boolean }) {
  if (!isDragging) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center border-4 border-dashed border-black/20 bg-white/70 p-12 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex scale-110 flex-col items-center gap-4 rounded-3xl border border-black/10 bg-white p-8 shadow-2xl">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-black/[0.05] text-[#111111] animate-bounce">
          <Upload className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-[#111111]">Drop to Upload</h3>
          <p className="text-[#6e6e73]">Release your images to add them to the canvas</p>
        </div>
      </div>
    </div>
  );
}
