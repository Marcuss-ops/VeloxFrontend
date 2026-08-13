'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore, type ImageObject, type TextObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { selectOrderedObjects } from '@/lib/editorSelectors';
import { useProjectStore } from '@/stores/projectStore';
import { useBatchYouTubeTargets } from '@/hooks/useBatchYouTubeTargets';
import { isScopedProjectId } from '@/lib/project-scope';
import { canvasStateSignature, captureEditorCanvasBlob, sha256Hex } from '@/lib/canvasPreview';
import { requestEditorFlush } from '@/lib/editorEvents';
import type { UseExportDialogReturn } from './useExportDialogTypes';
import {
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  type BatchVideo,
  type CanvasSnapshot,
  type ExportDialogProps,
  type RenderedVariant,
} from '@/components/editor/export/types';
import { convertToPng, downloadBlob, normalizedPlatformAccountId } from '@/components/editor/export/helpers';
import { useExportMetadata } from '@/hooks/useExportMetadata';
import { useExportVariants } from '@/hooks/useExportVariants';
import { useExportUpload } from '@/hooks/useExportUpload';
import { useExportVariantEdit } from '@/hooks/useExportVariantEdit';

export type { UseExportDialogReturn } from './useExportDialogTypes';

/**
 * Orchestrator for the export/publish flow. Owns the dialog/snapshot/targets
 * glue and composes the four extracted sub-hooks:
 *   - useExportMetadata  — title/description + translation
 *   - useExportVariants  — per-language variant generation
 *   - useExportUpload    — bulk apply to selected targets
 *   - useExportVariantEdit — per-video cover re-render
 *
 * The component keeps only the JSX; this hook keeps the behavior.
 */
export function useExportDialog({ isOpen, onClose, canvasRef }: ExportDialogProps): UseExportDialogReturn {
  const { showExportDialog, setExportDialog, isExporting, addToast } = useUIStore();
  const { selectedIds, updateObject } = useEditorStore();
  const objects = useObjectsArray();
  const { currentProject } = useProjectStore();

  const [selectedOnly, setSelectedOnly] = useState(false);

  // Export state
  const [, setExportComplete] = useState(false);
  const [, setExportedBlob] = useState<Blob | null>(null);
  const [, setExportedFilename] = useState<string>('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [showCoverPreview, setShowCoverPreview] = useState(true);
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null);
  const snapshotRef = useRef<CanvasSnapshot | null>(null);
  const [snapshotStale, setSnapshotStale] = useState(false);
  const [variantPreviews, setVariantPreviews] = useState<Record<string, RenderedVariant>>({});
  const variantPreviewsRef = useRef<Record<string, RenderedVariant>>({});
  const snapshotVersionRef = useRef(0);
  const sourceRepairPendingRef = useRef(false);

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  const selectedObject = objects.find((obj) => selectedIds[0] === obj.id);
  const textLayers = useMemo(
    () => objects.filter((object): object is TextObject => object.type === 'text' && Boolean(object.text)),
    [objects],
  );
  const [translationLayerId, setTranslationLayerId] = useState('');
  const translationLayer = textLayers.find((layer) => layer.id === translationLayerId)
    || (selectedObject?.type === 'text' ? selectedObject : undefined)
    || textLayers[0];
  const hasSelection = selectedIds.length > 0;
  const isEditorSession = Boolean(currentProject?.id && isScopedProjectId(currentProject.id));
  const {
    videos: privateVideos,
    visibleVideos: visiblePrivateVideos,
    latestPerChannel: latestPrivateVideos,
    selectedVideoIds,
    setSelectedVideoIds,
    selectedCount: selectedVideoCount,
    toggleVideo,
    selectAllVisible,
    deselectAll,
    selectLatest,
    resetSelection,
    loading: loadingPrivateVideos,
    error: youtubeTargetError,
    warnings: youtubeTargetWarnings,
  } = useBatchYouTubeTargets({
    enabled: open,
    currentProjectId: isEditorSession ? currentProject?.id : undefined,
    currentProjectName: currentProject?.name,
  });
  const sortedVideos = visiblePrivateVideos;
  const canvasSignature = useMemo(
    () => canvasStateSignature(objects, EXPORT_WIDTH, EXPORT_HEIGHT),
    [objects],
  );

  const targetVideos = useMemo(() => selectedVideoIds
    .map((videoId) => privateVideos.find((video) => video.video_id === videoId))
    .filter((video): video is BatchVideo => Boolean(video && normalizedPlatformAccountId(video) !== null)), [privateVideos, selectedVideoIds]);

  const captureSnapshot = useCallback(async (): Promise<CanvasSnapshot | null> => {
    // Read the store at capture time. Do not rely on the render that created
    // the dialog: a text edit/transform can land between that render and the
    // click on Export.
    const liveState = useEditorStore.getState();
    const liveSignature = canvasStateSignature(selectOrderedObjects(liveState), EXPORT_WIDTH, EXPORT_HEIGHT);
    const blob = await captureEditorCanvasBlob(canvasRef?.current?.getStage?.() ?? undefined, EXPORT_WIDTH, EXPORT_HEIGHT, 'image/png');
    if (!blob) return null;
    const sha256 = await sha256Hex(blob);
    const version = snapshotVersionRef.current + 1;
    snapshotVersionRef.current = version;
    const next: CanvasSnapshot = {
      id: `snapshot_${version}_${sha256.slice(0, 12)}`,
      version,
      signature: liveSignature,
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      blob,
      previewUrl: URL.createObjectURL(blob),
      sha256,
      editorSignature: liveSignature,
    };
    snapshotRef.current = next;
    setSnapshot(next);
    setSnapshotStale(false);
    setVariantPreviews({});
    setCoverPreviewUrl(next.previewUrl);
    return next;
  }, [canvasRef]);

  const captureSnapshotRef = useRef(captureSnapshot);
  useEffect(() => {
    captureSnapshotRef.current = captureSnapshot;
  }, [captureSnapshot]);

  const metadata = useExportMetadata({
    open,
    privateVideos,
    selectedVideoIds,
    targetVideos,
    visiblePrivateVideos,
    setVariantPreviews,
  });

  const variants = useExportVariants({
    open,
    loadingPrivateVideos,
    targetVideos,
    translationLayer,
    youtubeTitle: metadata.youtubeTitle,
    youtubeDescription: metadata.youtubeDescription,
    canvasRef,
    snapshotRef,
    snapshot,
    snapshotStale,
    captureSnapshot,
    variantPreviews,
    variantPreviewsRef,
    setVariantPreviews,
    setTranslatedMetadata: metadata.setTranslatedMetadata,
    addToast,
  });

  const upload = useExportUpload({
    open,
    targetVideos,
    variantPreviewsRef,
    currentProjectId: currentProject?.id,
    addToast,
  });

  const variantEdit = useExportVariantEdit({
    canvasRef,
    snapshotRef,
    translationLayer,
    variantPreviews,
    setVariantPreviews,
    addToast,
  });

  const selectedTextId = selectedObject?.type === 'text' ? selectedObject.id : undefined;
  const selectedText = selectedObject?.type === 'text' ? selectedObject.text : undefined;

  // Keep the translation layer in sync with the selected text object.
  useEffect(() => {
    if (selectedTextId && selectedText) {
      setTranslationLayerId(selectedTextId);
      setVariantPreviews({});
    }
  }, [selectedTextId, selectedText]);

  // Repair old sessions whose persisted source image is dead or missing.
  // The authorized project context is the same source used by the cards, so
  // the canvas and the project payload cannot silently diverge anymore.
  useEffect(() => {
    if (!isEditorSession || !currentProject?.id || privateVideos.length === 0) return;
    const source = objects.find((object): object is ImageObject => object.type === 'image' && object.name?.toLowerCase().includes('source thumbnail'));
    const currentVideoId = privateVideos.find((video) => video.video_id === currentProject.name.replace(/^YouTube thumbnail\s+/i, '').trim())?.video_id;
    const matched = currentVideoId ? privateVideos.find((video) => video.video_id === currentVideoId) : privateVideos[0];
    if (source && matched?.thumbnail && source.src !== matched.thumbnail) {
      sourceRepairPendingRef.current = true;
      updateObject(source.id, { src: matched.thumbnail });
    } else if (sourceRepairPendingRef.current && source && matched?.thumbnail && source.src === matched.thumbnail) {
      sourceRepairPendingRef.current = false;
      window.setTimeout(() => void captureSnapshot(), 150);
    }
  }, [captureSnapshot, currentProject?.id, currentProject?.name, isEditorSession, objects, privateVideos, updateObject]);

  // Mark the snapshot stale (and drop variants) when the live canvas diverges.
  useEffect(() => {
    if (!open || !snapshotRef.current) return;
    const liveState = useEditorStore.getState();
    const liveSignature = canvasStateSignature(selectOrderedObjects(liveState), EXPORT_WIDTH, EXPORT_HEIGHT);
    if (snapshotRef.current.signature !== liveSignature) {
      setSnapshotStale(true);
      setVariantPreviews({});
    }
  }, [canvasSignature, open]);

  // Load only the YouTube target data when the export dialog opens.
  useEffect(() => {
    if (open) {
      resetSelection();
      setExportComplete(false);
      setExportedBlob(null);
      setCoverPreviewUrl('');
      setShowCoverPreview(true);
      setSnapshot(null);
      snapshotRef.current = null;
      setSnapshotStale(false);
      setVariantPreviews({});
      variantPreviewsRef.current = {};
      let cancelled = false;
      void (async () => {
        await requestEditorFlush();
        // The flush covers keyboard, toolbar and programmatic openings; this
        // second frame wait covers the final React/Konva commit of the live canvas.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (!cancelled) await captureSnapshotRef.current();
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [open, resetSelection]);

  const handleExport = useCallback(async () => {
    const liveState = useEditorStore.getState();
    const liveSignature = canvasStateSignature(selectOrderedObjects(liveState), EXPORT_WIDTH, EXPORT_HEIGHT);
    let currentSnapshot = snapshotRef.current;
    if (!currentSnapshot || currentSnapshot.signature !== liveSignature) {
      currentSnapshot = await captureSnapshot();
    }
    const stage = canvasRef?.current?.getStage?.() ?? undefined;
    const blob = currentSnapshot
      ? currentSnapshot.blob
      : await captureEditorCanvasBlob(stage, EXPORT_WIDTH, EXPORT_HEIGHT, 'image/png');
    if (!blob) {
      addToast({ type: 'error', message: 'Canvas not found' });
      return;
    }

    const projectName = currentProject?.name || 'thumbnail';
    const downloadName = `${projectName}.png`;
    setExportedBlob(blob);
    setExportedFilename(downloadName);
    setCoverPreviewUrl(URL.createObjectURL(blob));
    setExportComplete(true);
    downloadBlob(blob, downloadName);

    addToast({ type: 'success', message: `Export PNG completato (${EXPORT_WIDTH} × ${EXPORT_HEIGHT}).` });
  }, [addToast, captureSnapshot, canvasRef, currentProject]);

  const handleDownloadAllLanguages = useCallback(async () => {
    const variants = Object.values(variantPreviewsRef.current);
    if (variants.length === 0) {
      addToast({ type: 'warning', message: 'Genera prima le anteprime per lingua.' });
      return;
    }
    const projectName = currentProject?.name || 'thumbnail';
    try {
      for (const variant of variants) {
        const blob = await convertToPng(variant.blob);
        downloadBlob(blob, `${projectName}_${variant.language}.png`);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
      }
      addToast({ type: 'success', message: `${variants.length} varianti esportate in PNG.` });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Export multilingua non riuscito.' });
    }
  }, [addToast, currentProject]);

  return {
    open,
    handleClose,
    hasSelection,
    selectedOnly,
    setSelectedOnly,
    youtubeTitle: metadata.youtubeTitle,
    setYoutubeTitle: metadata.setYoutubeTitle,
    youtubeDescription: metadata.youtubeDescription,
    setYoutubeDescription: metadata.setYoutubeDescription,
    isTranslatingMetadata: metadata.isTranslatingMetadata,
    metadataTranslationError: metadata.metadataTranslationError,
    translatedMetadata: metadata.translatedMetadata,
    translateCompletedMetadata: metadata.translateCompletedMetadata,
    coverPreviewUrl,
    showCoverPreview,
    setShowCoverPreview,
    snapshot,
    snapshotStale,
    canvasSignature,
    variantPreviews,
    isGeneratingPreviews: variants.isGeneratingPreviews,
    allSelectedVariantsReady: variants.allSelectedVariantsReady,
    localizedMetadataByVideo: metadata.localizedMetadataByVideo,
    uploadResults: upload.uploadResults,
    isApplyingToVideos: upload.isApplyingToVideos,
    editingVideoId: variantEdit.editingVideoId,
    setEditingVideoId: variantEdit.setEditingVideoId,
    editingDraft: variantEdit.editingDraft,
    setEditingDraft: variantEdit.setEditingDraft,
    isSavingVariantEdit: variantEdit.isSavingVariantEdit,
    saveVariantEdit: variantEdit.saveVariantEdit,
    privateVideos,
    visiblePrivateVideos,
    latestPrivateVideos,
    sortedVideos,
    selectedVideoIds,
    setSelectedVideoIds,
    selectedVideoCount,
    toggleVideo,
    selectAllVisible,
    deselectAll,
    selectLatest,
    resetSelection,
    loadingPrivateVideos,
    youtubeTargetError,
    youtubeTargetWarnings,
    targetVideos,
    isEditorSession,
    translationLayer,
    isExporting,
    handleExport,
    handleDownloadAllLanguages,
    handleApplyToSelectedVideos: upload.handleApplyToSelectedVideos,
  };
}
