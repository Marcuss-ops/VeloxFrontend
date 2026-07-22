'use client';

import React, { useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { Download } from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { useExportOperation } from '@/hooks/useExportOperation';
import FormatQualitySection from './export/FormatQualitySection';
import CanvasInfoSection from './export/CanvasInfoSection';
import DriveUploadSection from './export/DriveUploadSection';
import ExportFooter from './export/ExportFooter';
import { useExportFormatQuality } from './export/useExportFormatQuality';

interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { showExportDialog, setExportDialog } = useUIStore();
  const { currentProject } = useProjectStore();
  const drive = useDriveIntegration();

  const {
    format,
    setFormat,
    quality,
    setQuality,
    driveUploadEnabled,
    setDriveUploadEnabled,
  } = useExportFormatQuality();

  const {
    isProcessing,
    exportComplete,
    exportedBlob,
    exportedFilename,
    handleExport,
    triggerDownload,
    resetExportState,
  } = useExportOperation({
    format,
    quality,
    projectName: currentProject?.name || 'image',
    uploadToDriveEnabled: driveUploadEnabled,
    handleDriveUpload: drive.handleDriveUpload,
  });

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  const handleDownloadCopy = useCallback(() => {
    if (exportedBlob) {
      triggerDownload(exportedBlob, exportedFilename);
    }
  }, [exportedBlob, exportedFilename, triggerDownload]);

  const processingLabel = drive.isUploadingToDrive ? 'Uploading to Drive…' : 'Exporting…';
  const exportLabel = driveUploadEnabled ? 'Export & Upload' : 'Export';
  const copertineOptions = drive.getCopertineOptions();

  useEffect(() => {
    if (open) {
      resetExportState();
    }
  }, [open, resetExportState]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <FormatQualitySection
            format={format}
            setFormat={setFormat}
            quality={quality}
            setQuality={setQuality}
          />

          <CanvasInfoSection />

          <DriveUploadSection
            enabled={driveUploadEnabled}
            onEnabledChange={setDriveUploadEnabled}
            driveGroups={drive.driveGroups}
            selectedGroup={drive.selectedGroup}
            setSelectedGroup={drive.setSelectedGroup}
            loadingGroups={drive.loadingGroups}
            createProjectFolder={drive.createProjectFolder}
            setCreateProjectFolder={drive.setCreateProjectFolder}
            selectedCopertina={drive.selectedCopertina}
            setSelectedCopertina={drive.setSelectedCopertina}
            loadingCopertine={drive.loadingCopertine}
            driveUploadComplete={drive.driveUploadComplete}
            uploadedFileUrl={drive.uploadedFileUrl}
            copertineOptions={copertineOptions}
            getCopertinaForGroup={drive.getCopertinaForGroup}
          />

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            Social publishing is intentionally unavailable in Velox Editor. Account connections,
            destinations and publishing are managed by InstaEdit after the artifact is rendered.
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <ExportFooter
            onClose={handleClose}
            onExport={handleExport}
            onDownloadCopy={handleDownloadCopy}
            isProcessing={isProcessing}
            exportComplete={exportComplete}
            hasExportedBlob={!!exportedBlob}
            processingLabel={processingLabel}
            exportLabel={exportLabel}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
