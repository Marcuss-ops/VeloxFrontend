import { useCallback, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { exportCanvasToBlob } from '@/lib/canvasExport';

export interface UseExportOperationProps {
  format: string;
  quality: number;
  projectName: string;
  uploadToDriveEnabled: boolean;
  handleDriveUpload: (blob: Blob, filename: string) => Promise<{ success: boolean; fileId?: string; fileUrl?: string }>;
  /** Optional opaque InstaEdit destination id. When set, the export flow passes only this id to Velox. */
  externalDestinationId?: string;
  /** Callback invoked when a Velox submission is requested. Returns the created Velox job id. */
  onSubmitToVelox?: (blob: Blob, filename: string, externalDestinationId: string) => Promise<{ jobId: string }>;
  /** Callback invoked when the exported image should be published as a YouTube thumbnail. */
  onPublishThumbnail?: (blob: Blob, filename: string) => Promise<void>;
  /** Canvas ref that exposes getStage() — used by the Konva Stage API export path. */
  canvasRef?: React.RefObject<any>;
}

export interface UseExportOperationReturn {
  isProcessing: boolean;
  exportComplete: boolean;
  exportedBlob: Blob | null;
  exportedFilename: string;
  handleExport: () => Promise<void>;
  /** Direct export: renders the canvas and returns {blob, filename} without
   *  touching React state. Use this when you need the blob synchronously
   *  in the same async flow (e.g. publish) to avoid ref-mirror races. */
  exportCanvas: () => Promise<{ blob: Blob; filename: string } | null>;
  triggerDownload: (blob: Blob, filename: string) => void;
  resetExportState: () => void;
}

export function useExportOperation({
  format,
  quality,
  projectName,
  uploadToDriveEnabled,
  handleDriveUpload,
  externalDestinationId,
  onSubmitToVelox,
  onPublishThumbnail,
  canvasRef,
}: UseExportOperationProps): UseExportOperationReturn {
  const { addToast } = useUIStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFilename, setExportedFilename] = useState('');

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const resetExportState = useCallback(() => {
    setIsProcessing(false);
    setExportComplete(false);
    setExportedBlob(null);
    setExportedFilename('');
  }, []);

  const exportCanvas = useCallback(async (): Promise<{ blob: Blob; filename: string } | null> => {
    const stage = canvasRef?.current?.getStage?.();
    const { canvasWidth, canvasHeight } = useEditorStore.getState();
    const result = await exportCanvasToBlob(format, quality, stage, canvasWidth, canvasHeight);
    if (!result) return null;
    const extension = format === 'jpeg' ? 'jpg' : format;
    const filename = `${projectName || 'image'}.${extension}`;
    return { blob: result.blob, filename };
  }, [canvasRef, format, quality, projectName]);

  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    setExportComplete(false);

    try {
      const exported = await exportCanvas();
      if (!exported) {
        addToast({ type: 'error', message: 'Canvas not found' });
        return;
      }

      const { blob, filename } = exported;
      setExportedBlob(blob);
      setExportedFilename(filename);

      if (externalDestinationId && onSubmitToVelox) {
        const { jobId } = await onSubmitToVelox(blob, filename, externalDestinationId);
        addToast({
          type: 'success',
          message: `Queued as Velox artifact (job ${jobId})`,
        });
        setExportComplete(true);
        return;
      }

      if (onPublishThumbnail) {
        await onPublishThumbnail(blob, filename);
        addToast({ type: 'success', message: 'Thumbnail saved to InstaEdit' });
        setExportComplete(true);
        return;
      }

      if (!uploadToDriveEnabled) {
        triggerDownload(blob, filename);
        addToast({ type: 'success', message: 'Image exported successfully' });
        setExportComplete(true);
        return;
      }

      const upload = await handleDriveUpload(blob, filename);
      if (upload.success) {
        addToast({ type: 'success', message: 'Export and Drive upload complete' });
        setExportComplete(true);
      }
    } catch (error) {
      console.error('Export operation failed:', error);
      addToast({ type: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  }, [
    addToast,
    exportCanvas,
    externalDestinationId,
    onSubmitToVelox,
    onPublishThumbnail,
    uploadToDriveEnabled,
    handleDriveUpload,
    triggerDownload,
  ]);

  return {
    isProcessing,
    exportComplete,
    exportedBlob,
    exportedFilename,
    handleExport,
    exportCanvas,
    triggerDownload,
    resetExportState,
  };
}
