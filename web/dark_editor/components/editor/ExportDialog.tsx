'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { Download, FileImage, Loader2, FolderOpen, Youtube, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { getDriveGroups, uploadToDrive, DriveGroup, createDriveFolder, getDriveLinks, DriveLink, getCopertineFolders, uploadImage } from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import { youtubeApi } from '@/lib/youtubeApi';
import { groupsApi } from '@/lib/youtube';
import type { YouTubeGroup, YouTubeVideo } from '@/lib/youtube/types';

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
  const { export: exportImage } = useImageProcessor();
  const { currentProject } = useProjectStore();
  
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [selectedOnly, setSelectedOnly] = useState(false);
  
  // Drive integration state
  const [driveGroups, setDriveGroups] = useState<DriveGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [uploadToDriveEnabled, setUploadToDriveEnabled] = useState(false);
  const [createProjectFolder, setCreateProjectFolder] = useState(true);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadComplete, setDriveUploadComplete] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  // Copertine folders state (for thumbnail exports linked to channels)
  const [copertineFolders, setCopertineFolders] = useState<DriveLink[]>([]);
  const [selectedCopertina, setSelectedCopertina] = useState<string>('');
  const [loadingCopertine, setLoadingCopertine] = useState(false);
  
  // YouTube integration state
  const [youtubeChannels, setYoutubeChannels] = useState<Array<{ id: string; name: string; title?: string; thumbnail?: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [uploadToYouTube, setUploadToYouTube] = useState(false);
  const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);
  const [youtubeUploadComplete, setYoutubeUploadComplete] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>('');
  const [loadingChannels, setLoadingChannels] = useState(false);

  // YouTube Groups & Private Videos State
  const [youtubeGroups, setYoutubeGroups] = useState<YouTubeGroup[]>([]);
  const [selectedYouTubeGroup, setSelectedYouTubeGroup] = useState<string>('');
  const [privateVideos, setPrivateVideos] = useState<YouTubeVideo[]>([]);
  const [loadingPrivateVideos, setLoadingPrivateVideos] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [publishAfterUpload, setPublishAfterUpload] = useState(true);
  const [youtubeUploadResults, setYoutubeUploadResults] = useState<Record<string, { status: 'pending' | 'success' | 'error'; message?: string }>>({});
  
  // Export state
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string>('');

  const open = isOpen ?? showExportDialog;
  const defaultClose = useCallback(() => setExportDialog(false), [setExportDialog]);
  const handleClose = onClose ?? defaultClose;

  const selectedObject = objects.find((obj) => selectedIds[0] === obj.id);
  const hasSelection = selectedIds.length > 0;

  const sortedVideos = React.useMemo(() => {
    return [...privateVideos].sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [privateVideos]);

  const loadDriveGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const groups = await getDriveGroups();
      setDriveGroups(groups);
      if (groups.length > 0 && !selectedGroup) {
        setSelectedGroup(groups[0].name);
      }
    } catch (error) {
      console.error('Failed to load Drive groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  }, [selectedGroup]);

  const loadCopertineFolders = useCallback(async () => {
    setLoadingCopertine(true);
    try {
      const folders = await getCopertineFolders();
      setCopertineFolders(folders);
    } catch (error) {
      console.error('Failed to load copertine folders:', error);
    } finally {
      setLoadingCopertine(false);
    }
  }, []);

  const loadYouTubeChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch(`/dark_editor_v2/api/v1/youtube/channels?validate_tokens=false`);
      if (!res.ok) throw new Error('API error');
      const response = await res.json();
      const channels = response.channels || [];
      setYoutubeChannels(channels);
      if (channels.length > 0 && !selectedChannel) {
        setSelectedChannel(channels[0].id);
      }
    } catch (error) {
      console.error('Failed to load YouTube channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  }, [selectedChannel]);

  const loadYouTubeGroupsAndVideos = useCallback(async () => {
    try {
      const groups = await groupsApi.listGroups();
      setYoutubeGroups(groups);
      if (groups.length > 0) {
        // Try to match group from project name (e.g. "Copertina per Gruppo: Amish")
        const matched = groups.find(g => 
          currentProject?.name?.toLowerCase().includes(g.name.toLowerCase())
        );
        const initialGroup = matched ? matched.name : groups[0].name;
        setSelectedYouTubeGroup(initialGroup);
      }
    } catch (error) {
      console.error('Failed to load YouTube groups:', error);
    }
  }, [currentProject?.name]);

  useEffect(() => {
    if (!selectedYouTubeGroup) {
      setPrivateVideos([]);
      return;
    }
    setLoadingPrivateVideos(true);
    groupsApi.getGroupPrivateVideos(selectedYouTubeGroup)
      .then((res) => {
        setPrivateVideos(res?.videos || []);
      })
      .catch((err) => {
        console.error('Failed to load private videos:', err);
        setPrivateVideos([]);
      })
      .finally(() => {
        setLoadingPrivateVideos(false);
      });
  }, [selectedYouTubeGroup]);

  // Load Drive groups, copertine folders, and YouTube channels on mount
  useEffect(() => {
    if (open) {
      loadDriveGroups();
      loadCopertineFolders();
      loadYouTubeChannels();
      loadYouTubeGroupsAndVideos();
      setSelectedVideoIds([]);
      setYoutubeUploadResults({});
      setDriveUploadComplete(false);
      setUploadedFileUrl('');
      setYoutubeUploadComplete(false);
      setYoutubeVideoId('');
      setExportComplete(false);
      setExportedBlob(null);
    }
  }, [open, loadDriveGroups, loadCopertineFolders, loadYouTubeChannels, loadYouTubeGroupsAndVideos]);

  // Get copertina folder for selected group (matches by language/name)
  const getCopertinaForGroup = (groupName: string): DriveLink | undefined => {
    const normalizedName = groupName.toLowerCase();
    return copertineFolders.find(folder => {
      const folderName = folder.name?.toLowerCase() || '';
      const folderLanguage = folder.language?.toLowerCase() || '';
      return folderName === normalizedName || 
             folderLanguage === normalizedName ||
             folderName.includes(normalizedName) ||
             normalizedName.includes(folderName);
    });
  };

  // Get all copertine folders as options for the dropdown
  const getCopertineOptions = (): DriveLink[] => {
    // Return folders under the Copertine parent (parentId === '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ')
    const copertineParentId = '1iifOcR4ZrZAep8y1lT3qc1Ku0Z9XwbaZ';
    return copertineFolders.filter(folder => 
      folder.parentId === copertineParentId || folder.id === copertineParentId
    );
  };

  // Get or create project folder in Drive
  const getOrCreateProjectFolder = async (groupName: string, projectName: string): Promise<string | undefined> => {
    const group = driveGroups.find(g => g.name === groupName);
    if (!group?.folder_id) {
      // Try to create folder with project name at root
      try {
        const folder = await createDriveFolder(projectName);
        return folder.id;
      } catch (error) {
        console.error('Failed to create project folder:', error);
        return undefined;
      }
    }
    
    // Create subfolder with project name under group folder
    try {
      const folder = await createDriveFolder(projectName, group.folder_id);
      return folder.id;
    } catch (error) {
      // Folder might already exist, return group folder
      console.error('Failed to create project subfolder:', error);
      return group.folder_id;
    }
  };

  // Upload to Drive with project folder
  const handleDriveUpload = async (blob: Blob, filename: string): Promise<{ success: boolean; fileId?: string; fileUrl?: string }> => {
    if (!uploadToDriveEnabled || !selectedGroup) {
      return { success: false };
    }
    
    setIsUploadingToDrive(true);
    try {
      // Determine target folder - prefer copertina folder if selected or auto-matched
      let targetFolderId: string | undefined;
      
      // Check if a copertina folder is selected or auto-matched
      const copertinaFolder = selectedCopertina 
        ? copertineFolders.find(f => f.id === selectedCopertina)
        : getCopertinaForGroup(selectedGroup);
      
      if (copertinaFolder) {
        // Use copertina folder for thumbnail exports
        targetFolderId = copertinaFolder.id;
        
        // Optionally create a subfolder with project name inside copertina
        if (createProjectFolder && currentProject?.name) {
          try {
            const subfolder = await createDriveFolder(currentProject.name, copertinaFolder.id);
            targetFolderId = subfolder.id;
          } catch (error) {
            console.error('Failed to create subfolder in copertina:', error);
            // Continue with copertina folder directly
          }
        }
      } else if (createProjectFolder && currentProject?.name) {
        // Fall back to group folder structure
        targetFolderId = await getOrCreateProjectFolder(selectedGroup, currentProject.name);
      } else {
        const group = driveGroups.find(g => g.name === selectedGroup);
        targetFolderId = group?.folder_id;
      }
      
      // Create file from blob
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      
      // Upload to Drive
      const result = await uploadToDrive(file, targetFolderId);
      
      if (result.success) {
        setDriveUploadComplete(true);
        setUploadedFileUrl(result.web_view_link || '');
        addToast({ type: 'success', message: `Uploaded to Drive: ${filename}` });
        return { success: true, fileId: result.file_id, fileUrl: result.web_view_link };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Drive upload failed:', error);
      addToast({ type: 'error', message: `Drive upload failed: ${error?.message || 'Unknown error'}` });
      return { success: false };
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Upload as YouTube thumbnail (requires an existing video ID)
  const handleYouTubeThumbnailUpload = async (blob: Blob, filename: string, videoId?: string): Promise<{ success: boolean; videoId?: string }> => {
    if (!uploadToYouTube || !selectedChannel) {
      return { success: false };
    }
    
    setIsUploadingToYouTube(true);
    try {
      // For thumbnail upload, we need a video ID
      // If videoId is provided, use it; otherwise we can't upload a thumbnail without a video
      if (!videoId) {
        // Thumbnails need to be uploaded to an existing video
        // We'll save the blob and inform the user they need to select a video
        addToast({ 
          type: 'info', 
          message: 'Thumbnail ready. Select a video in YouTube Studio to apply it.' 
        });
        return { success: true };
      }
      
      // Create file from blob
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      
      // Upload thumbnail to YouTube
      // Note: This requires the video to exist first
      const result = await youtubeApi.setThumbnail(videoId, selectedChannel, filename) as { ok?: boolean; error?: string };
      
      if (result?.ok) {
        setYoutubeUploadComplete(true);
        setYoutubeVideoId(videoId);
        addToast({ type: 'success', message: `Thumbnail uploaded to YouTube video` });
        return { success: true, videoId };
      } else {
        throw new Error('Thumbnail upload failed');
      }
    } catch (error: any) {
      console.error('YouTube thumbnail upload failed:', error);
      addToast({ type: 'error', message: `YouTube upload failed: ${error?.message || 'Unknown error'}` });
      return { success: false };
    } finally {
      setIsUploadingToYouTube(false);
    }
  };

  const handleExport = useCallback(async () => {
    const canvasEl = document.querySelector('.canvas-container .konvajs-content canvas') as HTMLCanvasElement | null;
    if (!canvasEl) {
      addToast({ type: 'error', message: 'Canvas not found' });
      return;
    }

    const mime =
      format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const q = Math.max(0.01, Math.min(1, quality / 100));
    const extension = format === 'jpeg' ? 'jpg' : format;
    const projectName = currentProject?.name || 'thumbnail';
    const downloadName = `${projectName}.${extension}`;

    // Create blob from canvas
    const blob = await new Promise<Blob | null>((resolve) => {
      canvasEl.toBlob(
        (b) => resolve(b),
        mime,
        mime === 'image/png' ? undefined : q
      );
    });

    if (!blob) {
      addToast({ type: 'error', message: 'Failed to create image' });
      return;
    }

    // Store exported blob for potential uploads
    setExportedBlob(blob);
    setExportedFilename(downloadName);
    setExportComplete(true);

    // Track upload results
    let driveSuccess = false;
    let youtubeSuccess = false;

    // Upload to Drive if enabled
    if (uploadToDriveEnabled && selectedGroup) {
      const driveResult = await handleDriveUpload(blob, downloadName);
      driveSuccess = driveResult.success;
    }

    // Upload to YouTube if enabled
    if (uploadToYouTube && selectedVideoIds.length > 0) {
      setIsUploadingToYouTube(true);
      try {
        // Step 1: Upload image to server once
        const file = new File([blob], downloadName, { type: blob.type || 'image/png' });
        const uploadRes = await uploadImage(file);
        const serverFilename = uploadRes.filename;

        // Step 2: Loop through selected videos
        const results: typeof youtubeUploadResults = {};
        for (const vidId of selectedVideoIds) {
          const video = privateVideos.find(v => v.video_id === vidId);
          if (!video || !video.channel_id) continue;

          results[vidId] = { status: 'pending' };
          setYoutubeUploadResults({ ...results });

          try {
            // Apply thumbnail
            const resTh = await youtubeApi.setThumbnail(vidId, video.channel_id, serverFilename) as { ok?: boolean; error?: string };
            if (!resTh?.ok) throw new Error(resTh?.error || 'Failed to apply thumbnail');

            // Optionally publish
            if (publishAfterUpload) {
              const resPub = await youtubeApi.updateMetadata(vidId, video.channel_id, { privacy: 'public' }) as { ok?: boolean; error?: string };
              if (!resPub?.ok) throw new Error(resPub?.error || 'Failed to publish video');
            }

            results[vidId] = { status: 'success' };
          } catch (e: any) {
            console.error(`Failed to process video ${vidId}:`, e);
            results[vidId] = { status: 'error', message: e.message || 'Operation failed' };
          }
          setYoutubeUploadResults({ ...results });
        }

        youtubeSuccess = Object.values(results).some(r => r.status === 'success');
        setYoutubeUploadComplete(true);
      } catch (err: any) {
        console.error('YouTube processing failed:', err);
        addToast({ type: 'error', message: `YouTube task failed: ${err.message || err}` });
      } finally {
        setIsUploadingToYouTube(false);
      }
    }

    // Download locally if no uploads or as backup
    if (!uploadToDriveEnabled && !uploadToYouTube) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Image exported successfully' });
    } else if (driveSuccess || youtubeSuccess) {
      addToast({ type: 'success', message: 'Export and upload complete' });
    }
  }, [format, quality, handleClose, addToast, uploadToDriveEnabled, uploadToYouTube, selectedGroup, selectedVideoIds, privateVideos, publishAfterUpload, currentProject, handleDriveUpload]);

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
                Selected: {selectedObject.name || selectedObject.type} ({Math.round(selectedObject.width)} × {Math.round(selectedObject.height)}px)
              </div>
            )}
            {currentProject?.name && (
              <div className="mt-1">
                Project: {currentProject.name}
              </div>
            )}
          </div>

          {/* Drive Integration Section */}
          {!uploadToYouTube && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="uploadToDrive"
                  checked={uploadToDriveEnabled}
                  onChange={(e) => setUploadToDriveEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="uploadToDrive" className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Upload to Google Drive
                </label>
              </div>

              {uploadToDriveEnabled && (
                <div className="pl-6 space-y-3">
                  {/* Group Selection */}
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

                  {/* Create Project Folder */}
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

                  {/* Copertine Folder Selection (linked to channel groups) */}
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

                  {/* Upload Status */}
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
          )}

          {/* YouTube Integration Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="uploadToYouTube"
                checked={uploadToYouTube}
                onChange={(e) => setUploadToYouTube(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="uploadToYouTube" className="text-sm font-medium flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500 animate-pulse" />
                Set as YouTube Thumbnail (Batch Private Videos & Publish)
              </label>
            </div>

            {uploadToYouTube && (
              <div className="pl-6 space-y-4">
                {/* YouTube Group Selection */}
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

                {/* Video Selection List */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex justify-between items-center text-slate-300">
                    <span>Select Private Videos ({selectedVideoIds.length} selected)</span>
                    {privateVideos.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setSelectedVideoIds(selectedVideoIds.length === privateVideos.length ? [] : privateVideos.map(v => v.video_id))}
                        className="text-xs text-primary hover:underline font-normal"
                      >
                        {selectedVideoIds.length === privateVideos.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </label>
                  
                  {loadingPrivateVideos ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading private videos...
                    </div>
                  ) : privateVideos.length === 0 ? (
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
                            onClick={() => {
                              setSelectedVideoIds(prev => 
                                prev.includes(video.video_id) 
                                  ? prev.filter(id => id !== video.video_id) 
                                  : [...prev, video.video_id]
                              );
                            }}
                            className={`relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all border group bg-slate-900/50 hover:bg-slate-900 ${
                              isSelected 
                                ? 'border-primary shadow-lg ring-1 ring-primary shadow-primary/5' 
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Selection Check Overlay */}
                            <div className="absolute top-2 left-2 z-20">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-primary border-primary text-white' : 'bg-black/40 border-white/60 text-transparent'
                              }`}>
                                <span className="text-[10px] font-bold">✓</span>
                              </div>
                            </div>

                            {/* Thumbnail container */}
                            <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex-shrink-0">
                              {video.thumbnail ? (
                                <img src={video.thumbnail} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                                  <Youtube className="w-8 h-8" />
                                </div>
                              )}
                              
                              {/* Result overlay */}
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
                                      <span className="text-[9px] text-green-400 font-bold bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/20">Applied & Published</span>
                                    </div>
                                  )}
                                  {result.status === 'error' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-destructive font-bold text-lg">✗</span>
                                      <span className="text-[9px] text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20" title={result.message}>Failed</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Video Title and Channel info */}
                            <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900/30">
                              <h4 className={`text-xs font-bold line-clamp-2 leading-tight ${isSelected ? 'text-primary' : 'text-slate-200'}`}>
                                {video.title}
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-2 truncate" title={video.channel_title || youtubeChannels.find(c => c.id === video.channel_id)?.name || video.channel_id}>
                                {video.channel_id || video.channel_title ? `Canale: ${video.channel_title || youtubeChannels.find(c => c.id === video.channel_id)?.name || video.channel_id}` : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Publish Toggle */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <input
                    type="checkbox"
                    id="publishAfterUpload"
                    checked={publishAfterUpload}
                    onChange={(e) => setPublishAfterUpload(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="publishAfterUpload" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                    PUBBLICA AUTOMATICAMENTE I VIDEO (imposta a Pubblico)
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {(driveUploadComplete || youtubeUploadComplete) ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
              {exportedBlob && (
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const url = URL.createObjectURL(exportedBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = exportedFilename;
                    link.rel = 'noopener';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                  }}
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
                {(isExporting || isUploadingToDrive || isUploadingToYouTube) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploadingToDrive ? 'Uploading to Drive...' : isUploadingToYouTube ? 'Uploading to YouTube...' : 'Exporting...'}
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
