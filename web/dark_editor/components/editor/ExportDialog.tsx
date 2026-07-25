'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { Download, Globe } from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { useExportOperation } from '@/hooks/useExportOperation';
import FormatQualitySection from './export/FormatQualitySection';
import CanvasInfoSection from './export/CanvasInfoSection';
import DriveUploadSection from './export/DriveUploadSection';
import ExportFooter from './export/ExportFooter';
import { useExportFormatQuality } from './export/useExportFormatQuality';
import { uploadMediaAsset, updateEditorSessionThumbnail } from '@/lib/api/bff';

interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { showExportDialog, setExportDialog } = useUIStore();
  const { currentProject } = useProjectStore();
  const params = useParams();
  const projectId = params.id as string;
  const drive = useDriveIntegration();

  const {
    format,
    setFormat,
    quality,
    setQuality,
    driveUploadEnabled,
    setDriveUploadEnabled,
  } = useExportFormatQuality();

  const [thumbnailEnabled, setThumbnailEnabled] = useState(false);

  const handlePublishThumbnail = useCallback(async (blob: Blob, filename: string) => {
    if (!projectId) {
      throw new Error('Project id is missing');
    }
    const assetId = await uploadMediaAsset(blob, filename);
    await updateEditorSessionThumbnail(projectId, assetId);
  }, [projectId]);

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
    onPublishThumbnail: thumbnailEnabled ? handlePublishThumbnail : undefined,
  });

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  const handleDownloadCopy = useCallback(() => {
    if (exportedBlob) {
      triggerDownload(exportedBlob, exportedFilename);
    }
  }, [exportedBlob, exportedFilename, triggerDownload]);

  const processingLabel = thumbnailEnabled
    ? 'Saving thumbnail…'
    : drive.isUploadingToDrive
    ? 'Uploading to Drive…'
    : 'Exporting…';
  const exportLabel = thumbnailEnabled ? 'Save Thumbnail' : driveUploadEnabled ? 'Export & Upload' : 'Export';
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

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Save as YouTube thumbnail</span>
              </div>
              <input
                type="checkbox"
                checked={thumbnailEnabled}
                onChange={(e) => {
                  setThumbnailEnabled(e.target.checked);
                  if (e.target.checked) setDriveUploadEnabled(false);
                }}
                className="h-4 w-4 accent-primary"
                aria-label="Toggle YouTube thumbnail upload"
              />
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            When &quot;Save Thumbnail&quot; is enabled, the exported image is uploaded to
            InstaEdit storage and linked to the current YouTube editor session. You can finalize
            the publish from the InstaEdit workspace.
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
