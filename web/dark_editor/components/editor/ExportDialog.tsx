'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSocialDestinations } from '@/hooks/useSocialDestinations';
import { createVeloxProject, createVeloxJob } from '@/lib/api/bff';

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

  const [veloxEnabled, setVeloxEnabled] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const { destinations, loading: loadingDestinations, error: destinationsError } = useSocialDestinations();

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
    externalDestinationId: veloxEnabled ? selectedDestinationId : undefined,
    onSubmitToVelox: useCallback(async (_blob: Blob, filename: string, externalDestinationId: string) => {
      // The only platform-specific value that ever leaves the editor is the
      // opaque external_destination_id. InstaEdit resolves it to the actual
      // account + OAuth token at publish time.
      const project = await createVeloxProject({ name: currentProject?.name || filename });
      const job = await createVeloxJob({
        projectId: project.id,
        renderSpec: {
          source: 'dark_editor_v2',
          filename,
          format,
          quality,
        },
        deliveryPlan: {
          destinations: [
            {
              externalDestinationId,
              metadata: { title: filename },
            },
          ],
        },
      });
      return { jobId: job.id };
    }, [currentProject?.name, format, quality]),
  });

  const selectedDestination = useMemo(
    () => destinations.find(d => d.external_destination_id === selectedDestinationId),
    [destinations, selectedDestinationId]
  );

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  const handleDownloadCopy = useCallback(() => {
    if (exportedBlob) {
      triggerDownload(exportedBlob, exportedFilename);
    }
  }, [exportedBlob, exportedFilename, triggerDownload]);

  const processingLabel = veloxEnabled
    ? 'Queueing to InstaEdit…'
    : drive.isUploadingToDrive
    ? 'Uploading to Drive…'
    : 'Exporting…';
  const exportLabel = veloxEnabled ? 'Queue to InstaEdit' : driveUploadEnabled ? 'Export & Upload' : 'Export';
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
                <span className="text-sm font-medium">Queue to InstaEdit destination</span>
              </div>
              <input
                type="checkbox"
                checked={veloxEnabled}
                onChange={(e) => {
                  setVeloxEnabled(e.target.checked);
                  if (e.target.checked) setDriveUploadEnabled(false);
                }}
                className="h-4 w-4 accent-primary"
                aria-label="Toggle InstaEdit destination"
              />
            </div>

            {veloxEnabled && (
              <div className="mt-3 space-y-2">
                {loadingDestinations ? (
                  <p className="text-xs text-muted-foreground">Loading destinations…</p>
                ) : destinationsError ? (
                  <p className="text-xs text-red-500">{destinationsError}</p>
                ) : destinations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No destinations available.</p>
                ) : (
                  <select
                    value={selectedDestinationId}
                    onChange={(e) => setSelectedDestinationId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a destination…</option>
                    {destinations.map((d) => (
                      <option key={d.external_destination_id} value={d.external_destination_id}>
                        {d.label || d.external_destination_id}
                        {d.provider ? ` (${d.provider})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {selectedDestination && (
                  <p className="text-xs text-muted-foreground">
                    Destination id: <code className="rounded bg-muted px-1">{selectedDestination.external_destination_id}</code>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            Social publishing is intentionally unavailable in Velox Editor. When queued, only the
            opaque destination id is sent to Velox. InstaEdit resolves the account, OAuth token and
            platform at publish time.
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
