'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Download,
  FileImage,
  Loader2,
  FolderOpen,
  Youtube,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { useYouTubeIntegration } from '@/hooks/useYouTubeIntegration';
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
  const { objects, selectedIds, canvasWidth, canvasHeight } = useEditorStore();
  const { currentProject } = useProjectStore();

  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [selectedOnly, setSelectedOnly] = useState(false);

  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string>('');
  const [driveUploadEnabled, setDriveUploadEnabled] = useState(false);
  const [youtubeUploadEnabled, setYoutubeUploadEnabled] = useState(false);

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

  const {
    youtubeChannels,
    selectedChannel,
    setSelectedChannel,
    loadingChannels,
    youtubeGroups,
    selectedYouTubeGroup,
    setSelectedYouTubeGroup,
    loadingPrivateVideos,
    selectedVideoIds,
    setSelectedVideoIds,
    publishAfterUpload,
    setPublishAfterUpload,
    youtubeUploadResults,
    youtubeUploadComplete,
    isUploadingToYouTube,
    sortedVideos,
    refresh: refreshYouTube,
    processYouTubeUpload,
  } = useYouTubeIntegration();

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  const selectedObject = objects.find((obj) => selectedIds[0] === obj.id);
  const hasSelection = selectedIds.length > 0;

  const uploadToDriveEnabled = driveUploadEnabled;
  const uploadToYouTube = youtubeUploadEnabled;

  useEffect(() => {
    if (open) {
      refreshYouTube();
    }
  }, [open, refreshYouTube]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = useCallback(async () => {
    const result = await exportCanvasToBlob(format, quality);
    if (!result) {
      addToast({ type: 'error', message: 'Canvas not found' });
      return;
    }

    const { blob } = result;
    const extension = format === 'jpeg' ? 'jpg' : format;
    const projectName = currentProject?.name || 'thumbnail';
    const downloadName = `${projectName}.${extension}`;

    setExportedBlob(blob);
    setExportedFilename(downloadName);
    setExportComplete(true);

    let driveSuccess = false;
    let youtubeSuccess = false;

    if (uploadToDriveEnabled) {
      const driveResult = await handleDriveUpload(blob, downloadName);
      driveSuccess = driveResult.success;
    }

    if (uploadToYouTube && selectedVideoIds.length > 0) {
      youtubeSuccess = await processYouTubeUpload(blob, downloadName);
    }

    if (!uploadToDriveEnabled && !uploadToYouTube) {
      triggerDownload(blob, downloadName);
      addToast({ type: 'success', message: 'Image exported successfully' });
    } else if (driveSuccess || youtubeSuccess) {
      addToast({ type: 'success', message: 'Export and upload complete' });
    }
  }, [
    addToast,
    currentProject?.name,
    format,
    handleDriveUpload,
    processYouTubeUpload,
    quality,
    selectedVideoIds.length,
    uploadToDriveEnabled,
    uploadToYouTube,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format & Quality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {FORMATS.find((f) => f.value === format)?.description}
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

          {/* Canvas Info */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              <span>
                Canvas: {canvasWidth} × {canvasHeight}px
              </span>
            </div>
            {hasSelection && selectedObject && (
              <div className="mt-1">
                Selected: {selectedObject.name || selectedObject.type} ({Math.round(selectedObject.width)} ×{' '}
                {Math.round(selectedObject.height)}px)
              </div>
            )}
            {currentProject?.name && <div className="mt-1">Project: {currentProject.name}</div>}
          </div>

          {/* Drive Integration Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="uploadToDrive"
                checked={uploadToDriveEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDriveUploadEnabled(checked);
                  if (checked && !selectedGroup && driveGroups[0]) {
                    setSelectedGroup(driveGroups[0].name);
                  }
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor="uploadToDrive" className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Upload to Google Drive
              </label>
            </div>

            {uploadToDriveEnabled && (
              <div className="pl-6 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Group</label>
                  {loadingGroups ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading groups...
                    </div>
                  ) : driveGroups.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <AlertCircle className="w-4 h-4" />
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
                    onChange={(e) => setCreateProjectFolder(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="createProjectFolder" className="text-sm text-muted-foreground">
                    Create folder with project name
                  </label>
                </div>

                {loadingCopertine ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading copertine folders...
                  </div>
                ) : getCopertineOptions().length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Copertina Folder (Thumbnail)</label>
                    <Select value={selectedCopertina} onValueChange={setSelectedCopertina}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select copertina folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {getCopertineOptions().map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            <div className="flex items-center gap-2">
                              <FileImage className="w-4 h-4" />
                              <span>{folder.name}</span>
                              {folder.language && (
                                <span className="text-xs text-muted-foreground">({folder.language})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedGroup && getCopertinaForGroup(selectedGroup) && (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Auto-matched: {getCopertinaForGroup(selectedGroup)?.name}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {driveUploadComplete && uploadedFileUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Uploaded successfully</span>
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* YouTube Integration Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="uploadToYouTube"
                checked={uploadToYouTube}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setYoutubeUploadEnabled(checked);
                  if (checked && !selectedYouTubeGroup && youtubeGroups[0]) {
                    setSelectedYouTubeGroup(youtubeGroups[0].name);
                  }
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor="uploadToYouTube" className="text-sm font-medium flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500 animate-pulse" />
                Set as YouTube Thumbnail (Batch Private Videos & Publish)
              </label>
            </div>

            {uploadToYouTube && (
              <div className="pl-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select YouTube Group</label>
                  <Select value={selectedYouTubeGroup} onValueChange={setSelectedYouTubeGroup}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {youtubeGroups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex justify-between items-center text-slate-300">
                    <span>Select Private Videos ({selectedVideoIds.length} selected)</span>
                    {sortedVideos.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVideoIds(
                            selectedVideoIds.length === sortedVideos.length
                              ? []
                              : sortedVideos.map((v) => v.video_id)
                          )
                        }
                        className="text-xs text-primary hover:underline font-normal"
                      >
                        {selectedVideoIds.length === sortedVideos.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </label>

                  {loadingPrivateVideos ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading private videos...
                    </div>
                  ) : sortedVideos.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-500/10">
                      Non ci sono video privati in questo gruppo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto p-3 bg-slate-950/40 rounded-2xl border border-border/80">
                      {sortedVideos.map((video) => {
                        const isSelected = selectedVideoIds.includes(video.video_id);
                        const result = youtubeUploadResults[video.video_id];
                        return (
                          <div
                            key={video.video_id}
                            onClick={() =>
                              setSelectedVideoIds((prev) =>
                                prev.includes(video.video_id)
                                  ? prev.filter((id) => id !== video.video_id)
                                  : [...prev, video.video_id]
                              )
                            }
                            className={`relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all border group bg-slate-900/50 hover:bg-slate-900 ${
                              isSelected
                                ? 'border-primary shadow-lg ring-1 ring-primary shadow-primary/5'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="absolute top-2 left-2 z-20">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-black/40 border-white/60 text-transparent'
                                }`}
                              >
                                <span className="text-[10px] font-bold">✓</span>
                              </div>
                            </div>

                            <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex-shrink-0">
                              {video.thumbnail ? (
                                <img
                                  src={video.thumbnail}
                                  alt=""
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                                  <Youtube className="w-8 h-8" />
                                </div>
                              )}

                              {result && (
                                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-2 text-center z-10">
                                  {result.status === 'pending' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                      <span className="text-[9px] text-slate-300">Applying...</span>
                                    </div>
                                  )}
                                  {result.status === 'success' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-green-400 font-bold text-lg">✓</span>
                                      <span className="text-[9px] text-green-400 font-bold bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/20">
                                        Applied & Published
                                      </span>
                                    </div>
                                  )}
                                  {result.status === 'error' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-destructive font-bold text-lg">✗</span>
                                      <span className="text-[9px] text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                                        Failed
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900/30">
                              <h4
                                className={`text-xs font-bold line-clamp-2 leading-tight ${
                                  isSelected ? 'text-primary' : 'text-slate-200'
                                }`}
                              >
                                {video.title}
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-2 truncate">
                                {video.channel_title ||
                                  youtubeChannels.find((c) => c.id === video.channel_id)?.name ||
                                  video.channel_id}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <input
                    type="checkbox"
                    id="publishAfterUpload"
                    checked={publishAfterUpload}
                    onChange={(e) => setPublishAfterUpload(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor="publishAfterUpload"
                    className="text-xs text-slate-300 font-bold select-none cursor-pointer"
                  >
                    PUBBLICA AUTOMATICAMENTE I VIDEO (imposta a Pubblico)
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {driveUploadComplete || youtubeUploadComplete ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
              {exportedBlob && (
                <Button
                  variant="secondary"
                  onClick={() => exportedBlob && triggerDownload(exportedBlob, exportedFilename)}
                  className="w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Copy
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || isUploadingToDrive || isUploadingToYouTube}
                className="w-full sm:w-auto"
              >
                {isExporting || isUploadingToDrive || isUploadingToYouTube ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploadingToDrive
                      ? 'Uploading to Drive...'
                      : isUploadingToYouTube
                      ? 'Uploading to YouTube...'
                      : 'Exporting...'}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {uploadToDriveEnabled || uploadToYouTube ? 'Export & Upload' : 'Export'}
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
