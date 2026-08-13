'use client';

import { useCallback, useState } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { captureEditorCanvasBlob, sha256Hex } from '@/lib/canvasPreview';
import type { TextObject } from '@/stores/editorStore';
import type { UIState } from '@/stores/uiStore';
import { EXPORT_WIDTH, EXPORT_HEIGHT, type CanvasSnapshot, type RenderedVariant } from '@/components/editor/export/types';

interface UseExportVariantEditOptions {
  canvasRef?: RefObject<any>;
  snapshotRef: MutableRefObject<CanvasSnapshot | null>;
  translationLayer: TextObject | undefined;
  variantPreviews: Record<string, RenderedVariant>;
  setVariantPreviews: Dispatch<SetStateAction<Record<string, RenderedVariant>>>;
  addToast: UIState['addToast'];
}

export interface UseExportVariantEditReturn {
  editingVideoId: string | null;
  setEditingVideoId: Dispatch<SetStateAction<string | null>>;
  editingDraft: { title: string; description: string; coverText: string } | null;
  setEditingDraft: Dispatch<SetStateAction<{ title: string; description: string; coverText: string } | null>>;
  isSavingVariantEdit: boolean;
  saveVariantEdit: () => Promise<void>;
}

/**
 * useExportVariantEdit — owns the per-video draft and the re-render of the
 * edited cover. Extracted from useExportDialog.
 */
export function useExportVariantEdit(opts: UseExportVariantEditOptions): UseExportVariantEditReturn {
  const { canvasRef, snapshotRef, translationLayer, variantPreviews, setVariantPreviews, addToast } = opts;

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ title: string; description: string; coverText: string } | null>(null);
  const [isSavingVariantEdit, setIsSavingVariantEdit] = useState(false);

  const saveVariantEdit = useCallback(async () => {
    if (!editingVideoId || !editingDraft || !translationLayer || !snapshotRef.current) return;
    const currentVariant = variantPreviews[editingVideoId];
    if (!currentVariant) return;
    setIsSavingVariantEdit(true);
    try {
      const blob = await captureEditorCanvasBlob(
        canvasRef?.current?.getStage?.(),
        EXPORT_WIDTH,
        EXPORT_HEIGHT,
        'image/png',
        undefined,
        { textOverrides: { [translationLayer.id]: editingDraft.coverText } },
      );
      if (!blob) throw new Error('Impossibile aggiornare la copertina.');
      const sha256 = await sha256Hex(blob);
      setVariantPreviews((current) => ({
        ...current,
        [editingVideoId]: {
          ...currentVariant,
          blob,
          previewUrl: URL.createObjectURL(blob),
          sha256,
          title: editingDraft.title,
          description: editingDraft.description,
          translatedText: editingDraft.coverText,
        },
      }));
      setEditingVideoId(null);
      setEditingDraft(null);
      addToast({ type: 'success', message: 'Variante aggiornata per il target autorizzato.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Modifica variante non riuscita' });
    } finally {
      setIsSavingVariantEdit(false);
    }
  }, [addToast, canvasRef, editingDraft, editingVideoId, setVariantPreviews, snapshotRef, translationLayer, variantPreviews]);

  return { editingVideoId, setEditingVideoId, editingDraft, setEditingDraft, isSavingVariantEdit, saveVariantEdit };
}
