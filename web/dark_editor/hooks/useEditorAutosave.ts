'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { selectOrderedObjects } from '@/lib/editorSelectors';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { onEditorFlushRequest, onEditorSaveRequest } from '@/lib/editorEvents';
import { uploadImage } from '@/lib/api';
import type { CanvasHandle } from '@/lib/canvasHandle';
import { getEditorSessionByProject, uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';
import { isImageSrcFailed } from '@/lib/imageLoadTracker';
import { isScopedProjectId } from '@/lib/project-scope';
import type { SessionGateState } from '@/hooks/useYouTubeSessionGate';

export interface UseEditorAutosaveInput {
  /** Ref to the Konva stage host (Canvas component forwards getStage()). */
  canvasRef: React.RefObject<CanvasHandle>;
  /** Gate state — saves are blocked while the session is read-only. */
  sessionGate: SessionGateState;
  /** Set by useEditorProjectSession once the project row has been hydrated. */
  hydratedRef: React.MutableRefObject<boolean>;
}

/**
 * Owns the editor's persistence:
 *   - performSave: serializes the live editor state (+ preview capture,
 *     throttled to one upload every 3s unless forcePreview).
 *   - 800ms debounced auto-save that fires whenever the canvas is dirty.
 *   - onEditorFlushRequest / onEditorSaveRequest listeners (export and
 *     keyboard shortcuts) that force a preview refresh before saving.
 *   - beforeunload guard that warns when unsaved changes exist.
 *
 * Saves are gated on the session state: readonly_* sessions never write.
 */
export function useEditorAutosave({ canvasRef, sessionGate, hydratedRef }: UseEditorAutosaveInput) {
  const { currentProject, isDirty, saveProject } = useProjectStore();
  const objects = useEditorStore((state) => state.objects);
  const lastPreviewAtRef = useRef<number>(0);
  const autosaveTimerRef = useRef<number | null>(null);

  const performSave = useCallback(async (opts?: { forcePreview?: boolean }) => {
    if (!hydratedRef.current) return;
    if (!currentProject) return;
    if (sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published' || sessionGate.state === 'readonly_unknown') return;
    if (sessionGate.state !== 'editable_editing' && sessionGate.state !== 'editable_failed') return;
    const latestEditorState = useEditorStore.getState();
    const latestObjects = selectOrderedObjects(latestEditorState);
    const latestCanvasWidth = latestEditorState.canvasWidth;
    const latestCanvasHeight = latestEditorState.canvasHeight;

    let previewFilename: string | undefined;
    const now = Date.now();
    const shouldUpdatePreview = !!opts?.forcePreview || now - lastPreviewAtRef.current > 3000;
    if (shouldUpdatePreview) {
      try {
        const previewFile = await captureEditorCanvasPreviewFile(
          canvasRef.current?.getStage?.() ?? undefined,
          latestCanvasWidth,
          latestCanvasHeight,
        );
        if (previewFile) {
          if (isScopedProjectId(currentProject.id)) {
            // ve_*/vx_* projects are owned by the InstaEdit backend: persist
            // the preview as a DURABLE media asset and attach it to the
            // editor session (thumbnail_media_id) so the Copertine hub can
            // render the latest cover state. The legacy uploadImage endpoint
            // stores only a temp file that the scoped save path never
            // persists — without this, the hub keeps showing the stale
            // source thumbnail (or a blank card).
            //
            // A canvas image that failed to load (deleted/private video,
            // CDN refusal) must never regress an already-persisted preview:
            // skip overwriting the existing thumbnail_media_id while a
            // source is in a failed state. A brand-new cover with no
            // previous preview still attaches, so the card is never left
            // blank — the user's design (on the neutral background) is
            // still meaningful.
            const hasFailedImage = latestObjects.some(
              (obj) => obj.type === 'image' && isImageSrcFailed(obj.src),
            );
            let shouldAttach = true;
            if (hasFailedImage) {
              const session = await getEditorSessionByProject(currentProject.id).catch(() => null);
              shouldAttach = !session?.thumbnail_media_id;
            }
            if (shouldAttach) {
              const mediaId = await uploadMediaAsset(previewFile, `${currentProject.id}_preview.png`);
              await updateEditorSessionThumbnail(currentProject.id, mediaId);
            }
          } else {
            const uploaded = await uploadImage(previewFile);
            previewFilename = uploaded.filename;
          }
          lastPreviewAtRef.current = now;
        }
      } catch (err) {
        console.warn('Preview capture/upload failed', err);
      }
    }

    await saveProject({ objects: latestObjects, canvasWidth: latestCanvasWidth, canvasHeight: latestCanvasHeight }, previewFilename);
  }, [canvasRef, currentProject, hydratedRef, saveProject, sessionGate.state]);

  // Export must not race the debounced autosave. This also refreshes the
  // persisted preview from the same live Konva stage that Export reads.
  useEffect(() => {
    return onEditorFlushRequest(async () => {
      await performSave({ forcePreview: true });
    });
  }, [performSave]);

  // Explicit save requests (e.g. keyboard shortcuts).
  useEffect(() => {
    return onEditorSaveRequest(() => {
      void performSave({ forcePreview: true });
    });
  }, [performSave]);

  // 800ms debounced auto-save for quick changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!currentProject) return;
    if (!isDirty) return;
    if (sessionGate.state === 'readonly_publishing' || sessionGate.state === 'readonly_published' || sessionGate.state === 'readonly_unknown') return;
    if (sessionGate.state !== 'editable_editing' && sessionGate.state !== 'editable_failed') return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void performSave();
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [currentProject, hydratedRef, isDirty, objects, performSave, sessionGate.state]);

  // Warn the operator before closing the tab with unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
