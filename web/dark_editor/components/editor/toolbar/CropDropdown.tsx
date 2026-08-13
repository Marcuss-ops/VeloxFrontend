'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { Crop } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

/**
 * CropDropdown — the crop-mode menu of the toolbar dock (free / square /
 * circle). Extracted from ToolsSection.
 */
export function CropDropdown() {
  const { startCropEditing, addToast } = useUIStore();
  const { selectedIds } = useEditorStore();
  const objects = useObjectsArray();

  const selectedImage = objects.find((obj): obj is ImageObject => selectedIds.includes(obj.id) && obj.type === 'image') ?? null;

  const applyCropMode = (mode: 'free' | 'square' | 'circle') => {
    if (!selectedImage) {
      addToast({ type: 'warning', message: 'Seleziona prima un’immagine' });
      return;
    }
    startCropEditing(selectedImage.id, mode);
    addToast({
      type: 'info',
      message:
        mode === 'circle'
          ? 'Crop cerchio pronto: trascina i bordi e premi Invio'
          : mode === 'square'
            ? 'Crop quadrato pronto: trascina i bordi e premi Invio'
            : 'Crop libero pronto: trascina i bordi e premi Invio',
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`tool-button group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
            selectedImage?.cropMode && selectedImage.cropMode !== 'free'
              ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
              : 'text-black/60 hover:bg-black/[0.06] hover:text-black dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white'
          }`}
          title="Crop"
          aria-label="Crop"
          type="button"
        >
          <Crop className="h-[18px] w-[18px]" strokeWidth={1.8} />
          <span className="pointer-events-none absolute bottom-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#111111] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">Crop</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top">
        <DropdownMenuLabel>Crop</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => applyCropMode('free')}>
          Crop libero
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyCropMode('square')}>
          Crop quadrato
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyCropMode('circle')}>
          Crop cerchio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
