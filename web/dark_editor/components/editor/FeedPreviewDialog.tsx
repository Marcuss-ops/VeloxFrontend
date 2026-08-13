'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Smartphone, Monitor, Eye } from 'lucide-react';
import { useFeedPreviewCapture } from '@/hooks/useFeedPreviewCapture';
import type { CanvasHandle } from '@/lib/canvasHandle';
import { DesktopFeedPreview } from './feedPreview/DesktopFeedPreview';
import { MobileFeedPreview } from './feedPreview/MobileFeedPreview';
import { FeedPreviewSettings } from './feedPreview/FeedPreviewSettings';

interface FeedPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Capture the canonical Konva stage, never the viewport canvas. */
  canvasRef?: React.RefObject<CanvasHandle>;
}

export default function FeedPreviewDialog({ isOpen, onClose, canvasRef }: FeedPreviewDialogProps) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  // Preview metadata is intentionally blank until InstaEdit supplies real project context.
  const [videoTitle, setVideoTitle] = useState('');
  const [channelName, setChannelName] = useState('');
  const [viewCount, setViewCount] = useState('');
  const [publishTime, setPublishTime] = useState('');

  const previewUrl = useFeedPreviewCapture(isOpen, canvasRef);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-900 border border-slate-800 text-white rounded-3xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">YouTube Feed Simulator</DialogTitle>
              <p className="text-xs text-slate-400">Preview how your thumbnail matches YouTube&apos;s context</p>
            </div>
          </div>

          {/* Toggle Devices */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'desktop'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>
        </div>

        {/* Content body split into preview and settings */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left panel: Simulator view */}
          <div className="flex-1 bg-[#0f0f0f] overflow-y-auto p-6 flex items-start justify-center custom-scrollbar">
            {deviceMode === 'desktop' ? (
              <DesktopFeedPreview
                previewUrl={previewUrl}
                videoTitle={videoTitle}
                channelName={channelName}
                viewCount={viewCount}
                publishTime={publishTime}
              />
            ) : (
              <MobileFeedPreview
                previewUrl={previewUrl}
                videoTitle={videoTitle}
                channelName={channelName}
                viewCount={viewCount}
                publishTime={publishTime}
              />
            )}
          </div>

          {/* Right panel: Custom settings */}
          <FeedPreviewSettings
            videoTitle={videoTitle}
            channelName={channelName}
            viewCount={viewCount}
            publishTime={publishTime}
            onVideoTitleChange={setVideoTitle}
            onChannelNameChange={setChannelName}
            onViewCountChange={setViewCount}
            onPublishTimeChange={setPublishTime}
            onClose={onClose}
          />

        </div>

      </DialogContent>
    </Dialog>
  );
}
