import { useCallback, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { exportCanvasToBlob } from '@/lib/canvasExport';

export interface UseExportOperationProps {
  format: string;
  quality: number;
  projectName: string;
  uploadToDriveEnabled: boolean;
  handleDriveUpload: (blob: Blob, filename: string) => Promise<{ success: boolean; fileId?: string; fileUrl?: string }>;
}

export interface UseExportOperationReturn {
  isProcessing: boolean;
  exportComplete: boolean;
  exportedBlob: Blob | null;
  exportedFilename: string;
  handleExport: () => Promise<void>;
  triggerDownload: (blob: Blob, filename: string) => void;
  resetExportState: () => void;
}

export function useExportOperation({
  format,
  quality,
  projectName,
  uploadToDriveEnabled,
  handleDriveUpload,
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

  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    setExportComplete(false);

    try {
      const result = await exportCanvasToBlob(format, quality);
      if (!result) {
        addToast({ type: 'error', message: 'Canvas not found' });
        return;
      }

      const extension = format === 'jpeg' ? 'jpg' : format;
      const filename = `${projectName || 'image'}.${extension}`;
      setExportedBlob(result.blob);
      setExportedFilename(filename);

      if (!uploadToDriveEnabled) {
        triggerDownload(result.blob, filename);
        addToast({ type: 'success', message: 'Image exported successfully' });
        setExportComplete(true);
        return;
      }

      const upload = await handleDriveUpload(result.blob, filename);
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
    format,
    quality,
    projectName,
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
    triggerDownload,
    resetExportState,
  };
}
