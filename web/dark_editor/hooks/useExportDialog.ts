'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore, type ImageObject, type TextObject } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useBatchYouTubeTargets } from '@/hooks/useBatchYouTubeTargets';
import { isScopedProjectId } from '@/lib/project-scope';
import { translateText } from '@/lib/api';
import { canvasStateSignature, captureEditorCanvasBlob, sha256Hex } from '@/lib/canvasPreview';
import { requestEditorFlush } from '@/lib/editorEvents';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import {
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  type BatchVideo,
  type CanvasSnapshot,
  type ExportDialogProps,
  type LocalizedMetadata,
  type RenderedVariant,
} from '@/components/editor/export/types';
import { convertToPng, downloadBlob, normalizedPlatformAccountId } from '@/components/editor/export/helpers';

export interface UseExportDialogReturn {
  // dialog
  open: boolean;
  handleClose: () => void;
  // selection
  hasSelection: boolean;
  selectedOnly: boolean;
  setSelectedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  // metadata
  youtubeTitle: string;
  setYoutubeTitle: React.Dispatch<React.SetStateAction<string>>;
  youtubeDescription: string;
  setYoutubeDescription: React.Dispatch<React.SetStateAction<string>>;
  isTranslatingMetadata: boolean;
  metadataTranslationError: string;
  translatedMetadata: Record<string, LocalizedMetadata>;
  translateCompletedMetadata: () => Promise<void>;
  // cover preview
  coverPreviewUrl: string;
  showCoverPreview: boolean;
  setShowCoverPreview: React.Dispatch<React.SetStateAction<boolean>>;
  snapshot: CanvasSnapshot | null;
  snapshotStale: boolean;
  canvasSignature: string;
  // variants
  variantPreviews: Record<string, RenderedVariant>;
  isGeneratingPreviews: boolean;
  allSelectedVariantsReady: boolean;
  localizedMetadataByVideo: Record<string, { language: string; title: string; description: string }>;
  // uploads
  uploadResults: Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>;
  isApplyingToVideos: boolean;
  // variant editing
  editingVideoId: string | null;
  setEditingVideoId: React.Dispatch<React.SetStateAction<string | null>>;
  editingDraft: { title: string; description: string; coverText: string } | null;
  setEditingDraft: React.Dispatch<React.SetStateAction<{ title: string; description: string; coverText: string } | null>>;
  isSavingVariantEdit: boolean;
  saveVariantEdit: () => Promise<void>;
  // video targets
  privateVideos: BatchVideo[];
  visiblePrivateVideos: BatchVideo[];
  latestPrivateVideos: BatchVideo[];
  sortedVideos: BatchVideo[];
  selectedVideoIds: string[];
  setSelectedVideoIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedVideoCount: number;
  toggleVideo: (video: GroupVideo) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
  selectLatest: () => void;
  resetSelection: () => void;
  loadingPrivateVideos: boolean;
  youtubeTargetError: string | null;
  youtubeTargetWarnings: string[];
  targetVideos: BatchVideo[];
  isEditorSession: boolean;
  translationLayer: TextObject | undefined;
  isExporting: boolean;
  // actions
  handleExport: () => Promise<void>;
  handleDownloadAllLanguages: () => Promise<void>;
  handleApplyToSelectedVideos: () => Promise<void>;
}

/**
 * Owns every piece of the export/publish flow state and logic that used to
 * live inside ExportDialog.tsx (987 LOC):
 *   - canvas snapshot capture + staleness tracking
 *   - YouTube metadata + background translation
 *   - per-language variant generation and per-video assignment
 *   - variant editing and re-render
 *   - bulk apply of covers to the selected authorized targets
 *
 * The component keeps only the JSX; this hook keeps the behavior.
 */
export function useExportDialog({ isOpen, onClose, canvasRef }: ExportDialogProps): UseExportDialogReturn {
  const { showExportDialog, setExportDialog, isExporting, addToast } = useUIStore();
  const { objects, selectedIds, updateObject } = useEditorStore();
  const { currentProject } = useProjectStore();

  const [selectedOnly, setSelectedOnly] = useState(false);

  // The export surface consumes project-authorized target context only.
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [translatedMetadata, setTranslatedMetadata] = useState<Record<string, LocalizedMetadata>>({});
  const [isTranslatingMetadata, setIsTranslatingMetadata] = useState(false);
  const [metadataTranslationError, setMetadataTranslationError] = useState('');
  const metadataTranslationKeyRef = useRef('');
  const metadataTranslationInFlightRef = useRef<string | null>(null);

  // Export state
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string>('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [showCoverPreview, setShowCoverPreview] = useState(true);
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null);
  const snapshotRef = useRef<CanvasSnapshot | null>(null);
  const [snapshotStale, setSnapshotStale] = useState(false);
  const [variantPreviews, setVariantPreviews] = useState<Record<string, RenderedVariant>>({});
  const variantPreviewsRef = useRef<Record<string, RenderedVariant>>({});
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [isApplyingToVideos, setIsApplyingToVideos] = useState(false);
  const [uploadResults, setUploadResults] = useState<Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>>({});
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ title: string; description: string; coverText: string } | null>(null);
  const [isSavingVariantEdit, setIsSavingVariantEdit] = useState(false);
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

  const localizedMetadataByVideo = useMemo(() => {
    const next: Record<string, { language: string; title: string; description: string }> = {};
    for (const video of visiblePrivateVideos) {
      const language = video.language?.trim().toLowerCase() || 'en';
      const localized = translatedMetadata[language];
      next[video.video_id] = {
        language,
        title: localized?.title || (language === 'en' ? youtubeTitle.trim() : video.title),
        description: localized?.description || (language === 'en' ? youtubeDescription.trim() : ''),
      };
    }
    return next;
  }, [translatedMetadata, visiblePrivateVideos, youtubeDescription, youtubeTitle]);

  const allSelectedVariantsReady = targetVideos.length > 0 && targetVideos.every((video) => {
    const variant = variantPreviews[video.video_id];
    return Boolean(variant && variant.snapshotId === snapshot?.id);
  });

  useEffect(() => {
    if (selectedObject?.type === 'text' && selectedObject.text) {
      setTranslationLayerId(selectedObject.id);
      setVariantPreviews({});
    }
  }, [selectedObject?.id, selectedObject?.type === 'text' ? selectedObject.text : undefined]);

  const captureSnapshot = useCallback(async (): Promise<CanvasSnapshot | null> => {
    // Read the store at capture time. Do not rely on the render that created
    // the dialog: a text edit/transform can land between that render and the
    // click on Export.
    const liveState = useEditorStore.getState();
    const liveSignature = canvasStateSignature(liveState.objects, EXPORT_WIDTH, EXPORT_HEIGHT);
    const blob = await captureEditorCanvasBlob(canvasRef?.current?.getStage?.(), EXPORT_WIDTH, EXPORT_HEIGHT, 'image/png');
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

  useEffect(() => {
    const video = privateVideos[0];
    if (!video) return;
    setYoutubeTitle((current) => current || video.title || '');
    setYoutubeDescription((current) => current || video.description || '');
  }, [privateVideos]);

  // Translate only after the operator leaves the title/description fields.
  // This deliberately does not watch the input values, so typing never
  // spends AI attempts. The key also makes the same completed text idempotent.
  const translateCompletedMetadata = useCallback(async () => {
    const title = youtubeTitle.trim();
    const description = youtubeDescription.trim();
    if (!title || !description) return;

    const targetVideos = selectedVideoIds.length > 0
      ? privateVideos.filter((video) => selectedVideoIds.includes(video.video_id))
      : privateVideos.slice(0, 1);
    const languages = [...new Set(targetVideos.map((video) => video.language?.trim().toLowerCase()).filter(Boolean) as string[])].sort();
    if (languages.length === 0) return;

    const key = JSON.stringify({ title, description, languages });
    if (metadataTranslationKeyRef.current === key || metadataTranslationInFlightRef.current === key) return;
    metadataTranslationInFlightRef.current = key;
    setIsTranslatingMetadata(true);
    setMetadataTranslationError('');
    try {
      const next: Record<string, LocalizedMetadata> = {};
      for (const language of languages) {
        if (language === 'en') {
          next[language] = { title, description };
          continue;
        }
        const [translatedTitle, translatedDescription] = await Promise.all([
          translateText({ text: title, target_language: language, kind: 'title' }),
          translateText({ text: description, target_language: language, kind: 'description' }),
        ]);
        next[language] = {
          title: translatedTitle.translated_text || title,
          description: translatedDescription.translated_text || description,
        };
      }
      metadataTranslationKeyRef.current = key;
      setTranslatedMetadata(next);
      setVariantPreviews((current) => {
        const updated = { ...current };
        for (const video of targetVideos) {
          const language = video.language?.trim().toLowerCase() || 'en';
          const localized = next[language];
          if (localized && updated[video.video_id]) {
            updated[video.video_id] = { ...updated[video.video_id], title: localized.title, description: localized.description };
          }
        }
        return updated;
      });
    } catch (error) {
      setMetadataTranslationError(error instanceof Error ? error.message : 'Traduzione non riuscita');
    } finally {
      metadataTranslationInFlightRef.current = null;
      setIsTranslatingMetadata(false);
    }
  }, [privateVideos, selectedVideoIds, targetVideos, youtubeDescription, youtubeTitle]);

  useEffect(() => {
    if (!open || !youtubeTitle.trim() || !youtubeDescription.trim() || targetVideos.length === 0) return;
    const timer = window.setTimeout(() => void translateCompletedMetadata(), 700);
    return () => window.clearTimeout(timer);
  }, [open, targetVideos.length, translateCompletedMetadata, youtubeDescription, youtubeTitle]);

  const generateVariants = useCallback(async () => {
    if (targetVideos.length === 0) {
      addToast({ type: 'error', message: 'Il target video autorizzato non è disponibile.' });
      return;
    }
    setIsGeneratingPreviews(true);
    try {
      const liveState = useEditorStore.getState();
      const liveSignature = canvasStateSignature(liveState.objects, EXPORT_WIDTH, EXPORT_HEIGHT);
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
  }, [addToast, canvasRef, captureSnapshot, snapshotStale, targetVideos, translationLayer, youtubeDescription, youtubeTitle]);

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
  }, [addToast, canvasRef, editingDraft, editingVideoId, translationLayer, variantPreviews]);

  useEffect(() => {
    if (!open || !snapshotRef.current) return;
    const liveState = useEditorStore.getState();
    const liveSignature = canvasStateSignature(liveState.objects, EXPORT_WIDTH, EXPORT_HEIGHT);
    if (snapshotRef.current.signature !== liveSignature) {
      setSnapshotStale(true);
      setVariantPreviews({});
    }
  }, [canvasSignature, open]);

  // As soon as the private-video list and the automatic selection are ready,
  // create the final per-language covers. The operator can still regenerate
  // them manually after changing the selected text layer.
  useEffect(() => {
    if (!open || loadingPrivateVideos || targetVideos.length === 0 || allSelectedVariantsReady || isGeneratingPreviews) return;
    const timer = window.setTimeout(() => void generateVariants(), 250);
    return () => window.clearTimeout(timer);
  }, [allSelectedVariantsReady, generateVariants, isGeneratingPreviews, loadingPrivateVideos, open, targetVideos]);

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
      setUploadResults({});
      setTranslatedMetadata({});
      metadataTranslationKeyRef.current = '';
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
    const liveSignature = canvasStateSignature(liveState.objects, EXPORT_WIDTH, EXPORT_HEIGHT);
    let currentSnapshot = snapshotRef.current;
    if (!currentSnapshot || currentSnapshot.signature !== liveSignature) {
      currentSnapshot = await captureSnapshot();
    }
    const stage = canvasRef?.current?.getStage?.();
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

  const handleApplyToSelectedVideos = useCallback(async () => {
    if (targetVideos.length === 0) {
      addToast({ type: 'warning', message: 'Nessun video autorizzato selezionato.' });
      return;
    }
    const variants = variantPreviewsRef.current;
    const missing = targetVideos.filter((video) => !variants[video.video_id]);
    if (missing.length > 0) {
      addToast({ type: 'warning', message: 'Attendi la generazione delle varianti per lingua.' });
      return;
    }
    setIsApplyingToVideos(true);
    setUploadResults(Object.fromEntries(targetVideos.map((video) => [video.video_id, { status: 'pending' as const }])));
    const results = await Promise.all(targetVideos.map(async (video) => {
      const variant = variants[video.video_id];
      const projectId = video.velox_project_id || currentProject?.id;
      if (!variant || !projectId) {
        return { videoId: video.video_id, status: 'error' as const, message: 'Progetto video non disponibile.' };
      }
      try {
        // InstaEdit accepts PNG/JPG for YouTube thumbnails. Variants are
        // rendered as PNG regardless of the local download format.
        const uploadBlob = await convertToPng(variant.blob);
        const mediaId = await uploadMediaAsset(uploadBlob, `${projectId}_${variant.language}.png`);
        await updateEditorSessionThumbnail(projectId, mediaId);
        return { videoId: video.video_id, status: 'success' as const, message: 'Copertina inviata.' };
      } catch (error) {
        return { videoId: video.video_id, status: 'error' as const, message: error instanceof Error ? error.message : 'Invio non riuscito.' };
      }
    }));
    setUploadResults(Object.fromEntries(results.map((result) => [result.videoId, { status: result.status, message: result.message }])));
    setIsApplyingToVideos(false);
    const failed = results.filter((result) => result.status === 'error').length;
    addToast({
      type: failed === results.length ? 'error' : failed > 0 ? 'warning' : 'success',
      message: failed > 0 ? `${results.length - failed} copertine inviate, ${failed} con errore.` : `${results.length} copertina/e inviata/e al video selezionato.`,
    });
  }, [addToast, currentProject?.id, targetVideos]);

  return {
    open,
    handleClose,
    hasSelection,
    selectedOnly,
    setSelectedOnly,
    youtubeTitle,
    setYoutubeTitle,
    youtubeDescription,
    setYoutubeDescription,
    isTranslatingMetadata,
    metadataTranslationError,
    translatedMetadata,
    translateCompletedMetadata,
    coverPreviewUrl,
    showCoverPreview,
    setShowCoverPreview,
    snapshot,
    snapshotStale,
    canvasSignature,
    variantPreviews,
    isGeneratingPreviews,
    allSelectedVariantsReady,
    localizedMetadataByVideo,
    uploadResults,
    isApplyingToVideos,
    editingVideoId,
    setEditingVideoId,
    editingDraft,
    setEditingDraft,
    isSavingVariantEdit,
    saveVariantEdit,
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
    handleApplyToSelectedVideos,
  };
}
