'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { convertToPng } from '@/components/editor/export/helpers';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';
import { publishGroupVideoThumbnail } from '@/lib/api/bff/youtubeGroups';
import type { UIState } from '@/stores/uiStore';
import type { BatchVideo, RenderedVariant } from '@/components/editor/export/types';

interface UseExportUploadOptions {
  open: boolean;
  targetVideos: BatchVideo[];
  variantPreviewsRef: MutableRefObject<Record<string, RenderedVariant>>;
  currentProjectId: string | undefined;
  addToast: UIState['addToast'];
  selectedDraftMediaId?: string;
  groupId?: number;
}

export interface UseExportUploadReturn {
  uploadResults: Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>;
  isApplyingToVideos: boolean;
  handleApplyToSelectedVideos: () => Promise<void>;
}

/**
 * useExportUpload — owns the bulk apply of covers to the selected authorized
 * targets. Extracted from useExportDialog.
 */
export function useExportUpload(opts: UseExportUploadOptions): UseExportUploadReturn {
  const { open, targetVideos, variantPreviewsRef, currentProjectId, addToast, selectedDraftMediaId, groupId } = opts;

  const [uploadResults, setUploadResults] = useState<Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>>({});
  const [isApplyingToVideos, setIsApplyingToVideos] = useState(false);

  // Reset results when the dialog (re)opens.
  useEffect(() => {
    if (!open) return;
    setUploadResults({});
  }, [open]);

  const handleApplyToSelectedVideos = useCallback(async () => {
    if (targetVideos.length === 0) {
      addToast({ type: 'warning', message: 'Nessun video autorizzato selezionato.' });
      return;
    }
    const variants = variantPreviewsRef.current;
    if (selectedDraftMediaId && groupId) {
      setIsApplyingToVideos(true);
      setUploadResults(Object.fromEntries(targetVideos.map((video) => [video.video_id, { status: 'pending' as const }])));
      const results = await Promise.all(targetVideos.map(async (video) => {
        try {
          await publishGroupVideoThumbnail(groupId, video, selectedDraftMediaId);
          return { videoId: video.video_id, status: 'success' as const, message: 'Bozza inviata.' };
        } catch (error) {
          return { videoId: video.video_id, status: 'error' as const, message: error instanceof Error ? error.message : 'Invio non riuscito.' };
        }
      }));
      setUploadResults(Object.fromEntries(results.map((result) => [result.videoId, { status: result.status, message: result.message }])));
      const failed = results.filter((result) => result.status === 'error').length;
      addToast({ type: failed === results.length ? 'error' : failed > 0 ? 'warning' : 'success', message: failed > 0 ? `${results.length - failed} copertine inviate, ${failed} con errore.` : `${results.length} copertine applicate.` });
      setIsApplyingToVideos(false);
      return;
    }
    const missing = targetVideos.filter((video) => !variants[video.video_id]);
    if (missing.length > 0) {
      addToast({ type: 'warning', message: 'Attendi la generazione delle varianti per lingua.' });
      return;
    }
    setIsApplyingToVideos(true);
    setUploadResults(Object.fromEntries(targetVideos.map((video) => [video.video_id, { status: 'pending' as const }])));
    const results = await Promise.all(targetVideos.map(async (video) => {
      const variant = variants[video.video_id];
      const projectId = video.velox_project_id || currentProjectId;
      if (!variant || !projectId) {
        return { videoId: video.video_id, status: 'error' as const, message: 'Progetto video non disponibile.' };
      }
      try {
        // InstaEdit accepts PNG/JPG for YouTube thumbnails. Variants are
        // rendered as PNG regardless of the local download format.
        const uploadBlob = await convertToPng(variant.blob);
        const mediaId = await uploadMediaAsset(uploadBlob, `${projectId}_${variant.language}.png`);
        if (groupId) await publishGroupVideoThumbnail(groupId, video, mediaId);
        else await updateEditorSessionThumbnail(projectId, mediaId);
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
  }, [addToast, currentProjectId, groupId, selectedDraftMediaId, targetVideos, variantPreviewsRef]);

  return { uploadResults, isApplyingToVideos, handleApplyToSelectedVideos };
}
