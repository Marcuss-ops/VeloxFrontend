'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore, type ImageObject, type TextObject } from '@/stores/editorStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { CheckCircle2, Download, ExternalLink, Loader2, Youtube, AlertCircle, Eye, EyeOff, UploadCloud } from 'lucide-react';
import { translateText } from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import type { GroupVideo } from '@/lib/api/bff/youtubeGroups';
import { useBatchYouTubeTargets } from '@/hooks/useBatchYouTubeTargets';
import { BatchVideoGrid } from '@/components/editor/export/BatchVideoGrid';
import { canvasStateSignature, captureEditorCanvasBlob, sha256Hex } from '@/lib/canvasPreview';
import { requestEditorFlush } from '@/lib/editorEvents';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';

type BatchVideo = GroupVideo;

type LocalizedMetadata = { title: string; description: string };

type CanvasSnapshot = {
  id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  blob: Blob;
  previewUrl: string;
  sha256: string;
  editorSignature: string;
};

type RenderedVariant = {
  variantId: string;
  language: string;
  snapshotId: string;
  previewUrl: string;
  blob: Blob;
  sha256: string;
  title: string;
  description: string;
  translatedText: string;
};

const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function convertToPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Impossibile convertire il file esportato.'));
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_WIDTH;
    canvas.height = EXPORT_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas di esportazione non disponibile.');
    context.drawImage(image, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    const converted = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!converted) throw new Error('Conversione del formato non riuscita.');
    return converted;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function normalizedPlatformAccountId(video: BatchVideo): number | null {
  const value = Number(video.platform_account_id);
  return Number.isFinite(value) && value > 0 ? value : null;
}

interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  canvasRef?: React.RefObject<any>;
}

export default function ExportDialog({ isOpen, onClose, canvasRef }: ExportDialogProps) {
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
  const textLayers = React.useMemo(
    () => objects.filter((object): object is TextObject => object.type === 'text' && Boolean(object.text)),
    [objects],
  );
  const [translationLayerId, setTranslationLayerId] = useState('');
  const translationLayer = textLayers.find((layer) => layer.id === translationLayerId)
    || (selectedObject?.type === 'text' ? selectedObject : undefined)
    || textLayers[0];
  const hasSelection = selectedIds.length > 0;
  const isEditorSession = Boolean(currentProject?.id?.startsWith('ve_'));
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
  const canvasSignature = React.useMemo(
    () => canvasStateSignature(objects, EXPORT_WIDTH, EXPORT_HEIGHT),
    [objects],
  );

  const targetVideos = React.useMemo(() => selectedVideoIds
    .map((videoId) => privateVideos.find((video) => video.video_id === videoId))
    .filter((video): video is BatchVideo => Boolean(video && normalizedPlatformAccountId(video) !== null)), [privateVideos, selectedVideoIds]);

  const localizedMetadataByVideo = React.useMemo(() => {
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

  if (open) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="h-[min(980px,96vh)] w-[min(1500px,94vw)] max-w-none gap-0 overflow-hidden rounded-[22px] border-black/[0.10] bg-[#f7f7f5] p-0 text-[#111111] shadow-[0_32px_100px_rgba(0,0,0,0.22)]">
          <DialogHeader className="flex h-[58px] shrink-0 flex-row items-center border-b border-black/[0.08] bg-white px-5">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#111111]">
              <Download className="h-4 w-4 text-[#111111]" />
              Pubblica copertine
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <section className="publish-scroll w-[42%] min-w-[480px] overflow-y-auto border-r border-black/[0.08]">
              <div className="space-y-6 p-5">
                {hasSelection && (
                  <label className="flex items-center gap-2 text-xs text-[#6e6e73]">
                    <input type="checkbox" checked={selectedOnly} onChange={(event) => setSelectedOnly(event.target.checked)} className="rounded border-black/20 bg-white" />
                    Esporta solo il layer selezionato
                  </label>
                )}

                <div className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm">
                  <button type="button" onClick={() => setShowCoverPreview((visible) => !visible)} className="absolute right-2.5 top-2.5 z-10 rounded-lg bg-white/90 p-1.5 text-[#6e6e73] shadow-sm hover:bg-white hover:text-[#111111]" title={showCoverPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}>
                    {showCoverPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {showCoverPreview && (
                    <div className="flex aspect-video items-center justify-center overflow-hidden bg-[#111111]">
                      {coverPreviewUrl ? <img src={coverPreviewUrl} alt="Anteprima copertina" className="block h-full w-full object-contain" /> : <span className="text-xs text-white/55">Anteprima non disponibile</span>}
                    </div>
                  )}
                  {snapshotStale && <div className="border-t border-[#ead9b3] bg-[#fff9eb] px-3.5 py-2 text-[11px] text-[#8a641d]">Il progetto è cambiato. Rigenerazione automatica in corso…</div>}
                </div>

                <div className="space-y-3 rounded-2xl border border-black/[0.08] bg-white p-3.5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#111111]">Preset YouTube</p>
                      <p className="mt-0.5 text-[10px] text-[#6e6e73]">1920 × 1080 · pronto per le copertine</p>
                    </div>
                    <span className="rounded-md bg-[#f2f2ef] px-2 py-1 text-[10px] font-medium text-[#6e6e73]">16:9</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-[#f7f7f5] px-3 py-2 text-[11px] text-[#6e6e73]">
                    <span>Formato fisso</span>
                    <span className="font-semibold text-[#111111]">PNG · senza perdita</span>
                  </div>
                </div>

                <div className="h-px bg-black/[0.08]" />

                <div className="space-y-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111111]">Titolo, descrizione e tag</h2>
                    <p className="mt-1 text-[11px] text-[#6e6e73]">Puoi modificare i metadati; la privacy resterà privata.</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-[#6e6e73]">Titolo</label>
                    <input value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={100} className="h-10 w-full rounded-lg border border-black/[0.12] bg-white px-3 text-sm text-[#111111] outline-none focus:border-black/40" placeholder="Titolo del video" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-[#6e6e73]">Descrizione</label>
                    <textarea value={youtubeDescription} onChange={(event) => setYoutubeDescription(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={5000} rows={5} className="w-full resize-y rounded-lg border border-black/[0.12] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-black/40" placeholder="Descrizione del video" />
                    <p className="mt-1.5 text-[10px] text-[#9a9a96]">{isTranslatingMetadata ? 'Traduzioni in corso…' : metadataTranslationError || (Object.keys(translatedMetadata).length > 0 ? 'Traduzioni aggiornate.' : 'Le traduzioni partono quando esci dal campo.')}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="min-w-0 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex h-[68px] shrink-0 items-center gap-2 border-b px-5">
                  <Youtube className="h-4 w-4 fill-red-500 text-red-500" />
                  <span className="text-sm font-semibold text-[#111111]">Contesto progetto autorizzato</span>
                  <span className="text-xs text-[#6e6e73]">Target ricevuto da InstaEdit</span>
                </div>
                <div className="flex h-14 shrink-0 items-center justify-between px-5">
                  <h2 className="text-[15px] font-semibold text-[#111111]">{selectedVideoCount} video selezionati</h2>
                  <div className="flex items-center gap-4 text-xs">
                    <button type="button" onClick={selectLatest} disabled={latestPrivateVideos.length === 0} className="font-medium text-[#2f6b3d] hover:text-[#1f4d2a] disabled:cursor-not-allowed disabled:opacity-40">Ultimo per canale ({latestPrivateVideos.length})</button>
                    <button type="button" onClick={selectedVideoCount > 0 ? deselectAll : selectAllVisible} disabled={visiblePrivateVideos.length === 0} className="text-[#6e6e73] hover:text-[#111111] disabled:opacity-40">{selectedVideoCount > 0 ? 'Deseleziona tutti' : 'Seleziona tutti'}</button>
                  </div>
                </div>

                <div className="publish-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                  {isGeneratingPreviews && <div className="mb-4 rounded-[10px] border border-black/[0.08] bg-white px-3 py-2.5 text-[11px] text-[#6e6e73]">Generazione automatica delle copertine localizzate…</div>}
                  {youtubeTargetError && <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#efc7c3] bg-[#fff2f0] px-3 py-2 text-xs text-[#a33a31]"><AlertCircle className="h-4 w-4" />{youtubeTargetError}</div>}
                  {youtubeTargetWarnings.map((warning) => <p key={warning} className="mb-2 text-[10px] text-[#8a641d]">{warning}</p>)}
                  {loadingPrivateVideos ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-[#6e6e73]"><Loader2 className="h-4 w-4 animate-spin" />Caricamento video privati…</div>
                  ) : visiblePrivateVideos.length === 0 ? (
                    <div className="rounded-[10px] border border-black/[0.08] bg-white p-5 text-sm text-[#6e6e73]">Il contesto video autorizzato non è disponibile.</div>
                  ) : (
                    <BatchVideoGrid videos={visiblePrivateVideos} selectedVideoIds={selectedVideoIds} variantPreviews={variantPreviews} localizedMetadata={localizedMetadataByVideo} uploadResults={uploadResults} onToggle={toggleVideo} onEdit={(video) => { const variant = variantPreviews[video.video_id]; if (!variant) return; setEditingVideoId(video.video_id); setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' }); }} />
                  )}

                </div>
              </div>
            </section>
          </div>

          {editingVideoId && editingDraft && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!isSavingVariantEdit) { setEditingVideoId(null); setEditingDraft(null); } }}>
              <div className="max-h-[94vh] w-[min(1280px,96vw)] max-w-6xl overflow-y-auto rounded-2xl border border-black/[0.10] bg-white p-6 text-[#111111] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold text-[#111111]">Modifica variante target</h3><p className="mt-1 text-xs text-[#6e6e73]">{privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || editingVideoId} · lingua {variantPreviews[editingVideoId]?.language || '—'} · render 1920 × 1080</p></div><button type="button" className="text-[#6e6e73] hover:text-[#111111]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>✕</button></div>
                <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#6e6e73]">Anteprima cover tradotta</span><span className="rounded-md border border-black/[0.08] bg-[#f7f7f5] px-2 py-1 text-[10px] text-[#6e6e73]">1920 × 1080 · {variantPreviews[editingVideoId]?.language || '—'}</span></div>
                    <div className="overflow-hidden rounded-xl border border-black/[0.10] bg-[#111111]">
                      {variantPreviews[editingVideoId]?.previewUrl ? <img src={variantPreviews[editingVideoId].previewUrl} alt="Anteprima cover tradotta" className="block aspect-video h-auto w-full object-contain" /> : <div className="flex aspect-video items-center justify-center text-xs text-white/60">Anteprima non disponibile</div>}
                    </div>
                    <p className="text-[11px] text-[#6e6e73]">Testo renderizzato: <span className="text-[#111111]">{variantPreviews[editingVideoId]?.translatedText || '—'}</span></p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3 text-xs text-[#6e6e73]"><p className="font-semibold text-[#111111]">Metadati variante</p><p className="mt-1">Canale: {privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || '—'}</p><p>Lingua: {variantPreviews[editingVideoId]?.language || '—'}</p><p>Privacy: privata</p></div>
                    <label className="block text-xs font-semibold text-[#111111]">Titolo video</label><input value={editingDraft.title} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, title: event.target.value } : draft)} maxLength={100} className="w-full rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                    <label className="block text-xs font-semibold text-[#111111]">Descrizione video</label><textarea value={editingDraft.description} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, description: event.target.value } : draft)} rows={6} maxLength={5000} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                    <label className="block text-xs font-semibold text-[#111111]">Testo della copertina</label><textarea value={editingDraft.coverText} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, coverText: event.target.value } : draft)} rows={4} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2 border-t border-black/[0.08] pt-4"><Button type="button" variant="outline" className="border-black/[0.10] bg-white text-[#111111] hover:bg-[#f2f2ef]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>Annulla</Button><Button type="button" className="bg-[#111111] text-white hover:bg-[#333333]" onClick={() => void saveVariantEdit()} disabled={isSavingVariantEdit || !editingDraft.coverText.trim()}>{isSavingVariantEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rigenerazione…</> : 'Salva modifica'}</Button></div>
              </div>
            </div>
          )}

          <DialogFooter className="h-[70px] shrink-0 items-center justify-end gap-3 border-t border-black/[0.08] bg-white px-5">
            <Button variant="outline" onClick={handleClose} className="h-10 rounded-[10px] border-black/[0.10] bg-white px-4 text-sm text-[#111111] hover:bg-[#f2f2ef]">Annulla</Button>
            <Button type="button" variant="outline" onClick={() => void handleDownloadAllLanguages()} disabled={isGeneratingPreviews || isApplyingToVideos || Object.keys(variantPreviews).length === 0} className="h-10 rounded-[10px] border-black/[0.10] bg-white px-4 text-sm text-[#111111] hover:bg-[#f2f2ef]">
              <Download className="mr-2 h-4 w-4" />Tutte le lingue
            </Button>
            {targetVideos.length > 0 && <Button type="button" onClick={() => void handleApplyToSelectedVideos()} disabled={isApplyingToVideos || isGeneratingPreviews || !allSelectedVariantsReady} className="h-10 rounded-[10px] bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-black">
              {isApplyingToVideos ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio…</> : <><UploadCloud className="mr-2 h-4 w-4" />Invia al video</>}
            </Button>}
            <Button type="button" onClick={() => void handleExport()} disabled={isExporting || isApplyingToVideos || isGeneratingPreviews} className="h-10 rounded-[10px] bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-black">
              <Download className="mr-2 h-4 w-4" />Esporta PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[1500px] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Image
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4 lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.25fr)]">


          <div className="min-w-0 space-y-4">
            {/* Export Selection Option */}
            {hasSelection && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectedOnly"
                  checked={selectedOnly}
                  onChange={(e) => setSelectedOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="selectedOnly" className="text-sm">
                  Export selected layer only
                </label>
              </div>
            )}

            {/* Thumbnail preview */}
            <div className="rounded-2xl border border-slate-700 bg-[#0b0d12] p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-white">Copertina</span>
                <span className="text-xs text-slate-400">Anteprima completa del canvas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-medium text-slate-300">{EXPORT_WIDTH} × {EXPORT_HEIGHT}</span>
                <button type="button" onClick={() => setShowCoverPreview((visible) => !visible)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" title={showCoverPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}>
                  {showCoverPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {showCoverPreview && <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
              {coverPreviewUrl ? <img src={coverPreviewUrl} alt="Anteprima copertina" className="block h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Anteprima non disponibile</div>}
            </div>}
            {snapshot && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
              <span>Snapshot v{snapshot.version}</span><span>Render {snapshot.width} × {snapshot.height}</span><span>File SHA {snapshot.sha256.slice(0, 12)}</span>
              <span className={snapshot.editorSignature === canvasSignature ? 'text-emerald-300' : 'text-amber-300'}>
                Live canvas {snapshot.editorSignature === canvasSignature ? 'sincronizzato' : 'cambiato'}
              </span>
            </div>}
            {snapshotStale && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span>Il progetto è cambiato. Rigenera le anteprime.</span>
              <span className="text-[10px] font-semibold text-amber-200">Rigenerazione automatica in corso…</span>
            </div>}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-700 bg-[#0b0d12] p-4">
            <div>
              <h3 className="text-sm font-bold text-white">Titolo e descrizione</h3>
              <p className="mt-1 text-[11px] text-slate-400">Le traduzioni partono automaticamente quando completi i campi e clicchi fuori.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Titolo YouTube</label>
              <input value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={100} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-400" placeholder="Titolo del video" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Descrizione</label>
              <textarea value={youtubeDescription} onChange={(event) => setYoutubeDescription(event.target.value)} onBlur={() => void translateCompletedMetadata()} maxLength={5000} rows={5} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-400" placeholder="Descrizione del video" />
              <p className="mt-1 text-[11px] text-slate-400">
                {isTranslatingMetadata ? 'Traduzioni in corso dopo la modifica…' : metadataTranslationError ? metadataTranslationError : Object.keys(translatedMetadata).length > 0 ? 'Traduzioni aggiornate.' : 'Completa titolo e descrizione per tradurre.'}
              </p>
            </div>
            </div>
          </div>

          {/* Project-authorized target context */}
          <div className="min-w-0 space-y-3 lg:border-l lg:border-slate-800 lg:pl-5">
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              <span className="text-sm font-bold text-slate-100">Varianti del target autorizzato</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                {isEditorSession && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                    Video corrente del flusso InstaEdit. Gli eventuali video aggiuntivi arrivano solo dal contesto autorizzato del progetto.
                    {privateVideos[0]?.title && <div className="mt-1 font-semibold">{privateVideos[0].title}</div>}
                  </div>
                )}
                <p className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                  Il target arriva dal contesto di progetto autorizzato da InstaEdit. InstaEditor non gestisce gruppi, canali o pubblicazione.
                </p>

                {/* Video Selection List */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex justify-between items-center text-slate-300">
                    <span>{selectedVideoIds.length} video selezionati</span>
                    {privateVideos.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedVideoIds(latestPrivateVideos.map((video) => video.video_id))}
                          className="text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          Ultimo per canale ({latestPrivateVideos.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const eligibleIds = privateVideos
                              .filter((video) => normalizedPlatformAccountId(video) !== null)
                              .map((video) => video.video_id);
                            setSelectedVideoIds(selectedVideoIds.length === eligibleIds.length ? [] : eligibleIds);
                          }}
                          className="text-xs text-primary hover:underline font-normal"
                        >
                          {selectedVideoIds.length > 0 && selectedVideoIds.length === privateVideos.filter((video) => normalizedPlatformAccountId(video) !== null).length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                        </button>
                      </div>
                    )}
                  </label>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-slate-300">
                    {isGeneratingPreviews ? 'Generazione automatica delle copertine localizzate…' : translationLayer ? `Layer tradotto automaticamente: ${translationLayer.name || translationLayer.text?.slice(0, 42)}` : 'Seleziona un layer testuale nel canvas per generare le varianti.'}
                  </div>

                  {loadingPrivateVideos ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading private videos...
                    </div>
                  ) : privateVideos.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-500/10">
                      Il contesto video autorizzato non è disponibile.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 overflow-y-auto rounded-2xl border border-border/80 bg-slate-950/40 p-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px]">
                      {sortedVideos.map((video) => {
                        const isSelected = selectedVideoIds.includes(video.video_id);
                        const result = undefined;
                        const variant = variantPreviews[video.video_id];
                        const hasChannel = normalizedPlatformAccountId(video) !== null;
                        const hasLanguage = Boolean(video.language?.trim());
                        return (
                          <div
                            key={video.video_id}
                            onClick={() => {
                              if (!hasChannel) return;
                              setSelectedVideoIds(prev =>
                                prev.includes(video.video_id)
                                  ? prev.filter(id => id !== video.video_id)
                                  : [...prev, video.video_id]
                              );
                            }}
                            className={`relative flex flex-col rounded-xl overflow-hidden transition-all border group bg-slate-900/50 ${!hasChannel ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-slate-900'} ${
                              isSelected
                                ? 'border-primary shadow-lg ring-1 ring-primary shadow-primary/5'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Selection Check Overlay */}
                            <div className="absolute top-2 left-2 z-20">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-primary border-primary text-white' : 'bg-black/40 border-white/60 text-transparent'
                              }`}>
                                <span className="text-[10px] font-bold">✓</span>
                              </div>
                            </div>

                            {/* Only the final localized cover is shown. It is the
                                same Blob later sent to YouTube. */}
                            <div
                              className="relative aspect-video w-full bg-slate-950 overflow-hidden flex-shrink-0 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!variant) return;
                                setEditingVideoId(video.video_id);
                                setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' });
                              }}
                              title="Clicca per modificare titolo, descrizione e testo della copertina"
                            >
                              {variant ? <img src={variant.previewUrl} alt={`Copertina ${variant.language}`} className="w-full h-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-[10px] text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Generazione anteprima…</div>}

                            </div>

                            {/* Video Title and Channel info */}
                            <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900/30">
                              <h4 className={`text-xs font-bold line-clamp-2 leading-tight ${isSelected ? 'text-primary' : 'text-slate-200'}`}>
                                {video.title}
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-2 truncate" title={video.channel_name || video.channel_title || video.channel_id}>
                                {video.channel_id || video.channel_title ? `Canale: ${video.channel_name || video.channel_title || video.channel_id}` : ''}
                              </p>
                              <p className={`mt-1 text-[10px] font-semibold ${hasLanguage ? 'text-slate-400' : 'text-amber-400'}`}>
                                {hasLanguage ? `Lingua: ${video.language}` : 'Lingua: en (fallback)'}
                              </p>
                              {variant && <>
                                <p className="mt-1 truncate text-[10px] text-slate-500" title={variant.sha256}>Variante: {variant.language} · SHA {variant.sha256.slice(0, 10)}</p>
                                <p className="mt-1 line-clamp-2 text-[10px] text-slate-300" title={variant.translatedText}>Testo: {variant.translatedText || '—'}</p>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setEditingVideoId(video.video_id);
                                    setEditingDraft({ title: variant.title || video.title, description: variant.description || '', coverText: variant.translatedText || '' });
                                  }}
                                  className="mt-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300"
                                >
                                  Modifica variante
                                </button>
                              </>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {editingVideoId && editingDraft && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!isSavingVariantEdit) { setEditingVideoId(null); setEditingDraft(null); } }}>
            <div className="w-full max-w-xl rounded-2xl border border-black/[0.10] bg-white p-5 text-[#111111] shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Modifica variante target</h3>
                  <p className="mt-1 text-xs text-[#6e6e73]">
                    {privateVideos.find((video) => video.video_id === editingVideoId)?.channel_name || editingVideoId} · lingua {variantPreviews[editingVideoId]?.language || '—'} · render 1920 × 1080
                  </p>
                </div>
                <button type="button" className="text-[#6e6e73] hover:text-[#111111]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>✕</button>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#111111]">Titolo video</label>
                <input value={editingDraft.title} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, title: event.target.value } : draft)} maxLength={100} className="w-full rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                <label className="block text-xs font-semibold text-[#111111]">Descrizione video</label>
                <textarea value={editingDraft.description} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, description: event.target.value } : draft)} rows={5} maxLength={5000} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                <label className="block text-xs font-semibold text-[#111111]">Testo della copertina</label>
                <textarea value={editingDraft.coverText} onChange={(event) => setEditingDraft((draft) => draft ? { ...draft, coverText: event.target.value } : draft)} rows={3} className="w-full resize-y rounded-[10px] border border-black/[0.12] bg-[#f7f7f5] px-3 py-2 text-sm text-[#111111] outline-none focus:border-black/40" />
                <p className="text-[11px] text-[#6e6e73]">Salvando viene rigenerato il file 1920 × 1080 di questo solo canale; quel file sarà quello caricato.</p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" className="border-black/[0.10] bg-white text-[#111111] hover:bg-[#f2f2ef]" onClick={() => { setEditingVideoId(null); setEditingDraft(null); }} disabled={isSavingVariantEdit}>Annulla</Button>
                <Button type="button" className="bg-[#111111] text-white hover:bg-[#333333]" onClick={() => void saveVariantEdit()} disabled={isSavingVariantEdit || !editingDraft.coverText.trim()}>
                  {isSavingVariantEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rigenerazione…</> : 'Salva modifica'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Annulla
          </Button>
          <Button
            onClick={() => void handleExport()}
            disabled={isExporting || isGeneratingPreviews}
            className="w-full sm:w-auto"
          >
            {(isExporting || isGeneratingPreviews) ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isGeneratingPreviews ? 'Generazione anteprime…' : 'Exporting...'}</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Export</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
