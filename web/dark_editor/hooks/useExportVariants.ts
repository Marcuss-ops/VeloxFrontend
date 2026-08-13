'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useEditorStore, type TextObject } from '@/stores/editorStore';
import { selectOrderedObjects } from '@/lib/editorSelectors';
import { translateText } from '@/lib/api';
import { canvasStateSignature, captureEditorCanvasBlob, sha256Hex } from '@/lib/canvasPreview';
import type { UIState } from '@/stores/uiStore';
import {
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  type BatchVideo,
  type CanvasSnapshot,
  type LocalizedMetadata,
  type RenderedVariant,
} from '@/components/editor/export/types';

interface UseExportVariantsOptions {
  open: boolean;
  loadingPrivateVideos: boolean;
  targetVideos: BatchVideo[];
  translationLayer: TextObject | undefined;
  youtubeTitle: string;
  youtubeDescription: string;
  canvasRef?: RefObject<any>;
  snapshotRef: MutableRefObject<CanvasSnapshot | null>;
  snapshot: CanvasSnapshot | null;
  snapshotStale: boolean;
  captureSnapshot: () => Promise<CanvasSnapshot | null>;
  variantPreviews: Record<string, RenderedVariant>;
  variantPreviewsRef: MutableRefObject<Record<string, RenderedVariant>>;
  setVariantPreviews: Dispatch<SetStateAction<Record<string, RenderedVariant>>>;
  setTranslatedMetadata: Dispatch<SetStateAction<Record<string, LocalizedMetadata>>>;
  addToast: UIState['addToast'];
}

export interface UseExportVariantsReturn {
  isGeneratingPreviews: boolean;
  allSelectedVariantsReady: boolean;
  generateVariants: () => Promise<void>;
}

/**
 * useExportVariants — owns per-language variant generation, the per-video
 * assignment and the auto-generate-on-ready effect. Extracted from
 * useExportDialog.
 */
export function useExportVariants(opts: UseExportVariantsOptions): UseExportVariantsReturn {
  const {
    open,
    loadingPrivateVideos,
    targetVideos,
    translationLayer,
    youtubeTitle,
    youtubeDescription,
    canvasRef,
    snapshotRef,
    snapshot,
    snapshotStale,
    captureSnapshot,
    variantPreviews,
    variantPreviewsRef,
    setVariantPreviews,
    setTranslatedMetadata,
    addToast,
  } = opts;

  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);

  const allSelectedVariantsReady = useMemo(
    () => targetVideos.length > 0 && targetVideos.every((video) => {
      const variant = variantPreviews[video.video_id];
      return Boolean(variant && variant.snapshotId === snapshot?.id);
    }),
    [snapshot, targetVideos, variantPreviews]
  );

  const generateVariants = useCallback(async () => {
    if (targetVideos.length === 0) {
      addToast({ type: 'error', message: 'Il target video autorizzato non è disponibile.' });
      return;
    }
    setIsGeneratingPreviews(true);
    try {
      const liveState = useEditorStore.getState();
      const liveSignature = canvasStateSignature(selectOrderedObjects(liveState), EXPORT_WIDTH, EXPORT_HEIGHT);
      const currentSnapshot = !snapshotStale
        && snapshotRef.current?.signature === liveSignature
        ? snapshotRef.current
        : await captureSnapshot();
      if (!currentSnapshot) throw new Error('Impossibile creare lo snapshot del canvas.');
      const languages = [...new Set(targetVideos.map((video) => video.language?.trim().toLowerCase() || 'en'))].sort();
      const textObjects = translationLayer ? [translationLayer] : [];
      const variantsByLanguage = new Map<string, RenderedVariant>();
      const metadataNext: Record<string, LocalizedMetadata> = {};
      const baseTitle = youtubeTitle.trim();
      const baseDescription = youtubeDescription.trim();

      for (const language of languages) {
        const textOverrides: Record<string, string> = {};
        let title = baseTitle;
        let description = baseDescription;
        if (language !== 'en') {
          for (const object of textObjects) {
            const translated = await translateText({ text: object.text || '', target_language: language, kind: 'text' });
            if (!translated.translated_text) throw new Error(`Traduzione vuota per ${language}`);
            textOverrides[object.id] = translated.translated_text;
          }
          if (title) {
            const translated = await translateText({ text: title, target_language: language, kind: 'title' });
            title = translated.translated_text || title;
          }
          if (description) {
            const translated = await translateText({ text: description, target_language: language, kind: 'description' });
            description = translated.translated_text || description;
          }
        }
        metadataNext[language] = { title, description };
        const variantBlob = language === 'en'
          ? currentSnapshot.blob
          : await captureEditorCanvasBlob(canvasRef?.current?.getStage?.(), EXPORT_WIDTH, EXPORT_HEIGHT, 'image/png', undefined, { textOverrides });
        if (!variantBlob) throw new Error(`Impossibile generare la variante ${language}`);
        const sha256 = await sha256Hex(variantBlob);
        variantsByLanguage.set(language, {
          variantId: `${currentSnapshot.id}-${language}`,
          language,
          snapshotId: currentSnapshot.id,
          previewUrl: language === 'en' ? currentSnapshot.previewUrl : URL.createObjectURL(variantBlob),
          blob: variantBlob,
          sha256,
          title,
          description,
          translatedText: language === 'en' ? (translationLayer?.text || '') : (textOverrides[translationLayer?.id || ''] || translationLayer?.text || ''),
        });
      }

      const assignments: Record<string, RenderedVariant> = {};
      for (const video of targetVideos) {
        const language = video.language?.trim().toLowerCase() || 'en';
        const variant = variantsByLanguage.get(language);
        if (variant) assignments[video.video_id] = variant;
      }
      setTranslatedMetadata((current) => ({ ...current, ...metadataNext }));
      variantPreviewsRef.current = assignments;
      setVariantPreviews(assignments);
      addToast({ type: 'success', message: `Generate ${Object.keys(assignments).length} anteprime assegnate ai video selezionati.` });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Generazione anteprime non riuscita' });
    } finally {
      setIsGeneratingPreviews(false);
    }
  }, [addToast, canvasRef, captureSnapshot, setTranslatedMetadata, setVariantPreviews, snapshotRef, snapshotStale, targetVideos, translationLayer, variantPreviewsRef, youtubeDescription, youtubeTitle]);

  // As soon as the private-video list and the automatic selection are ready,
  // create the final per-language covers. The operator can still regenerate
  // them manually after changing the selected text layer.
  useEffect(() => {
    if (!open || loadingPrivateVideos || targetVideos.length === 0 || allSelectedVariantsReady || isGeneratingPreviews) return;
    const timer = window.setTimeout(() => void generateVariants(), 250);
    return () => window.clearTimeout(timer);
  }, [allSelectedVariantsReady, generateVariants, isGeneratingPreviews, loadingPrivateVideos, open, targetVideos]);

  return { isGeneratingPreviews, allSelectedVariantsReady, generateVariants };
}
