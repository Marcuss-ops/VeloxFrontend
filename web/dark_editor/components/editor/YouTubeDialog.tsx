'use client';

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { getTempFileUrl } from '@/lib/api';
import { Youtube, Loader2, Link, ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface YouTubeDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function YouTubeDialog({ isOpen, onClose }: YouTubeDialogProps) {
  const { showYouTubeDialog, setYouTubeDialog, isUploading } = useUIStore();
  const { addObject } = useEditorStore();
  const { grabYouTube } = useImageProcessor();

  const [url, setUrl] = useState('');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = isOpen ?? showYouTubeDialog;
  const defaultClose = useCallback(() => setYouTubeDialog(false), [setYouTubeDialog]);
  const handleClose = onClose ?? defaultClose;

  // Extract video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:v=|\/)([0-9A-Za-z_-]{11}).*/,
      /(?:youtu\.be\/)([0-9A-Za-z_-]{11})/,
      /(?:embed\/)([0-9A-Za-z_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    
    const videoId = extractVideoId(value);
    if (videoId) {
      setPreviewVideoId(videoId);
      setPreviewSrc(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    } else {
      setPreviewVideoId(null);
      setPreviewSrc(null);
    }
  };

  const handleGrab = useCallback(async () => {
    if (!url.trim()) return;

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    try {
      const result = await grabYouTube(url);

      // Add thumbnail to canvas
      addObject({
        id: uuidv4(),
        type: 'image',
        name: `YouTube: ${result.video_id}`,
        x: 100,
        y: 100,
        width: 1280,
        height: 720,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        src: getTempFileUrl(result.filename),
      });

      handleClose();
      setUrl('');
      setPreviewVideoId(null);
      setPreviewSrc(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to grab thumbnail');
    }
  }, [url, grabYouTube, addObject, handleClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            YouTube Thumbnail Grabber
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">YouTube URL</label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="pl-10"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Preview */}
          {previewVideoId ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                {previewSrc ? (
                  <Image
                    src={previewSrc}
                    alt="Thumbnail preview"
                    fill
                    sizes="512px"
                    className="object-cover"
                    onError={() => {
                      setPreviewSrc(`https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`);
                    }}
                  />
                ) : null}
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                  Video ID: {previewVideoId}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-muted rounded-md border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Enter a YouTube URL to preview thumbnail</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <p>Grabs the highest quality thumbnail available from the YouTube video.</p>
            <p className="mt-1">Typical resolution: 1280×720 (maxresdefault)</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGrab}
            disabled={isUploading || !previewVideoId}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Grabbing...
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4 mr-2" />
                Grab Thumbnail
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
