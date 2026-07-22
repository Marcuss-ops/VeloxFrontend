'use client';

import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileImage,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { exportCanvasToBlob } from '@/lib/canvasExport';

const FORMATS = [
  { value: 'png', label: 'PNG - Lossless', description: 'Best for graphics with transparency' },
  { value: 'jpeg', label: 'JPEG - Compressed', description: 'Best for photos, smaller file size' },
  { value: 'webp', label: 'WebP - Modern', description: 'Best for web, good compression' },
];

interface ExportDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { showExportDialog, setExportDialog, isExporting, addToast } = useUIStore();
  const { canvasWidth, canvasHeight } = useEditorStore();
  const { currentProject } = useProjectStore();

  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [driveUploadEnabled, setDriveUploadEnabled] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFilename, setExportedFilename] = useState('');

  const {
    driveGroups,
    selectedGroup,
    setSelectedGroup,
    loadingGroups,
    createProjectFolder,
    setCreateProjectFolder,
    selectedCopertina,
    setSelectedCopertina,
    loadingCopertine,
    driveUploadComplete,
    uploadedFileUrl,
    isUploadingToDrive,
    getCopertineOptions,
    getCopertinaForGroup,
    handleDriveUpload,
  } = useDriveIntegration();

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

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

  const handleExport = useCallback(async () => {
    const result = await exportCanvasToBlob(format, quality);
    if (!result) {
      addToast({ type: 'error', message: 'Canvas not found' });
      return;
    }

    const extension = format === 'jpeg' ? 'jpg' : format;
    const filename = `${currentProject?.name || 'image'}.${extension}`;
    setExportedBlob(result.blob);
    setExportedFilename(filename);

    if (!driveUploadEnabled) {
      triggerDownload(result.blob, filename);
      addToast({ type: 'success', message: 'Image exported successfully' });
      return;
    }

    const upload = await handleDriveUpload(result.blob, filename);
    if (upload.success) {
      addToast({ type: 'success', message: 'Export and Drive upload complete' });
    }
  }, [
    addToast,
    currentProject?.name,
    driveUploadEnabled,
    format,
    handleDriveUpload,
    quality,
    triggerDownload,
  ]);

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {FORMATS.find((item) => item.value === format)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quality: {quality}%</label>
              <Slider
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
                min={10}
                max={100}
                step={1}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Canvas: {canvasWidth} × {canvasHeight}px
            </div>
            {currentProject?.name ? <div className="mt-1">Project: {currentProject.name}</div> : null}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="uploadToDrive"
                checked={driveUploadEnabled}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDriveUploadEnabled(checked);
                  if (checked && !selectedGroup && driveGroups[0]) {
                    setSelectedGroup(driveGroups[0].name);
                  }
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor="uploadToDrive" className="flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="h-4 w-4" />
                Upload to Google Drive
              </label>
            </div>

            {driveUploadEnabled ? (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Group</label>
                  {loadingGroups ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading groups…
                    </div>
                  ) : driveGroups.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      No Drive groups found
                    </div>
                  ) : (
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {driveGroups.map((group) => (
                          <SelectItem key={group.name} value={group.name}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createProjectFolder"
                    checked={createProjectFolder}
                    onChange={(event) => setCreateProjectFolder(event.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="createProjectFolder" className="text-sm text-muted-foreground">
                    Create folder with project name
                  </label>
                </div>

                {loadingCopertine ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading cover folders…
                  </div>
                ) : getCopertineOptions().length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Cover folder</label>
                    <Select value={selectedCopertina} onValueChange={setSelectedCopertina}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select cover folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {getCopertineOptions().map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                            {folder.language ? ` (${folder.language})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedGroup && getCopertinaForGroup(selectedGroup) ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Auto-matched: {getCopertinaForGroup(selectedGroup)?.name}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {driveUploadComplete && uploadedFileUrl ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Uploaded successfully
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            Social publishing is intentionally unavailable in Velox Editor. Account connections,
            destinations and publishing are managed by InstaEdit after the artifact is rendered.
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {driveUploadComplete ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
              {exportedBlob ? (
                <Button
                  variant="secondary"
                  onClick={() => triggerDownload(exportedBlob, exportedFilename)}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Copy
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={() => void handleExport()}
                disabled={isExporting || isUploadingToDrive}
                className="w-full sm:w-auto"
              >
                {isExporting || isUploadingToDrive ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingToDrive ? 'Uploading to Drive…' : 'Exporting…'}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {driveUploadEnabled ? 'Export & Upload' : 'Export'}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
