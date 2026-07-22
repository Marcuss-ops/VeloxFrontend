import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { onEditorSaveRequest } from '@/lib/editorEvents';
import { captureEditorCanvasPreviewFile } from '@/lib/canvasPreview';
import { uploadImage } from '@/lib/api';

export function useProjectSave(canvasRef: React.RefObject<any>) {
  const { currentProject, isSaving, isDirty, saveProject, setDirty } = useProjectStore();
  const { objects, canvasWidth, canvasHeight } = useEditorStore();
  const { addToast } = useUIStore();

  const lastPreviewAtRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);

  const performSave = useCallback(
    async (opts?: { forcePreview?: boolean }) => {
      if (!currentProject || isSaving) return;

      let previewFilename: string | undefined;
      const now = Date.now();
      const shouldUpdatePreview = !!opts?.forcePreview || now - lastPreviewAtRef.current > 3000;

      if (shouldUpdatePreview) {
        try {
          const previewFile = await captureEditorCanvasPreviewFile();
          if (previewFile) {
            const uploaded = await uploadImage(previewFile);
            previewFilename = uploaded.filename;
            lastPreviewAtRef.current = now;
          }
        } catch (err) {
          console.warn('Preview capture/upload failed', err);
        }
      }

      await saveProject({ objects, canvasWidth, canvasHeight }, previewFilename);
    },
    [canvasHeight, canvasWidth, currentProject, isSaving, objects, saveProject]
  );

  // Listen for explicit save requests (e.g. keyboard shortcuts).
  useEffect(() => {
    return onEditorSaveRequest(() => {
      void performSave({ forcePreview: true });
    });
  }, [performSave]);

  // 3-second debounced auto-save that generates a preview from the stage.
  useEffect(() => {
    if (!currentProject || !objects.length || !isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      console.log('Auto-saving...');
      console.log('Auto-saving...');

      let previewFilename = '';

      try {
        const stage = canvasRef.current?.getStage();
        if (stage) {
          const dataURL = stage.toDataURL({
            pixelRatio: 0.5,
            mimeType: 'image/jpeg',
            quality: 0.7,
          });

          const res = await fetch(dataURL);
          const blob = await res.blob();
          const file = new File([blob], `preview_${currentProject.id}.jpg`, { type: 'image/jpeg' });

          const { uploadImage: uploadImageFn } = await import('@/lib/api');
          const uploadResult = await uploadImageFn(file);
          previewFilename = uploadResult.filename;
        }
      } catch (e) {
        console.error('Failed to generate preview:', e);
      }

      await saveProject({ objects, canvasWidth, canvasHeight }, previewFilename);
      setDirty(false);
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [objects, currentProject, isDirty, saveProject, setDirty, canvasWidth, canvasHeight, canvasRef]);

  // Fast 800ms auto-save for quick changes.
  useEffect(() => {
    if (!currentProject || !isDirty) return;

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

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [currentProject, isDirty, objects, performSave]);

  // The hook owns save scheduling; consumers rely on the keyboard/event
  // listener registered above. performSave is intentionally private.
}
