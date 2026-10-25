'use client';

import { ChevronDown, Crop } from 'lucide-react';
import { useUIStore, type CropMode } from '@/stores/uiStore';
import { useEditorStore, type ImageObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

/**
 * The main Crop button starts a free rectangular crop immediately. The arrow
 * offers the fixed-ratio and lasso modes without making the primary action a
 * menu that appears to do nothing.
 */
export function CropDropdown() {
  const { startCropEditing, addToast, cropEditingId } = useUIStore();
  const { selectedIds } = useEditorStore();
  const objects = useObjectsArray();

  const selectedImage = objects.find(
    (obj): obj is ImageObject => selectedIds.includes(obj.id) && obj.type === 'image',
  ) ?? null;

  const applyCropMode = (mode: CropMode) => {
    if (!selectedImage) {
      addToast({ type: 'warning', message: 'Seleziona prima un’immagine' });
      return;
    }

    startCropEditing(selectedImage.id, mode);
    addToast({
      type: 'info',
      message: mode === 'lasso'
        ? 'Crop lasso pronto: disegna sull’immagine e rilascia per applicare'
        : `Crop ${mode === 'free' ? 'libero' : mode === 'square' ? 'quadrato' : 'cerchio'} pronto: ridimensiona l’area e premi Invio`,
    });
  };

  return (
    <div className="flex h-10 shrink-0 overflow-hidden rounded-xl">
      <button
        className={`tool-button group relative flex h-10 w-10 items-center justify-center transition-all ${
          cropEditingId === selectedImage?.id
            ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
            : 'text-black/60 hover:bg-black/[0.06] hover:text-black dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white'
        }`}
        title="Crop libero"
        aria-label="Crop libero"
        type="button"
        onClick={() => applyCropMode('free')}
      >
        <Crop className="h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="pointer-events-none absolute bottom-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#111111] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
          Crop libero
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-10 w-6 items-center justify-center text-black/50 transition-colors hover:bg-black/[0.06] hover:text-black dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
            title="Altre modalità crop"
            aria-label="Altre modalità crop"
            type="button"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top">
          <DropdownMenuLabel>Modalità crop</DropdownMenuLabel>
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
          <DropdownMenuItem onClick={() => applyCropMode('lasso')}>
            Crop lasso
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
